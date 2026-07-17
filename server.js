require("dotenv").config();

const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const multer = require("multer");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bhagirathi_academy";
const JWT_SECRET = process.env.JWT_SECRET || "development-only-secret";
const uploadDir = path.join(__dirname, "uploads", "classes");

fs.mkdirSync(uploadDir, { recursive: true });

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true },
    role: { type: String, enum: ["student", "parent", "admin"], required: true },
    linkedStudentId: { type: String },
  },
  { timestamps: true },
);

const classResourceSchema = new mongoose.Schema(
  {
    classNumber: { type: Number, required: true, min: 1, max: 10, unique: true },
    title: { type: String, required: true },
    pdfOriginalName: { type: String },
    pdfFileName: { type: String },
    pdfUrl: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);
const ClassResource = mongoose.model("ClassResource", classResourceSchema);

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

let memoryMongo;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const classNumber = req.params.classNumber;
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "-");
    cb(null, `class-${classNumber}-${Date.now()}-${cleanName}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed."));
    }
    cb(null, true);
  },
  limits: { fileSize: 8 * 1024 * 1024 },
});

function createToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      username: user.username,
      role: user.role,
      fullName: user.fullName,
    },
    JWT_SECRET,
    { expiresIn: "8h" },
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({ message: "Authentication token is required." });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (_error) {
    res.status(401).json({ message: "Invalid or expired token." });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access is required for PDF uploads." });
  }
  next();
}

async function seedDemoUsers() {
  const demoUsers = [
    { username: "BAS-001", password: "password123", fullName: "Demo Student", role: "student" },
    { username: "PARENT-001", password: "password123", fullName: "Demo Parent", role: "parent", linkedStudentId: "BAS-001" },
    { username: "ADMIN-001", password: "password123", fullName: "Demo Administrator", role: "admin" },
  ];

  for (const demo of demoUsers) {
    const existing = await User.findOne({ username: demo.username });
    if (existing) continue;

    const passwordHash = await bcrypt.hash(demo.password, 10);
    await User.create({ ...demo, passwordHash, password: undefined });
  }
}

async function seedClasses() {
  const operations = Array.from({ length: 10 }, (_item, index) => {
    const classNumber = index + 1;
    return {
      updateOne: {
        filter: { classNumber },
        update: { $setOnInsert: { classNumber, title: `Class ${classNumber}` } },
        upsert: true,
      },
    };
  });

  await ClassResource.bulkWrite(operations);
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

app.post("/api/auth/login", asyncHandler(async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ message: "Username, password, and portal role are required." });
  }

  const user = await User.findOne({ username: username.trim(), role });
  if (!user) {
    return res.status(401).json({ message: "Invalid login details for this portal." });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid login details for this portal." });
  }

  res.json({
    token: createToken(user),
    user: {
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      linkedStudentId: user.linkedStudentId,
    },
  });
}));

app.get("/api/classes", asyncHandler(async (_req, res) => {
  const classes = await ClassResource.find().sort({ classNumber: 1 }).lean();
  res.json(classes);
}));

app.post(
  "/api/classes/:classNumber/pdf",
  requireAuth,
  requireAdmin,
  upload.single("pdf"),
  asyncHandler(async (req, res) => {
    const classNumber = Number(req.params.classNumber);

    if (!Number.isInteger(classNumber) || classNumber < 1 || classNumber > 10) {
      return res.status(400).json({ message: "Class number must be between 1 and 10." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "A PDF file is required." });
    }

    const pdfUrl = `/uploads/classes/${req.file.filename}`;
    const updated = await ClassResource.findOneAndUpdate(
      { classNumber },
      {
        classNumber,
        title: `Class ${classNumber}`,
        pdfOriginalName: req.file.originalname,
        pdfFileName: req.file.filename,
        pdfUrl,
        uploadedBy: req.user.id,
      },
      { new: true, upsert: true },
    );

    res.json(updated);
  }),
);

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError || error.message === "Only PDF files are allowed.") {
    return res.status(400).json({ message: error.message });
  }

  console.error(error);
  res.status(500).json({ message: "Server error. Please try again." });
});

async function start() {
  try {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log(`Connected to MongoDB at ${MONGODB_URI}`);
    } catch (error) {
      if (process.env.MONGODB_URI) {
        throw error;
      }

      console.log("Local MongoDB is unavailable. Starting embedded MongoDB for development testing...");
      memoryMongo = await MongoMemoryServer.create();
      await mongoose.connect(memoryMongo.getUri());
      console.log("Connected to embedded MongoDB. Data will reset when the server stops.");
    }

    await seedDemoUsers();
    await seedClasses();

    app.listen(PORT, () => {
      console.log(`Bhagirathi Academy app running at http://localhost:${PORT}`);
      console.log("Demo users: BAS-001 / password123, PARENT-001 / password123, ADMIN-001 / password123");
    });
  } catch (error) {
    console.error("Failed to start server. Check that MongoDB is running or set MONGODB_URI.");
    console.error(error.message);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await mongoose.disconnect();
  if (memoryMongo) await memoryMongo.stop();
  process.exit(0);
});

start();
