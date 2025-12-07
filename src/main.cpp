#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include <LiquidCrystal_I2C.h>
#include <MFRC522.h>
#include <SPI.h>
#include <DHT.h>

#include "credentials.h"
#include "config.h"

// ================= OBJECTS ================
WiFiClientSecure espClient;
PubSubClient client(espClient);
LiquidCrystal_I2C lcd(0x27, 16, 2);
MFRC522 rfid(SS_PIN, RST_PIN);
Servo doorServo;

// ================= SENSORS =================
#define DHTPIN DHT_PIN
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

#define GAS_SENSOR_PIN MQ2_PIN

bool lightOn = false;            // LED STATE
bool fanState = false;           // FAN STATE
bool autoFanByGas = false;       // MQ2 auto mode

bool doorIsOpen = false;

// Door servo angles
const int DOOR_CLOSED_ANGLE = 0;
const int DOOR_OPEN_ANGLE   = 90;

volatile bool doorButtonPressed = false;

// ================= ISR =================
void IRAM_ATTR doorISR() {
  doorButtonPressed = true;
}

// ================= BEEP =================
void beepBuzzer(int count, int dur) {
  for (int i = 0; i < count; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(dur);
    digitalWrite(BUZZER_PIN, LOW);
    delay(dur);
  }
}

// ================= LCD DISPLAY =================
void showEnvironment(float t, float h, int gas) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("T:");
  lcd.print(t);
  lcd.print(" H:");
  lcd.print(h);

  lcd.setCursor(0, 1);
  lcd.print("Gas:");
  lcd.print(gas);

  Serial.printf("[ENV] T=%.1f  H=%.1f  Gas=%d\n", t, h, gas);
}

// ================= DOOR CONTROL =================
void openDoor() {
  if (!doorIsOpen) {
    doorServo.write(DOOR_OPEN_ANGLE);
    doorIsOpen = true;
    client.publish("home/door/status", "OPEN");
  }
}

void closeDoor() {
  if (doorIsOpen) {
    doorServo.write(DOOR_CLOSED_ANGLE);
    doorIsOpen = false;
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Cua da dong");
    client.publish("home/door/status", "CLOSE");
  }
}

// ================= MQTT CALLBACK =================
void mqttCallback(char *topic, byte *message, unsigned int len) {
  String cmd = "";
  for (int i = 0; i < len; i++) cmd += (char)message[i];
  cmd.trim();
  cmd.toUpperCase();

  Serial.printf("MQTT [%s] → %s\n", topic, cmd.c_str());

  // === DOOR ===
  if (String(topic) == "home/door/cmd") {
    if (cmd == "OPEN") openDoor();
    else if (cmd == "CLOSE") closeDoor();
  }

  // === LIGHT ===
  if (String(topic) == "home/light/cmd") {
    if (cmd == "ON") {
      lightOn = true;
      digitalWrite(LED_PIN, HIGH);
      client.publish("home/light/status", "ON");
    }
    else if (cmd == "OFF") {
      lightOn = false;
      digitalWrite(LED_PIN, LOW);
      client.publish("home/light/status", "OFF");
    }
  }

  // === FAN ===
  if (String(topic) == "home/fan/cmd") {
    if (cmd == "ON") {
      fanState = true;
      autoFanByGas = false;
      digitalWrite(FAN_PIN, HIGH);
      client.publish("home/fan/status", "ON");
      Serial.println("🌬️ FAN ON by MQTT");
    }
    else if (cmd == "OFF") {
      if (!autoFanByGas) {  // không cho tắt nếu đang auto
        fanState = false;
        digitalWrite(FAN_PIN, LOW);
        client.publish("home/fan/status", "OFF");
      }
    }
  }
}

// ================= MQTT CONNECT =================
void connectMQTT() {
  while (!client.connected()) {
    Serial.println("Connecting MQTT...");

    if (client.connect("ESP32_DOOR_SYS", MQTT_USER, MQTT_PASS)) {
      Serial.println("MQTT connected!");
      client.subscribe("home/door/cmd");
      client.subscribe("home/light/cmd");
      client.subscribe("home/fan/cmd");
    } else {
      Serial.print("Failed rc=");
      Serial.println(client.state());
      delay(2000);
    }
  }
}

// ================= NETWORK INIT =================
void initNetwork() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println(" OK");

  espClient.setInsecure();
  client.setServer(MQTT_BROKER, MQTT_PORT);
  client.setCallback(mqttCallback);
}

// ================= FAN UPDATE =================
void updateFan() {
  digitalWrite(FAN_PIN, fanState ? HIGH : LOW);
  client.publish("home/fan/status", fanState ? "ON" : "OFF");
}

