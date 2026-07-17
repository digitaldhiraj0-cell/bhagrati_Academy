const ADMIN_USERNAME = "ADMIN-001";
const ADMIN_PASSWORD = "password123";
const API_BASE = window.location.origin;
const USE_BACKEND = window.location.protocol !== "file:";
const STORAGE_KEYS = {
  adminSession: "bhagirathiAdminSession",
  rememberAdmin: "bhagirathiRememberAdmin",
  students: "bhagirathiStudents",
  parentCredentials: "bhagirathiParentCredentials",
  siteContent: "bhagirathiSiteContent",
  teachers: "bhagirathiTeachers",
  showcase: "bhagirathiShowcase",
};

async function apiRequest(path, options = {}) {
  const session = readJson(STORAGE_KEYS.adminSession, null);
  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }

  return payload;
}

async function loadData(key, fallback) {
  if (USE_BACKEND) {
    try {
      return await apiRequest(`/api/admin/data/${key}`);
    } catch (_error) {
      return readJson(STORAGE_KEYS[key] || key, fallback);
    }
  }

  return readJson(STORAGE_KEYS[key] || key, fallback);
}

async function saveData(key, data) {
  if (USE_BACKEND) {
    try {
      return await apiRequest(`/api/admin/data/${key}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    } catch (_error) {
      writeJson(STORAGE_KEYS[key] || key, data);
      return data;
    }
  }

  writeJson(STORAGE_KEYS[key] || key, data);
  return data;
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

const demoStudents = [
  ["S-001", 1, 1, "Aarav Malasi", "Hemraj Malasi", "9841000001", 94, "Excellent reading progress"],
  ["S-002", 1, 2, "Nisha Saud", "Kamala Saud", "9841000002", 89, "Strong participation"],
  ["S-003", 2, 1, "Bikash Khadka", "Mohan Khadka", "9841000003", 86, "Improving in mathematics"],
  ["S-004", 2, 2, "Ritika Bista", "Sita Bista", "9841000004", 92, "Very disciplined"],
  ["S-005", 3, 1, "Anmol Rawal", "Gopal Rawal", "9841000005", 88, "Good homework record"],
  ["S-006", 3, 2, "Pratiksha Joshi", "Maya Joshi", "9841000006", 95, "Class topper"],
  ["S-007", 4, 1, "Sujal Nepali", "Ramesh Nepali", "9841000007", 83, "Needs regular revision"],
  ["S-008", 4, 2, "Asmita Bogati", "Laxmi Bogati", "9841000008", 90, "Excellent attendance"],
  ["S-009", 5, 1, "Sagar Singh", "Dhan Singh", "9841000009", 87, "Active in sports"],
  ["S-010", 5, 2, "Kusum Chand", "Gita Chand", "9841000010", 93, "Strong science performance"],
  ["S-011", 6, 1, "Rohan Deuba", "Bharat Deuba", "9841000011", 84, "Good classroom behavior"],
  ["S-012", 6, 2, "Sarita Tamata", "Janaki Tamata", "9841000012", 91, "Creative project work"],
  ["S-013", 7, 1, "Dinesh Bam", "Nanda Bam", "9841000013", 85, "Steady improvement"],
  ["S-014", 7, 2, "Puja Kunwar", "Parbati Kunwar", "9841000014", 96, "Outstanding result"],
  ["S-015", 8, 1, "Kiran Dhami", "Tek Dhami", "9841000015", 82, "Needs attendance support"],
  ["S-016", 8, 2, "Manisha Thapa", "Hari Thapa", "9841000016", 90, "Great teamwork"],
  ["S-017", 9, 1, "Bibek Shah", "Bir Shah", "9841000017", 89, "Good analytical skills"],
  ["S-018", 9, 2, "Srijana Oli", "Purna Oli", "9841000018", 94, "Excellent writing"],
  ["S-019", 10, 1, "Anish Saud", "Padam Saud", "9841000019", 97, "SEE distinction track"],
  ["S-020", 10, 2, "Samjhana Karki", "Radha Karki", "9841000020", 92, "Strong leadership"],
].map(([id, classNumber, rollNumber, name, parentName, parentMobile, average, remarks]) => ({
  id,
  classNumber,
  rollNumber,
  name,
  parentName,
  parentMobile,
  attendance: `${88 + (rollNumber % 8)}%`,
  average,
  grade: average >= 90 ? "A+" : average >= 80 ? "A" : "B+",
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

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch (_error) {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function seedStudents() {
  if (!localStorage.getItem(STORAGE_KEYS.students)) {
    writeJson(STORAGE_KEYS.students, demoStudents);
  }
}

function getStudents() {
  seedStudents();
  return readJson(STORAGE_KEYS.students, demoStudents);
}

function getParentCredentials() {
  return readJson(STORAGE_KEYS.parentCredentials, []);
}

function getSiteContent(fallbackContent = null) {
  return { ...defaultSiteContent, ...(fallbackContent || readJson(STORAGE_KEYS.siteContent, {})) };
}

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeMobile(value) {
  return String(value || "").replace(/\D/g, "");
}

function getManagedCollection(key, fallback) {
  const existing = readJson(key, null);
  if (Array.isArray(existing)) return existing;
  writeJson(key, fallback);
  return fallback;
}

function createRecordId(prefix, records) {
  const maxNumber = records.reduce((max, record) => {
    const number = Number(String(record.id).replace(/\D/g, ""));
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0);
  return `${prefix}-${String(maxNumber + 1).padStart(3, "0")}`;
}

function saveParentCredential(credential) {
  const credentials = getParentCredentials();
  const nextCredentials = credentials.filter((item) => item.studentId !== credential.studentId);
  nextCredentials.push(credential);
  writeJson(STORAGE_KEYS.parentCredentials, nextCredentials);
  return nextCredentials;
}

function removeParentCredential(studentId) {
  const credentials = getParentCredentials().filter((item) => item.studentId !== studentId);
  writeJson(STORAGE_KEYS.parentCredentials, credentials);
  return credentials;
}

function buildPageUrl(fileName) {
  const current = window.location.href.split(/[?#]/)[0];
  return current.replace(/[^/]*$/, fileName);
}

function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("977")) return digits;
  return `977${digits}`;
}

function createUsernameFromName(name) {
  return name.trim();
}

function requireAdminSession() {
  const session = readJson(STORAGE_KEYS.adminSession, null);
  if (!session?.isAdmin || (USE_BACKEND && !session.token && !session.demoMode)) {
    window.location.href = "admin-login.html";
    return false;
  }
  return true;
}

function initAdminLogin() {
  const form = document.querySelector("#adminLoginForm");
  if (!form) return;

  const status = document.querySelector("#loginStatus");
  const usernameInput = document.querySelector("#adminUsername");
  const passwordInput = document.querySelector("#adminPassword");
  const rememberInput = document.querySelector("#rememberMe");
  const remembered = readJson(STORAGE_KEYS.rememberAdmin, null);

  if (remembered?.username) {
    usernameInput.value = remembered.username;
    rememberInput.checked = true;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.className = "status";
    status.textContent = "";

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (USE_BACKEND) {
      try {
        const result = await apiRequest("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ username, password, role: "admin" }),
        });

        writeJson(STORAGE_KEYS.adminSession, {
          isAdmin: true,
          username: result.user.username,
          token: result.token,
          loggedInAt: new Date().toISOString(),
        });

        if (rememberInput.checked) {
          writeJson(STORAGE_KEYS.rememberAdmin, { username });
        } else {
          localStorage.removeItem(STORAGE_KEYS.rememberAdmin);
        }

        status.classList.add("success");
        status.textContent = "Login successful. Redirecting...";
        window.location.href = "dashboard.html";
        return;
      } catch (error) {
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
          writeJson(STORAGE_KEYS.adminSession, {
            isAdmin: true,
            username,
            demoMode: true,
            loggedInAt: new Date().toISOString(),
          });

          if (rememberInput.checked) {
            writeJson(STORAGE_KEYS.rememberAdmin, { username });
          } else {
            localStorage.removeItem(STORAGE_KEYS.rememberAdmin);
          }

          status.classList.add("success");
          status.textContent = "Demo login successful. Redirecting...";
          window.location.href = "dashboard.html";
          return;
        }

        status.classList.add("error");
        status.textContent = "Invalid admin username or password.";
        return;
      }
    }

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      writeJson(STORAGE_KEYS.adminSession, {
        isAdmin: true,
        username,
        loggedInAt: new Date().toISOString(),
      });

      if (rememberInput.checked) {
        writeJson(STORAGE_KEYS.rememberAdmin, { username });
      } else {
        localStorage.removeItem(STORAGE_KEYS.rememberAdmin);
      }

      status.classList.add("success");
      status.textContent = "Login successful. Redirecting...";
      window.location.href = "dashboard.html";
      return;
    }

    status.classList.add("error");
    status.textContent = "Invalid admin username or password.";
  });
}

async function initDashboard() {
  if (!document.querySelector("#studentTable")) return;
  if (!requireAdminSession()) return;

  seedStudents();
  let students = USE_BACKEND ? await loadData("students", demoStudents) : getStudents();
  let siteContent = USE_BACKEND ? await loadData("siteContent", defaultSiteContent) : getSiteContent();
  let teachers = USE_BACKEND ? await loadData("teachers", defaultTeachers) : getManagedCollection(STORAGE_KEYS.teachers, defaultTeachers);
  let showcase = USE_BACKEND ? await loadData("showcase", defaultShowcase) : getManagedCollection(STORAGE_KEYS.showcase, defaultShowcase);

  if (USE_BACKEND) {
    writeJson(STORAGE_KEYS.students, students);
    writeJson(STORAGE_KEYS.siteContent, siteContent);
    writeJson(STORAGE_KEYS.teachers, teachers);
    writeJson(STORAGE_KEYS.showcase, showcase);
    try {
      writeJson(STORAGE_KEYS.parentCredentials, await apiRequest("/api/admin/parent-credentials/list"));
    } catch (_error) {
      writeJson(STORAGE_KEYS.parentCredentials, []);
    }
  }

  let selectedStudent = students[0];

  const table = document.querySelector("#studentTable");
  const detail = document.querySelector("#studentDetail");
  const search = document.querySelector("#studentSearch");
  const classFilter = document.querySelector("#classFilter");
  const totalStudents = document.querySelector("#totalStudents");
  const credentialCount = document.querySelector("#credentialCount");
  const studentForm = document.querySelector("#studentForm");
  const studentEditor = document.querySelector("#studentEditor");
  const studentFormStatus = document.querySelector("#studentFormStatus");
  const contentForm = document.querySelector("#contentForm");
  const contentFormStatus = document.querySelector("#contentFormStatus");
  const teacherForm = document.querySelector("#teacherForm");
  const teacherList = document.querySelector("#teacherList");
  const teacherFormStatus = document.querySelector("#teacherFormStatus");
  const showcaseForm = document.querySelector("#showcaseForm");
  const showcaseList = document.querySelector("#showcaseList");
  const showcaseFormStatus = document.querySelector("#showcaseFormStatus");
  async function persistStudents() {
    writeJson(STORAGE_KEYS.students, students);
    totalStudents.textContent = String(students.length);
    if (USE_BACKEND) {
      await saveData("students", students);
    }
  }

  persistStudents();

  classFilter.innerHTML += Array.from({ length: 10 }, (_item, index) => {
    const classNumber = index + 1;
    return `<option value="${classNumber}">Class ${classNumber}</option>`;
  }).join("");

  function updateCredentialCount() {
    credentialCount.textContent = String(getParentCredentials().length);
  }

  function createStudentId() {
    const maxNumber = students.reduce((max, student) => {
      const number = Number(String(student.id).replace(/\D/g, ""));
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 0);
    return `S-${String(maxNumber + 1).padStart(3, "0")}`;
  }

  function clearStudentForm() {
    studentForm.reset();
    studentForm.elements.id.value = "";
    studentFormStatus.className = "status";
    studentFormStatus.textContent = "";
  }

  function fillStudentForm(student) {
    studentEditor.open = true;
    studentForm.elements.id.value = student.id;
    studentForm.elements.name.value = student.name;
    studentForm.elements.classNumber.value = String(student.classNumber);
    studentForm.elements.rollNumber.value = String(student.rollNumber);
    studentForm.elements.parentName.value = student.parentName;
    studentForm.elements.parentMobile.value = student.parentMobile;
    studentForm.elements.attendance.value = student.attendance;
    studentForm.elements.average.value = String(student.average);
    studentForm.elements.grade.value = student.grade;
    studentForm.elements.remarks.value = student.remarks;
    studentFormStatus.className = "status";
    studentFormStatus.textContent = `Editing ${student.name}`;
  }

  function refreshExistingParentCredential(student) {
    const existing = getParentCredentials().find((item) => item.studentId === student.id);
    if (!existing) return;

    if (USE_BACKEND) {
      apiRequest("/api/admin/parent-credentials", {
        method: "POST",
        body: JSON.stringify({ studentId: student.id }),
      }).then((credential) => {
        saveParentCredential(credential);
        updateCredentialCount();
      }).catch(() => {
        saveParentCredential({
          ...existing,
          username: createUsernameFromName(student.name),
          password: student.parentMobile,
          parentMobile: student.parentMobile,
          updatedAt: new Date().toISOString(),
        });
        updateCredentialCount();
      });
      return;
    }

    saveParentCredential({
      ...existing,
      username: createUsernameFromName(student.name),
      password: student.parentMobile,
      parentMobile: student.parentMobile,
      updatedAt: new Date().toISOString(),
    });
  }

  function getFilteredStudents() {
    const query = search.value.trim().toLowerCase();
    const classValue = classFilter.value;

    return students.filter((student) => {
      const matchesQuery =
        !query ||
        student.name.toLowerCase().includes(query) ||
        String(student.rollNumber).includes(query);
      const matchesClass = classValue === "all" || String(student.classNumber) === classValue;
      return matchesQuery && matchesClass;
    });
  }

  function studentMessage(student, includeCredentials = false, credential = null) {
    const parentLink = buildPageUrl("parent-portal.html");
    const lines = [
      `Bhagirathi Academy School - Student Information`,
      `Student: ${student.name}`,
      `Class: ${student.classNumber}`,
      `Roll No: ${student.rollNumber}`,
      `Attendance: ${student.attendance}`,
      `Average Marks: ${student.average}%`,
      `Grade: ${student.grade}`,
      `Remarks: ${student.remarks}`,
    ];

    if (includeCredentials && credential) {
      lines.push("", "Parent Login Details", `Login link: ${parentLink}`, `Username: ${credential.username}`, `Password: ${credential.password}`);
      lines.push("This login is restricted to your child's data only.");
    }

    return lines.join("\n");
  }

  function openWhatsApp(student, message) {
    const phone = normalizePhone(student.parentMobile);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  }

  function renderDetail(student) {
    selectedStudent = student;
    const existingCredential = getParentCredentials().find((item) => item.studentId === student.id);
    detail.innerHTML = `
      <p class="eyebrow">Selected Student</p>
      <h2>${student.name}</h2>
      <p class="muted">${student.parentName} can receive this student report through WhatsApp.</p>
      <div class="detail-list">
        <div><span>Student ID</span><strong>${student.id}</strong></div>
        <div><span>Class</span><strong>${student.classNumber}</strong></div>
        <div><span>Roll Number</span><strong>${student.rollNumber}</strong></div>
        <div><span>Parent Name</span><strong>${student.parentName}</strong></div>
        <div><span>Parent Mobile</span><strong>${student.parentMobile}</strong></div>
        <div><span>Attendance</span><strong>${student.attendance}</strong></div>
        <div><span>Average</span><strong>${student.average}%</strong></div>
        <div><span>Grade</span><strong>${student.grade}</strong></div>
        <div><span>Remarks</span><strong>${student.remarks}</strong></div>
      </div>
      <div class="action-stack">
        <button class="btn" id="sendInfoButton" type="button">Send Student Info via WhatsApp</button>
        <button class="btn secondary" id="generateCredentialButton" type="button">Generate Parent Login Credentials</button>
        <button class="btn secondary" id="editStudentButton" type="button">Edit Student</button>
        <button class="btn danger" id="deleteStudentButton" type="button">Delete Student</button>
      </div>
      <div class="credential-box" id="credentialBox" ${existingCredential ? "" : "hidden"}>
        ${existingCredential ? `Username: ${existingCredential.username}<br>Password: ${existingCredential.password}<br>Login: ${buildPageUrl("parent-portal.html")}` : ""}
      </div>
    `;

    document.querySelector("#sendInfoButton").addEventListener("click", () => {
      openWhatsApp(student, studentMessage(student));
    });

    document.querySelector("#generateCredentialButton").addEventListener("click", async () => {
      let credential = {
        studentId: student.id,
        username: createUsernameFromName(student.name),
        password: student.parentMobile,
        parentMobile: student.parentMobile,
        createdAt: new Date().toISOString(),
      };

      if (USE_BACKEND) {
        try {
          credential = await apiRequest("/api/admin/parent-credentials", {
            method: "POST",
            body: JSON.stringify({ studentId: student.id }),
          });
        } catch (_error) {
          credential.demoMode = true;
        }
      }

      saveParentCredential(credential);
      updateCredentialCount();
      document.querySelector("#credentialBox").hidden = false;
      document.querySelector("#credentialBox").innerHTML =
        `Username: ${credential.username}<br>Password: ${credential.password}<br>Login: ${buildPageUrl("parent-portal.html")}`;
      openWhatsApp(student, studentMessage(student, true, credential));
    });

    document.querySelector("#editStudentButton").addEventListener("click", () => {
      fillStudentForm(student);
      studentEditor.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    document.querySelector("#deleteStudentButton").addEventListener("click", async () => {
      const confirmed = window.confirm(`Delete ${student.name}'s record? This also removes their generated parent login.`);
      if (!confirmed) return;

      students = students.filter((item) => item.id !== student.id);
      removeParentCredential(student.id);
      if (USE_BACKEND) {
        try {
          await apiRequest(`/api/admin/parent-credentials/${encodeURIComponent(student.id)}`, { method: "DELETE" });
        } catch (_error) {}
      }
      selectedStudent = students[0] || null;
      await persistStudents();
      updateCredentialCount();
      clearStudentForm();
      renderTable();

      if (selectedStudent) {
        renderDetail(selectedStudent);
      } else {
        detail.innerHTML = `
          <p class="eyebrow">Selected Student</p>
          <h2>No student records</h2>
          <p class="muted">Use the form above to add a new student.</p>
        `;
      }
    });
  }

  function renderTable() {
    const filtered = getFilteredStudents();
    table.innerHTML = filtered
      .map(
        (student) => `
          <tr data-student-id="${student.id}" class="${selectedStudent?.id === student.id ? "active" : ""}">
            <td>${student.rollNumber}</td>
            <td>${student.name}</td>
            <td>Class ${student.classNumber}</td>
            <td>${student.parentName}</td>
            <td>${student.parentMobile}</td>
          </tr>
        `,
      )
      .join("");

    if (!filtered.length) {
      table.innerHTML = `<tr><td colspan="5">No students found.</td></tr>`;
    }
  }

  table.addEventListener("click", (event) => {
    const row = event.target.closest("tr[data-student-id]");
    if (!row) return;
    const student = students.find((item) => item.id === row.dataset.studentId);
    if (!student) return;
    renderDetail(student);
    renderTable();
  });

  search.addEventListener("input", renderTable);
  classFilter.addEventListener("change", renderTable);
  document.querySelector("#resetSearch").addEventListener("click", () => {
    search.value = "";
    classFilter.value = "all";
    renderTable();
  });

  document.querySelector("#clearStudentForm").addEventListener("click", clearStudentForm);

  function fillContentForm() {
    const content = getSiteContent(siteContent);
    Object.entries(content).forEach(([key, value]) => {
      if (contentForm.elements[key]) {
        contentForm.elements[key].value = value;
      }
    });
  }

  contentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const content = Object.fromEntries(new FormData(contentForm).entries());
    siteContent = content;
    writeJson(STORAGE_KEYS.siteContent, content);
    if (USE_BACKEND) {
      await saveData("siteContent", content);
    }
    contentFormStatus.className = "status success";
    contentFormStatus.textContent = USE_BACKEND
      ? "Website content saved permanently to the backend."
      : "Website content saved in this browser. Open the public website to preview changes.";
  });

  document.querySelector("#resetContentForm").addEventListener("click", async () => {
    localStorage.removeItem(STORAGE_KEYS.siteContent);
    siteContent = defaultSiteContent;
    if (USE_BACKEND) {
      await saveData("siteContent", defaultSiteContent);
    }
    fillContentForm();
    contentFormStatus.className = "status success";
    contentFormStatus.textContent = "Default website content restored.";
  });

  studentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(studentForm).entries());
    const isEditing = Boolean(data.id);
    const rollNumber = Number(data.rollNumber);
    const classNumber = Number(data.classNumber);
    const average = Number(data.average);
    const duplicate = students.find(
      (student) =>
        student.id !== data.id &&
        student.classNumber === classNumber &&
        student.rollNumber === rollNumber,
    );

    studentFormStatus.className = "status";

    if (duplicate) {
      studentFormStatus.classList.add("error");
      studentFormStatus.textContent = `Class ${classNumber} already has roll number ${rollNumber}.`;
      return;
    }

    const studentRecord = {
      id: data.id || createStudentId(),
      classNumber,
      rollNumber,
      name: data.name.trim(),
      parentName: data.parentName.trim(),
      parentMobile: data.parentMobile.trim(),
      attendance: data.attendance.trim(),
      average,
      grade: data.grade.trim(),
      remarks: data.remarks.trim(),
    };

    if (isEditing) {
      students = students.map((student) => (student.id === data.id ? studentRecord : student));
      studentFormStatus.classList.add("success");
      studentFormStatus.textContent = "Student record updated.";
    } else {
      students.push(studentRecord);
      studentFormStatus.classList.add("success");
      studentFormStatus.textContent = "Student record added.";
    }

    selectedStudent = studentRecord;
    refreshExistingParentCredential(studentRecord);
    updateCredentialCount();
    await persistStudents();
    renderDetail(studentRecord);
    renderTable();
    studentForm.elements.id.value = studentRecord.id;
  });

  async function saveManagedCollection(key, records) {
    writeJson(STORAGE_KEYS[key] || key, records);
    if (USE_BACKEND) {
      await saveData(key, records);
    }
  }

  function renderManagementList(records, list, type) {
    list.innerHTML = records
      .map(
        (record) => `
          <article class="management-item" data-id="${record.id}" data-type="${type}">
            <img src="${record.img}" alt="${record.name}" />
            <div>
              <h3>${record.name}</h3>
              <p class="muted">${type === "teacher" ? `${record.subject} - ${record.phone}` : `${record.type} - ${record.detail}`}</p>
            </div>
            <div class="management-actions">
              <button class="btn secondary" type="button" data-action="edit">Edit</button>
              <button class="btn danger" type="button" data-action="delete">Delete</button>
            </div>
          </article>
        `,
      )
      .join("");
  }

  function clearManagedForm(form, status) {
    form.reset();
    form.elements.id.value = "";
    status.className = "status";
    status.textContent = "";
  }

  function setupManagedCrud({ form, list, status, getRecords, setRecords, storageKey, prefix, type }) {
    renderManagementList(getRecords(), list, type);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      let records = getRecords();
      const record = { ...data, id: data.id || createRecordId(prefix, records) };

      if (data.id) {
        records = records.map((item) => (item.id === data.id ? record : item));
        status.textContent = `${type === "teacher" ? "Teacher profile" : "Showcase item"} updated.`;
      } else {
        records.push(record);
        status.textContent = `${type === "teacher" ? "Teacher profile" : "Showcase item"} added.`;
      }

      status.className = "status success";
      setRecords(records);
      await saveManagedCollection(storageKey, records);
      renderManagementList(records, list, type);
      form.elements.id.value = record.id;
    });

    list.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      const item = event.target.closest(".management-item");
      if (!button || !item) return;

      let records = getRecords();
      const record = records.find((entry) => entry.id === item.dataset.id);
      if (!record) return;

      if (button.dataset.action === "edit") {
        Object.entries(record).forEach(([key, value]) => {
          if (form.elements[key]) form.elements[key].value = value;
        });
        status.className = "status";
        status.textContent = `Editing ${record.name}`;
      }

      if (button.dataset.action === "delete") {
        const confirmed = window.confirm(`Delete ${record.name}?`);
        if (!confirmed) return;
        records = records.filter((entry) => entry.id !== record.id);
        setRecords(records);
        saveManagedCollection(storageKey, records);
        renderManagementList(records, list, type);
        clearManagedForm(form, status);
      }
    });
  }

  document.querySelector("#clearTeacherForm").addEventListener("click", () => {
    clearManagedForm(teacherForm, teacherFormStatus);
  });

  document.querySelector("#clearShowcaseForm").addEventListener("click", () => {
    clearManagedForm(showcaseForm, showcaseFormStatus);
  });

  setupManagedCrud({
    form: teacherForm,
    list: teacherList,
    status: teacherFormStatus,
    getRecords: () => teachers,
    setRecords: (records) => {
      teachers = records;
    },
    storageKey: "teachers",
    prefix: "T",
    type: "teacher",
  });

  setupManagedCrud({
    form: showcaseForm,
    list: showcaseList,
    status: showcaseFormStatus,
    getRecords: () => showcase,
    setRecords: (records) => {
      showcase = records;
    },
    storageKey: "showcase",
    prefix: "A",
    type: "showcase",
  });

  document.querySelector("#logoutButton").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEYS.adminSession);
    window.location.href = "admin-login.html";
  });

  updateCredentialCount();
  fillContentForm();
  if (selectedStudent) renderDetail(selectedStudent);
  renderTable();
}

