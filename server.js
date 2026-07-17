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

const dataStoreSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const parentCredentialSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    parentMobile: { type: String, required: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
);

const DataStore = mongoose.model("DataStore", dataStoreSchema);
const ParentCredential = mongoose.model("ParentCredential", parentCredentialSchema);

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
    return res.status(403).json({ message: "Admin access is required." });
  }
  next();
}

const defaultSiteContent = {
  schoolName: "Bhagirathi Academy School",
  location: "Silgadhi, Doti, Nepal",
  heroEyebrow: "Modern education in the heart of Doti",
  heroTitle: "Bhagirathi Academy School",
  heroText:
    "A bilingual, student-focused school website and management portal for academics, attendance, assignments, notices, and parent communication.",
  aboutTitle: "A complete digital home for Bhagirathi Academy",
  introText:
    "Bhagirathi Academy School serves families in Silgadhi, Doti with a practical, values-led education experience from Class 1 to Class 10.",
  visionText: "To prepare disciplined, creative, and confident learners for a brighter future.",
  missionText: "To combine strong academics, moral development, digital learning, and community partnership.",
  principalName: "Hemraj Malasi",
  principalText:
    "Our goal is to build a school culture where every student is seen, supported, and prepared for lifelong learning.",
  addressLine: "Silgadhi, Doti, Sudurpashchim Province, Nepal",
  schoolPhone: "98XXXXXXXX",
  schoolEmail: "bhagratiacademy65@gmail.com",
};

const defaultStudents = [
  ["S-001", 1, 1, "Aarav Malasi", "Hemraj Malasi", "9841000001", "89%", 94, "A+", "Excellent reading progress"],
  ["S-002", 1, 2, "Nisha Saud", "Kamala Saud", "9841000002", "90%", 89, "A", "Strong participation"],
  ["S-003", 2, 1, "Bikash Khadka", "Mohan Khadka", "9841000003", "89%", 86, "A", "Improving in mathematics"],
  ["S-004", 2, 2, "Ritika Bista", "Sita Bista", "9841000004", "90%", 92, "A+", "Very disciplined"],
  ["S-005", 3, 1, "Anmol Rawal", "Gopal Rawal", "9841000005", "89%", 88, "A", "Good homework record"],
  ["S-006", 3, 2, "Pratiksha Joshi", "Maya Joshi", "9841000006", "90%", 95, "A+", "Class topper"],
  ["S-007", 4, 1, "Sujal Nepali", "Ramesh Nepali", "9841000007", "89%", 83, "A", "Needs regular revision"],
  ["S-008", 4, 2, "Asmita Bogati", "Laxmi Bogati", "9841000008", "90%", 90, "A+", "Excellent attendance"],
  ["S-009", 5, 1, "Sagar Singh", "Dhan Singh", "9841000009", "89%", 87, "A", "Active in sports"],
  ["S-010", 5, 2, "Kusum Chand", "Gita Chand", "9841000010", "90%", 93, "A+", "Strong science performance"],
].map(([id, classNumber, rollNumber, name, parentName, parentMobile, attendance, average, grade, remarks]) => ({
  id,
  classNumber,
  rollNumber,
  name,
  parentName,
  parentMobile,
  attendance,
  average,
  grade,
  remarks,
}));

const defaultTeachers = [
  {
    id: "T-001",
    name: "Sushila Joshi",
    subject: "Mathematics",
    phone: "984XXXXXXX",
    img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "T-002",
    name: "Deepak Rawal",
    subject: "Science",
    phone: "985XXXXXXX",
    img: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "T-003",
    name: "Mina Bhandari",
    subject: "English",
    phone: "986XXXXXXX",
    img: "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=700&q=80",
  },
];

const defaultShowcase = [
  {
    id: "A-001",
    name: "Anish Saud",
    type: "Academic Topper",
    detail: "Class 10 board exam distinction holder",
    img: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "A-002",
    name: "Ritika Khadka",
    type: "Sports Star",
    detail: "District-level athletics medal winner",
    img: "https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=700&q=80",
  },
  {
    id: "A-003",
    name: "Bibek Nepali",
    type: "Quiz Champion",
    detail: "Inter-school quiz competition winner",
    img: "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?auto=format&fit=crop&w=700&q=80",
  },
];

