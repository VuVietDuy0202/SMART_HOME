#  Smart Home - IoT Dashboard

Hệ thống giám sát và điều khiển nhà thông minh sử dụng ESP32, MQTT, Node.js và WebSocket.

## Tính năng

###  Authentication
- ✅ Đăng ký/Đăng nhập với JWT
- ✅ Bảo vệ dashboard với token
- ✅ Đăng xuất và blacklist token

### 📊 Giám sát cảm biến
- 🌡️ Nhiệt độ (DHT22)
- 💧 Độ ẩm (DHT22)
- 💨 Khí gas (MQ2/MQ5)
- ⚠️ Cảnh báo khí gas vượt ngưỡng

### 🎛️ Điều khiển thiết bị
- 💡 Đèn (LED)
- 🌀 Quạt (Relay)
- 🚪 Cửa (Servo/Motor)

### 🔄 Real-time
- WebSocket cập nhật dữ liệu tức thì
- MQTT broker (EMQX Cloud)
- Giao diện responsive, gradient animation

---

## 🛠️ Yêu cầu

### Hardware
- ESP32 (ESP32-S3 DevKit)
- DHT22
- MQ2/MQ5 (Gas sensor)
- Relay module
- LED

### Software
- **Node.js** >= 16.x
- **PlatformIO** (VS Code extension)
- **Git**

---

## 🚀 Cài đặt

### 1️⃣ Clone repository
```bash
git clone <your-repo-url>
cd UTC_Smarthome_WS
```

### 2️⃣ Cài đặt Node.js dependencies
```bash
npm install
```

### 3️⃣ Cấu hình ESP32

**Tạo file `src/credentials.h`:**
```cpp
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

#define MQTT_BROKER "your-broker.emqxsl.com"
#define MQTT_PORT 8883
#define MQTT_USER "your_username"
#define MQTT_PASS "your_password"
```

**Upload code lên ESP32:**
```bash
pio run --target upload
pio device monitor
```

### 4️⃣ Chạy Node.js server
```bash
node server.js
```

Server chạy tại: `http://localhost:3001`

---

## 📂 Cấu trúc thư mục

```
UTC_Smarthome_WS/
├── src/
│   ├── main.cpp          # ESP32 firmware
│   ├── config.h          # MQTT topics
│   └── credentials.h     # WiFi/MQTT credentials (tạo thủ công)
├── web/
│   ├── login.html        # Trang đăng nhập
│   ├── register.html     # Trang đăng ký
│   ├── index.html        # Dashboard
│   ├── style.css         # CSS
│   ├── auth.css          # CSS form đăng nhập
│   └── app.js            # WebSocket client
├── server.js             # Node.js server + API
├── config.js             # Cấu hình MQTT/Server
├── users.json            # Database user (tự động tạo)
├── package.json
└── platformio.ini
```

---

## 🔑 Tài khoản mặc định

```
Email: admin@utc.com
Password: admin123
```

---

## 🌐 API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/register` | Đăng ký tài khoản mới |
| POST | `/api/login` | Đăng nhập, nhận JWT token |
| POST | `/api/logout` | Đăng xuất, blacklist token |
| GET | `/api/verify` | Xác thực token |

---

## 📡 MQTT Topics

### Subscribe (ESP32 nhận lệnh)
- `home/light/cmd` - Điều khiển đèn (ON/OFF)
- `home/fan/cmd` - Điều khiển quạt (ON/OFF)
- `home/door/cmd` - Điều khiển cửa (OPEN/CLOSE)

### Publish (ESP32 gửi dữ liệu)
- `home/temp` - Nhiệt độ (°C)
- `home/humidity` - Độ ẩm (%)
- `home/gas` - Nồng độ khí gas (ppm)

---

## 🧪 Test

### 1. Đăng nhập
<img width="643" height="808" alt="image" src="https://github.com/user-attachments/assets/e5771098-9ada-4048-bf1d-0366f1b1aeed" />

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@utc.com","password":"admin123"}'
```

### 2. Điều khiển đèn (qua MQTT)
<img width="1891" height="777" alt="image" src="https://github.com/user-attachments/assets/f7903555-f70b-4702-92f7-6aad99308178" />

```bash
# Từ Node.js console hoặc MQTT client
mosquitto_pub -h your-broker.emqxsl.com -t home/light/cmd -m "ON"
```

### 3. WebSocket (Browser console)
```javascript
const socket = io();
socket.on('sensor-update', (data) => console.log(data));
```

---

## 🐛 Debug

### ESP32 không kết nối WiFi
- Kiểm tra `credentials.h`
- Xem Serial Monitor: `pio device monitor`

### Server lỗi `EADDRINUSE`
```bash
# Tìm và kill process
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Hoặc đổi port trong config.js
```

### Không nhận dữ liệu sensor
- Kiểm tra ESP32 đã kết nối MQTT chưa (Serial log)
- Test publish thủ công từ MQTT client

---

## 📝 License

MIT License - Tự do sử dụng cho học tập và thương mại.

---

## 👨‍💻 Author

**By Vũ Duy**  
🔗 GitHub: [(https://github.com/VuVietDuy0202)]

---

##  Credits

- **EMQX Cloud** - MQTT Broker
- **Socket.IO** - Real-time WebSocket
- **Express.js** - Node.js framework
- **PlatformIO** - ESP32 development