function initParentPortal() {
  const form = document.querySelector("#parentLoginForm");
  if (!form) return;

  const status = document.querySelector("#parentStatus");
  const loginPanel = document.querySelector("#parentLoginPanel");
  const dataPanel = document.querySelector("#parentDataPanel");
  const childName = document.querySelector("#parentChildName");
  const dataGrid = document.querySelector("#parentStudentData");

  function renderChild(student) {
    loginPanel.hidden = true;
    dataPanel.hidden = false;
    childName.textContent = student.name;
    dataGrid.innerHTML = `
      <div><span>Student ID</span><strong>${student.id}</strong></div>
      <div><span>Class</span><strong>${student.classNumber}</strong></div>
      <div><span>Roll Number</span><strong>${student.rollNumber}</strong></div>
      <div><span>Attendance</span><strong>${student.attendance}</strong></div>
      <div><span>Average Marks</span><strong>${student.average}%</strong></div>
      <div><span>Grade</span><strong>${student.grade}</strong></div>
      <div><span>Parent</span><strong>${student.parentName}</strong></div>
      <div><span>Remarks</span><strong>${student.remarks}</strong></div>
    `;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.className = "status";
    status.textContent = "";

    const formData = new FormData(form);
    const username = normalizeText(formData.get("username"));
    const password = normalizeMobile(formData.get("password"));

    if (USE_BACKEND) {
      try {
        const result = await apiRequest("/api/parents/login", {
          method: "POST",
          body: JSON.stringify({
            username: formData.get("username"),
            password: formData.get("password"),
          }),
        });
        renderChild(result.student);
        return;
      } catch (error) {
        status.classList.add("error");
        status.textContent = error.message || "Invalid parent username or password.";
        return;
      }
    }

    const credential = getParentCredentials().find((item) => {
      const linkedStudent = getStudents().find((student) => student.id === item.studentId);
      const validUsernames = [item.username, linkedStudent?.name].filter(Boolean).map(normalizeText);
      return validUsernames.includes(username) && normalizeMobile(item.password) === password;
    });

    if (!credential) {
      status.classList.add("error");
      status.textContent = "Invalid parent username or password.";
      return;
    }

    const student = getStudents().find((item) => item.id === credential.studentId);
    if (!student) {
      status.classList.add("error");
      status.textContent = "Linked student record was not found.";
      return;
    }

    renderChild(student);
  });

  document.querySelector("#parentLogout").addEventListener("click", () => {
    dataPanel.hidden = true;
    loginPanel.hidden = false;
    form.reset();
  });
}

initAdminLogin();
initDashboard();
initParentPortal();