const editableDefaults = {
  siteContent: defaultSiteContent,
  students: defaultStudents,
  teachers: defaultTeachers,
  showcase: defaultShowcase,
};

const editableKeys = new Set(Object.keys(editableDefaults));

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "");
}

async function getStoredData(key) {
  const item = await DataStore.findOne({ key }).lean();
  return item ? item.data : editableDefaults[key];
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

async function seedEditableData() {
  for (const [key, data] of Object.entries(editableDefaults)) {
    await DataStore.updateOne({ key }, { $setOnInsert: { key, data } }, { upsert: true });
  }
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

app.get("/api/public/:key", asyncHandler(async (req, res) => {
  const { key } = req.params;

  if (!editableKeys.has(key)) {
    return res.status(404).json({ message: "Unknown public data key." });
  }

  res.json(await getStoredData(key));
}));

app.get("/api/admin/data/:key", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { key } = req.params;

  if (!editableKeys.has(key)) {
    return res.status(404).json({ message: "Unknown admin data key." });
  }

  res.json(await getStoredData(key));
}));

app.put("/api/admin/data/:key", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { key } = req.params;

  if (!editableKeys.has(key)) {
    return res.status(404).json({ message: "Unknown admin data key." });
  }

  await DataStore.findOneAndUpdate(
    { key },
    { key, data: req.body, updatedBy: req.user.id },
    { upsert: true, new: true },
  );

  res.json(req.body);
}));

app.get("/api/admin/parent-credentials/list", requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const credentials = await ParentCredential.find().select("studentId username parentMobile createdAt updatedAt").lean();
  res.json(credentials);
}));

app.post("/api/admin/parent-credentials", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { studentId } = req.body;
  const students = await getStoredData("students");
  const student = students.find((item) => item.id === studentId);

  if (!student) {
    return res.status(404).json({ message: "Student not found." });
  }

  const username = student.name.trim();
  const password = student.parentMobile.trim();
  const passwordHash = await bcrypt.hash(password, 10);

  await ParentCredential.findOneAndUpdate(
    { studentId: student.id },
    {
      studentId: student.id,
      username,
      parentMobile: student.parentMobile,
      passwordHash,
    },
    { upsert: true, new: true },
  );

  res.json({
    studentId: student.id,
    username,
    password,
    parentMobile: student.parentMobile,
  });
}));

app.delete("/api/admin/parent-credentials/:studentId", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  await ParentCredential.deleteOne({ studentId: req.params.studentId });
  res.json({ ok: true });
}));

app.post("/api/parents/login", asyncHandler(async (req, res) => {
  const username = normalizeText(req.body.username);
  const password = String(req.body.password || "").trim();
  const credentials = await ParentCredential.find().lean();
  const students = await getStoredData("students");

  for (const credential of credentials) {
    const student = students.find((item) => item.id === credential.studentId);
    const possibleUsernames = [credential.username, student?.name].filter(Boolean).map(normalizeText);
    const usernameMatches = possibleUsernames.includes(username);
    const passwordMatches =
      (await bcrypt.compare(password, credential.passwordHash)) ||
      normalizeMobile(password) === normalizeMobile(credential.parentMobile);

    if (usernameMatches && passwordMatches && student) {
      const token = jwt.sign(
        {
          role: "parent",
          studentId: student.id,
          username: credential.username,
        },
        JWT_SECRET,
        { expiresIn: "8h" },
      );

      return res.json({ token, student });
    }
  }

  res.status(401).json({ message: "Invalid parent username or password." });
}));

app.get("/api/parents/student", requireAuth, asyncHandler(async (req, res) => {
  if (req.user.role !== "parent") {
    return res.status(403).json({ message: "Parent access is required." });
  }

  const students = await getStoredData("students");
  const student = students.find((item) => item.id === req.user.studentId);

  if (!student) {
    return res.status(404).json({ message: "Linked student record was not found." });
  }

  res.json(student);
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
    await seedEditableData();

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