// ================= RFID =================
void handleRFID() {
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  beepBuzzer(2, 80);
  openDoor();

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Chao mung tro ve");
  lcd.setCursor(0, 1);
  lcd.print("Cua dang mo...");

  delay(2000);

  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++)
    uid += String(rfid.uid.uidByte[i], HEX);

  client.publish("home/door/rfid", uid.c_str());

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  Serial.println("RFID DETECTED");
}

// ================= SETUP =================
void setup() {
  Serial.begin(9600);

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(DOOR_BUTTON, INPUT_PULLUP);
  pinMode(GAS_SENSOR_PIN, INPUT);
  pinMode(PIR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(SWITCH_PIN, INPUT_PULLUP);
  pinMode(FAN_PIN, OUTPUT);
  pinMode(FAN_SWITCH, INPUT_PULLUP);

  digitalWrite(LED_PIN, LOW);
  digitalWrite(FAN_PIN, LOW);

  attachInterrupt(digitalPinToInterrupt(DOOR_BUTTON), doorISR, FALLING);

  lcd.init();
  lcd.backlight();
  lcd.print("Booting...");
  delay(800);
  lcd.clear();

  dht.begin();
  SPI.begin(18, 19, 23, SS_PIN);
  rfid.PCD_Init();

  doorServo.attach(SERVO_PIN);
  doorServo.write(DOOR_CLOSED_ANGLE);

  initNetwork();
  Serial.println("System Ready");
}

// ================= LOOP =================
void loop() {
  if (!client.connected()) connectMQTT();
  client.loop();

  handleRFID();

  // ================= SENSOR EVERY 2s =================
  static unsigned long lastSensor = 0;
  if (millis() - lastSensor > 2000) {
    lastSensor = millis();

    float t = dht.readTemperature();
    float h = dht.readHumidity();
    int gas = analogRead(GAS_SENSOR_PIN);

    client.publish("home/temp", String(t).c_str());
    client.publish("home/humidity", String(h).c_str());
    client.publish("home/gas", String(gas).c_str());

    if (doorIsOpen) showEnvironment(t, h, gas);

    // ======================================================
    //                MQ2 AUTO FAN LOGIC
    // ======================================================
    if (gas >= 600) {
      autoFanByGas = true;
      fanState = true;
      updateFan();
      digitalWrite(BUZZER_PIN, HIGH);
      Serial.println("🚨 GAS >= 600 → BUZZER + AUTO FAN");
    }
    else if (gas >= 400) {
      autoFanByGas = true;
      fanState = true;
      updateFan();
      digitalWrite(BUZZER_PIN, LOW);
      Serial.println("⚠️ GAS >= 400 → AUTO FAN");
    }
    else if (gas < 350) {
      if (autoFanByGas) {
        autoFanByGas = false;
        digitalWrite(BUZZER_PIN, LOW);
        Serial.println("✅ Gas normal → Exit AUTO FAN MODE");
      }
    }
  }

  // ================= BUTTON CLOSE DOOR =================
  if (doorButtonPressed) {
    doorButtonPressed = false;
    closeDoor();
    beepBuzzer(1, 80);
  }

  // ======================================================
  //                  PIR → AUTO LIGHT ONCE
  // ======================================================
  int pirState = digitalRead(PIR_PIN);
  static bool pirTriggered = false;
  static unsigned long a = 0;

  if (pirState == HIGH && !pirTriggered) {
    pirTriggered = true;
    lightOn = true;
    digitalWrite(LED_PIN, HIGH);
    client.publish("home/light/status", "ON");
    Serial.println("PIR → LED ON");
  }

  if (pirState == LOW) pirTriggered = false;

  // ======================================================
  //         SWITCH → MANUAL LIGHT TOGGLE
  // ======================================================
  static bool lastSwitch = HIGH;
  bool currentSwitch = digitalRead(SWITCH_PIN);

  if (currentSwitch == LOW && lastSwitch == HIGH) {
    lightOn = !lightOn;
    digitalWrite(LED_PIN, lightOn ? HIGH : LOW);
    client.publish("home/light/status", lightOn ? "ON" : "OFF");
    delay(200);
  }

  lastSwitch = currentSwitch;
  
  // ======================================================
  //         FAN SWITCH → MANUAL FAN CONTROL
  // ======================================================
  static bool lastFanSw = HIGH;
  bool nowFanSw = digitalRead(FAN_SWITCH);

  if (nowFanSw == LOW && lastFanSw == HIGH) {

    if (!autoFanByGas) {
      fanState = !fanState;
      updateFan();
      Serial.println("🖐 FAN SWITCH → TOGGLE");
    } else {
      Serial.println("⛔ AUTO FAN ACTIVE → MANUAL DISABLED");
    }

    delay(250);
  }

  lastFanSw = nowFanSw;
}
