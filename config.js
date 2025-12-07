module.exports = {
  MQTT: {
    host: "ke19046e.ala.asia-southeast1.emqxsl.com",
    port: 8883,
    protocol: "mqtts",
    username: "DUY2",
    password: "DUY",
    clientId: "server_smarthome_" + Math.random().toString(16).substr(2, 8),
  },
  TOPICS: {
    LIGHT_CMD: "home/light/cmd",
    LIGHT_STATUS: "home/light/status", // ← THÊM
    FAN_CMD: "home/fan/cmd",
    FAN_STATUS: "home/fan/status", // ← THÊM
    DOOR_CMD: "home/door/cmd",
    DOOR_STATUS: "home/door/status",
    TEMP: "home/temp",
    HUMIDITY: "home/humidity",
    GAS: "home/gas",
  },
  THRESHOLDS: {
    GAS_WARNING: 300,
    TEMP_HIGH: 35,
    HUMIDITY_HIGH: 80,
  },
  SERVER: {
    port: 3001,
    hostname: "0.0.0.0",
  },
  // ============================================
  // THÊM PHẦN NÀY
  // ============================================
  AUTH: {
    JWT_SECRET: "utc-smarthome-secret-2024",
    JWT_EXPIRES_IN: "7d",
  },
};
module.exports = {
  MQTT: {
    host: "ke19046e.ala.asia-southeast1.emqxsl.com",
    port: 8883,
    protocol: "mqtts",
    username: "DUY2",
    password: "DUY",
    clientId: "server_smarthome_" + Math.random().toString(16).substr(2, 8),
  },
  TOPICS: {
    LIGHT_CMD: "home/light/cmd",
    LIGHT_STATUS: "home/light/status", // ← THÊM
    FAN_CMD: "home/fan/cmd",
    FAN_STATUS: "home/fan/status", // ← THÊM
    DOOR_CMD: "home/door/cmd",
    DOOR_STATUS: "home/door/status",
    TEMP: "home/temp",
    HUMIDITY: "home/humidity",
    GAS: "home/gas",
  },
  THRESHOLDS: {
    GAS_WARNING: 300,
    TEMP_HIGH: 35,
    HUMIDITY_HIGH: 80,
  },
  SERVER: {
    port: 3001,
    hostname: "0.0.0.0",
  },
  // ============================================
  // THÊM PHẦN NÀY
  // ============================================
  AUTH: {
    JWT_SECRET: "utc-smarthome-secret-2024",
    JWT_EXPIRES_IN: "7d",
  },
};
