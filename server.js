const express = require("express");
const mqtt = require("mqtt");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("./config");

// ============================================
// KHỞI TẠO SERVER
// ============================================
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// ⚠️ QUAN TRỌNG: Thêm 2 dòng này TRƯỚC KHI định nghĩa routes
app.use(express.json()); // ← Parse JSON body
app.use(express.urlencoded({ extended: true })); // ← Parse form data

app.use(express.static(path.join(__dirname, "web")));

console.log("🚀 Khởi động server...");
let tokenBlacklist = new Set();

// ============================================
// ĐỌC/GHI FILE USERS.JSON
// ============================================
const USERS_FILE = path.join(__dirname, "users.json");

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    console.log("⚠️  users.json không tồn tại, tạo user mặc định...");
    const defaultUser = {
      email: "admin@utc.com",
      password: bcrypt.hashSync("admin1234", 10),
      name: "Admin",
    };
    fs.writeFileSync(USERS_FILE, JSON.stringify([defaultUser], null, 2));
    console.log("✅ Đã tạo user mặc định:");
    console.log("   Email: admin@utc.com");
    console.log("   Password: admin1234\n");
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ============================================
// API ĐĂNG XUẤT (MỚI)
// ============================================
app.post("/api/logout", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return res.status(400).json({ error: "No token provided" });
    }

    // Thêm token vào blacklist
    tokenBlacklist.add(token);
    console.log(`🚪 User logged out, token blacklisted`);
    console.log(`📊 Blacklist size: ${tokenBlacklist.size}`);

    res.json({ success: true, message: "Đăng xuất thành công" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: error.message });
  }
});
// ============================================
// API ĐĂNG KÝ
// ============================================
app.post("/api/register", async (req, res) => {
  try {
    console.log("📥 Register request body:", req.body); // Debug log

    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });
    }

    const users = loadUsers();

    if (users.find((u) => u.email === email)) {
      return res.status(400).json({ error: "Email đã tồn tại" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ email, password: hashedPassword, name });
    saveUsers(users);

    console.log(`✅ User registered: ${email}`);
    res.json({ success: true, message: "Đăng ký thành công" });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API ĐĂNG NHẬP
// ============================================
app.post("/api/login", async (req, res) => {
  try {
    console.log("📥 Login request body:", req.body); // Debug log

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Thiếu email hoặc mật khẩu" });
    }

    const users = loadUsers();
    const user = users.find((u) => u.email === email);

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(401).json({ error: "Email hoặc mật khẩu sai" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      console.log(`❌ Invalid password for: ${email}`);
      return res.status(401).json({ error: "Email hoặc mật khẩu sai" });
    }

    const token = jwt.sign(
      { email: user.email, name: user.name },
      config.AUTH.JWT_SECRET,
      { expiresIn: config.AUTH.JWT_EXPIRES_IN }
    );

    console.log(`✅ User logged in: ${email}`);
    res.json({
      success: true,
      token,
      name: user.name,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API XÁC THỰC TOKEN
// ============================================
app.get("/api/verify", (req, res) => {
  const authHeader = req.headers.authorization;
  console.log("🔍 Verify request, Authorization:", authHeader);

  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token" });
  }

  try {
    const decoded = jwt.verify(token, config.AUTH.JWT_SECRET);
    console.log("✅ Token valid:", decoded);
    res.json({ success: true, email: decoded.email });
  } catch (err) {
    console.log("❌ Token invalid:", err.message);
    res.status(401).json({ error: "Invalid token" });
  }
});

// ============================================
// MQTT & WEBSOCKET (giữ nguyên)
// ============================================
const mqttUrl = `mqtts://${config.MQTT.host}:${config.MQTT.port}`;
const client = mqtt.connect(mqttUrl, {
  username: config.MQTT.username,
  password: config.MQTT.password,
  clientId: config.MQTT.clientId,
  protocol: "mqtts",
  keepalive: 60,
  rejectUnauthorized: false,
});

let sensorData = { temp: "--", humidity: "--", gas: "--", lastUpdate: null };
let deviceStatus = { light: "OFF", fan: "OFF", door: "CLOSE" };

client.on("connect", () => {
  console.log("✅ MQTT connected");
  client.subscribe([
    config.TOPICS.TEMP,
    config.TOPICS.HUMIDITY,
    config.TOPICS.GAS,
    config.TOPICS.DOOR_STATUS,
    config.TOPICS.LIGHT_STATUS, // ← THÊM
    config.TOPICS.FAN_STATUS, // ← THÊM
  ]);
});

client.on("message", (topic, message) => {
  const val = message.toString();
  if (topic === config.TOPICS.TEMP) sensorData.temp = val;
  if (topic === config.TOPICS.HUMIDITY) sensorData.humidity = val;
  if (topic === config.TOPICS.GAS) sensorData.gas = val;
  sensorData.lastUpdate = new Date().toISOString();
  io.emit("sensor-update", sensorData);
  if (topic === config.TOPICS.LIGHT_STATUS) {
    deviceStatus.light = val;
    io.emit("device-status", deviceStatus);
  }
  if (topic === config.TOPICS.FAN_STATUS) {
    deviceStatus.fan = val;
    io.emit("device-status", deviceStatus);
  }
  if (topic === config.TOPICS.DOOR_STATUS) {
    deviceStatus.door = val;
    io.emit("device-status", deviceStatus);
  }
});

io.on("connection", (socket) => {
  console.log(`🔌 WebSocket: ${socket.id}`);
  socket.emit("sensor-update", sensorData);
  socket.emit("device-status", deviceStatus);

  socket.on("light-on", () => {
    client.publish(config.TOPICS.LIGHT_CMD, "ON");
    deviceStatus.light = "ON";
    io.emit("device-status", deviceStatus);
  });
  socket.on("light-off", () => {
    client.publish(config.TOPICS.LIGHT_CMD, "OFF");
    deviceStatus.light = "OFF";
    io.emit("device-status", deviceStatus);
  });
  socket.on("fan-on", () => {
    client.publish(config.TOPICS.FAN_CMD, "ON");
    deviceStatus.fan = "ON";
    io.emit("device-status", deviceStatus);
  });
  socket.on("fan-off", () => {
    client.publish(config.TOPICS.FAN_CMD, "OFF");
    deviceStatus.fan = "OFF";
    io.emit("device-status", deviceStatus);
  });
  socket.on("door-open", () => {
    client.publish(config.TOPICS.DOOR_CMD, "OPEN");
    deviceStatus.door = "OPEN";
    io.emit("device-status", deviceStatus);
  });
  socket.on("door-close", () => {
    client.publish(config.TOPICS.DOOR_CMD, "CLOSE");
    deviceStatus.door = "CLOSE";
    io.emit("device-status", deviceStatus);
  });
});

server.listen(config.SERVER.port, config.SERVER.hostname, () => {
  console.log("==================================================");
  console.log(`✅ Server: http://localhost:${config.SERVER.port}`);
  console.log("==================================================\n");
});
