require("dotenv").config();

const path = require("path");
const fs = require("fs");
const http = require("http");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const multer = require("multer");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { Server } = require("socket.io");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bhagirathi_academy";
const JWT_SECRET = process.env.JWT_SECRET || "development-only-secret";
const classUploadDir = path.join(__dirname, "uploads", "classes");
const mediaUploadDir = path.join(__dirname, "uploads", "media");
const PLACEHOLDER_IMAGE = "/placeholder.svg";
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

fs.mkdirSync(classUploadDir, { recursive: true });
fs.mkdirSync(mediaUploadDir, { recursive: true });

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

io.on("connection", (socket) => {
  socket.emit("public:connected", { connectedAt: new Date().toISOString() });
});

function emitPublicUpdate(key, data = null) {
  io.emit("public:data-updated", {
    key,
    data,
    updatedAt: new Date().toISOString(),
  });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, classUploadDir),
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

const mediaStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, mediaUploadDir),
  filename: (_req, file, cb) => {
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "-");
    cb(null, `${Date.now()}-${cleanName}`);
  },
});

const mediaUpload = multer({
  storage: mediaStorage,
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only images, MP4/WebM videos, and PDF files are allowed."));
    }

    cb(null, true);
  },
  limits: { fileSize: 80 * 1024 * 1024 },
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
  schoolName: "Shree Bhagrati Academy",
  location: "Silgadhi, Doti, Nepal",
  heroEyebrow: "Modern education in the heart of Doti",
  heroTitle: "Shree Bhagrati Academy",
  heroText:
    "A bilingual, student-focused school website and management portal for academics, attendance, assignments, notices, and parent communication.",
  heroVideoUrl:
    "https://videos.pexels.com/video-files/8938122/8938122-uhd_3840_2160_25fps.mp4\nhttps://videos.pexels.com/video-files/32498241/13857629_2160_3840_60fps.mp4\nhttps://videos.pexels.com/video-files/30686948/13130856_3840_2160_30fps.mp4",
  primaryCtaText: "Explore Academics",
  primaryCtaHref: "#academics",
  secondaryCtaText: "Contact Us",
  secondaryCtaHref: "#contact",
  statStudentsNumber: "450+",
  statTeachersNumber: "32",
  statClassesNumber: "1-10",
  statResourcesNumber: "12",
  aboutTitle: "A complete digital home for Shree Bhagrati Academy",
  introText:
    "Shree Bhagrati Academy serves families in Silgadhi, Doti with a practical, values-led education experience from Class 1 to Class 10.",
  visionText: "To prepare disciplined, creative, and confident learners for a brighter future.",
  missionText: "To combine strong academics, moral development, digital learning, and community partnership.",
  principalName: "Hemraj Malasi",
  principalText:
    "Our goal is to build a school culture where every student is seen, supported, and prepared for lifelong learning.",
  addressLine: "Silgadhi, Doti, Sudurpashchim Province, Nepal",
  schoolPhone: "9865717422",
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
    id: "T-002",
    name: "Khem Phulara",
    designation: "Mathematics Teacher",
    department: "Mathematics",
    subject: "Mathematics",
    phone: "985XXXXXXX",
    email: "math@bhagirathiacademy.edu.np",
    description: "Mathematics faculty member focused on problem solving and fundamentals.",
    photoPath: "/Users/mac/Documents/bhagrati_Academy/math teacher.png",
    img: "/Users/mac/Documents/bhagrati_Academy/math teacher.png",
  },
  {
    id: "T-001",
    name: "Tapendra Bhatta",
    designation: "Science Teacher",
    department: "Science",
    subject: "Science",
    phone: "984XXXXXXX",
    email: "science@bhagirathiacademy.edu.np",
    description: "Science faculty member for practical and theory-based learning.",
    photoPath: "/Users/mac/Documents/bhagrati_Academy/science teacher.png",
    img: "/Users/mac/Documents/bhagrati_Academy/science teacher.png",
  },
  {
    id: "T-003",
    name: "Bhuwan Bhatta",
    designation: "English Teacher",
    department: "English",
    subject: "English Teacher",
    phone: "986XXXXXXX",
    email: "english@bhagirathiacademy.edu.np",
    description: "English faculty member supporting communication, reading, and writing skills.",
    photoPath: "/Users/mac/Documents/bhagrati_Academy/English teacher.png",
    img: "/Users/mac/Documents/bhagrati_Academy/English teacher.png",
  },
  {
    id: "T-004",
    name: "Abhi Malashi",
    designation: "Environment Health & Population Teacher",
    department: "Environment Health & Population",
    subject: "Environment Health and Population",
    phone: "987XXXXXXX",
    email: "ehp@bhagirathiacademy.edu.np",
    description: "Environment Health & Population faculty member.",
    photoPath: "/Users/mac/Documents/bhagrati_Academy/ehp teacher.png",
    img: "/Users/mac/Documents/bhagrati_Academy/ehp teacher.png",
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

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function toPublicPath(filePath) {
  const relative = path.relative(__dirname, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return PLACEHOLDER_IMAGE;
  }

  return `/${relative.split(path.sep).map(encodeURIComponent).join("/")}`;
}

function resolveImagePath(record = {}) {
  const rawValue = record.image || record.photoPath || record.img || "";
  const imagePath = String(rawValue).trim();

  if (!imagePath) return PLACEHOLDER_IMAGE;
  if (isAbsoluteUrl(imagePath)) return imagePath;

  const decodedPath = decodeURIComponent(imagePath);
  const candidatePath = path.isAbsolute(decodedPath)
    ? decodedPath
    : path.join(__dirname, decodedPath.replace(/^\/+/, ""));

  if (fs.existsSync(candidatePath)) {
    return toPublicPath(candidatePath);
  }

  return PLACEHOLDER_IMAGE;
}

function normalizeTeacherRecord(record = {}) {
  const department = String(record.department || record.subject || "").trim();
  const designation = String(record.designation || (department ? `${department} Teacher` : "")).trim();
  const photoPath = String(record.photoPath || record.image || record.img || "").trim();

  return {
    ...record,
    id: String(record.id || "").trim(),
    name: String(record.name || "").trim(),
    designation,
    department,
    subject: String(record.subject || department).trim(),
    phone: String(record.phone || "").trim(),
    email: String(record.email || "").trim(),
    description: String(record.description || "").trim(),
    photoPath,
    img: resolveImagePath({ ...record, photoPath }),
    imageUrl: resolveImagePath({ ...record, photoPath }),
  };
}

function validateTeacherPayload(payload = {}) {
  const errors = {};
  const name = String(payload.name || "").trim();
  const designation = String(payload.designation || "").trim();
  const department = String(payload.department || payload.subject || "").trim();
  const phone = String(payload.phone || "").trim();
  const email = String(payload.email || "").trim();
  const image = String(payload.image || payload.photoPath || payload.img || "").trim();

  if (!name) errors.name = "Teacher name is required.";
  if (!designation) errors.designation = "Designation is required.";
  if (!department) errors.department = "Department is required.";
  if (!phone) errors.phone = "Phone number is required.";
  if (phone && !/^[+\d][\d\s()+-]{6,20}$/.test(phone)) errors.phone = "Enter a valid phone number.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";

  if (image && !isAbsoluteUrl(image)) {
    const decodedPath = decodeURIComponent(image);
    const candidatePath = path.isAbsolute(decodedPath)
      ? decodedPath
      : path.join(__dirname, decodedPath.replace(/^\/+/, ""));
    if (!fs.existsSync(candidatePath)) {
      errors.image = "Image path was not found. A placeholder will be used on the public website.";
    }
  }

  return errors;
}

function sanitizeDataForResponse(key, data) {
  if (key === "teachers" && Array.isArray(data)) {
    return data.map(normalizeTeacherRecord);
  }

  if (key === "showcase" && Array.isArray(data)) {
    return data.map((record) => ({
      ...record,
      img: resolveImagePath(record),
      imageUrl: resolveImagePath(record),
    }));
  }

  return data;
}

async function getStoredData(key) {
  const item = await DataStore.findOne({ key }).lean();
  return sanitizeDataForResponse(key, item ? item.data : editableDefaults[key]);
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

  const teachersStore = await DataStore.findOne({ key: "teachers" }).lean();
  const currentTeachers = Array.isArray(teachersStore?.data) ? teachersStore.data : [];
  const currentNames = currentTeachers.map((teacher) => normalizeText(teacher.name));
  const oldSeedNames = ["sushila joshi", "deepak rawal", "mina bhandari"];
  const hasOldSeedTeachers = oldSeedNames.some((name) => currentNames.includes(name));
  const hasRequestedTeachers = defaultTeachers.every((teacher) => currentNames.includes(normalizeText(teacher.name)));

  if (!hasRequestedTeachers && (hasOldSeedTeachers || currentTeachers.length < defaultTeachers.length)) {
    await DataStore.findOneAndUpdate(
      { key: "teachers" },
      { key: "teachers", data: defaultTeachers },
      { upsert: true },
    );
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

  const dataToSave = key === "teachers" && Array.isArray(req.body)
    ? req.body.map((record) => normalizeTeacherRecord(record))
    : req.body;

  await DataStore.findOneAndUpdate(
    { key },
    { key, data: dataToSave, updatedBy: req.user.id },
    { upsert: true, new: true },
  );

  const responseData = sanitizeDataForResponse(key, dataToSave);
  emitPublicUpdate(key, responseData);
  res.json(responseData);
}));

