const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors({
  origin(origin, callback) {
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "http://localhost:5173");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: "100mb" }));
app.use(cookieParser());

const dataDir = path.join(__dirname, "data");
const savedFile = path.join(dataDir, "saved-geometries.geojson");
const defaultFile = path.join(dataDir, "default-geometries.geojson");
const buildingsFile = path.join(dataDir, "buildings.geojson");
const objectsFile = path.join(dataDir, "objects.geojson");
const roadsFile = path.join(dataDir, "roads.geojson");
const savedLayersFile = path.join(dataDir, "saved-layers.geojson");
const sessions = new Map();

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 8,
    path: "/"
  };
}

function requireAuth(req, res, next) {
  const token = req.cookies.kadastr_session;
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ authenticated: false, message: "Sessiya aktiv deyil" });
  }
  next();
}

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username === "admin" && password === "admin") {
    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, { username: "admin", createdAt: Date.now() });
    res.cookie("kadastr_session", token, cookieOptions());
    return res.json({ authenticated: true, user: { username: "admin", fullName: "Kadastr administratoru" } });
  }
  return res.status(401).json({ authenticated: false, message: "İstifadəçi adı və ya şifrə yanlışdır" });
});

app.post("/api/auth/logout", (req, res) => {
  const token = req.cookies.kadastr_session;
  if (token) sessions.delete(token);
  res.clearCookie("kadastr_session", { path: "/" });
  res.json({ success: true });
});

app.get("/api/auth/me", (req, res) => {
  const token = req.cookies.kadastr_session;
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ authenticated: false });
  }
  res.json({ authenticated: true, user: { username: "admin", fullName: "Kadastr administratoru" } });
});


function readGeoJson(file) {
  if (!fs.existsSync(file)) return { type: "FeatureCollection", features: [] };
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function getDefaultLayers() {
  const buildings = readGeoJson(buildingsFile).features || [];
  const objects = readGeoJson(objectsFile).features || [];
  const roads = readGeoJson(roadsFile).features || [];

  return {
    type: "FeatureCollection",
    features: [...buildings, ...objects, ...roads]
  };
}

app.get("/api/layers", requireAuth, (req, res) => {
  try {
    if (fs.existsSync(savedLayersFile)) {
      return res.json(readGeoJson(savedLayersFile));
    }

    return res.json(getDefaultLayers());
  } catch (error) {
    return res.status(500).json({ message: "Layer məlumatları yüklənmədi" });
  }
});

app.get("/api/layers/:type", requireAuth, (req, res) => {
  try {
    const type = req.params.type;

    if (type === "buildings") return res.json(readGeoJson(buildingsFile));
    if (type === "objects") return res.json(readGeoJson(objectsFile));
    if (type === "roads") return res.json(readGeoJson(roadsFile));

    return res.status(404).json({ message: "Layer tapılmadı" });
  } catch (error) {
    return res.status(500).json({ message: "Layer məlumatları yüklənmədi" });
  }
});

app.post("/api/layers/save", requireAuth, (req, res) => {
  try {
    fs.writeFileSync(savedLayersFile, JSON.stringify(req.body, null, 2), "utf8");
    return res.json({ success: true, message: "Layer məlumatları yadda saxlanıldı" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Layer məlumatları yadda saxlanmadı" });
  }
});


app.get("/api/geometries", requireAuth, (req, res) => {
  try {
    const file = fs.existsSync(savedFile) ? savedFile : defaultFile;
    if (!fs.existsSync(file)) return res.json({ type: "FeatureCollection", features: [] });
    return res.json(JSON.parse(fs.readFileSync(file, "utf8")));
  } catch {
    return res.status(500).json({ message: "Məlumatlar yüklənmədi" });
  }
});

app.post("/api/geometries/save", requireAuth, (req, res) => {
  try {
    fs.writeFileSync(savedFile, JSON.stringify(req.body, null, 2), "utf8");
    return res.json({ success: true, message: "Yadda saxlanıldı" });
  } catch {
    return res.status(500).json({ success: false, message: "Yadda saxlanmadı" });
  }
});

app.get("/health", (req, res) => res.json({ status: "ok", port: PORT }));

const server = http.createServer(app);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`GIS API running on http://localhost:${PORT}`);
});

server.on("error", (error) => {
  console.error("Server error:", error.message);
  process.exit(1);
});

setInterval(() => {}, 1000 * 60 * 60);