app.get("/api/teachers", asyncHandler(async (_req, res) => {
  res.json(await getStoredData("teachers"));
}));

app.get("/api/teachers/:id", asyncHandler(async (req, res) => {
  const teachers = await getStoredData("teachers");
  const teacher = teachers.find((item) => item.id === req.params.id);

  if (!teacher) {
    return res.status(404).json({ success: false, message: "Teacher not found." });
  }

  res.json({ success: true, data: teacher });
}));

app.put("/api/teachers/:id", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const teachers = await getStoredData("teachers");
  const teacherIndex = teachers.findIndex((item) => item.id === req.params.id);

  if (teacherIndex === -1) {
    return res.status(404).json({ success: false, message: "Teacher not found." });
  }

  const nextTeacher = normalizeTeacherRecord({
    ...teachers[teacherIndex],
    ...req.body,
    id: req.params.id,
  });
  const validationErrors = validateTeacherPayload(nextTeacher);
  const blockingErrors = Object.fromEntries(
    Object.entries(validationErrors).filter(([key]) => key !== "image"),
  );

  if (Object.keys(blockingErrors).length) {
    return res.status(400).json({
      success: false,
      message: "Please fix the highlighted teacher fields.",
      errors: validationErrors,
    });
  }

  teachers[teacherIndex] = nextTeacher;

  await DataStore.findOneAndUpdate(
    { key: "teachers" },
    { key: "teachers", data: teachers, updatedBy: req.user.id },
    { upsert: true, new: true },
  );

  emitPublicUpdate("teachers", teachers);
  res.json({
    success: true,
    message: "Teacher updated successfully",
    data: nextTeacher,
    warnings: validationErrors.image ? { image: validationErrors.image } : undefined,
  });
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

  emitPublicUpdate("parentCredentials");
  res.json({
    studentId: student.id,
    username,
    password,
    parentMobile: student.parentMobile,
  });
}));

app.delete("/api/admin/parent-credentials/:studentId", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  await ParentCredential.deleteOne({ studentId: req.params.studentId });
  emitPublicUpdate("parentCredentials");
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

    emitPublicUpdate("classes", updated);
    res.json(updated);
  }),
);

app.post(
  "/api/admin/media",
  requireAuth,
  requireAdmin,
  mediaUpload.single("media"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "A media file is required." });
    }

    res.status(201).json({
      originalName: req.file.originalname,
      fileName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/media/${req.file.filename}`,
    });
  }),
);

app.use((error, _req, res, _next) => {
  const validationErrors = [
    "Only PDF files are allowed.",
    "Only images, MP4/WebM videos, and PDF files are allowed.",
  ];

  if (error instanceof multer.MulterError || validationErrors.includes(error.message)) {
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

    server.listen(PORT, () => {
      console.log(`Shree Bhagrati Academy app running at http://localhost:${PORT}`);
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
