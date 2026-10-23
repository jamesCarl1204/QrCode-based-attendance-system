let classes = [];
let activeClassId = null;
let classFilter = "active"; 
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}


const emptyState = document.getElementById("emptyState");
const archivedEmptyState = document.getElementById("archivedEmptyState");
const subjectGrid = document.getElementById("subjectGrid");
const classSummary = document.getElementById("classSummary");

const appShell = document.getElementById("appShell");
const detailPage = document.getElementById("detailPage");
const detailSubjectName = document.getElementById("detailSubjectName");
const detailSectionName = document.getElementById("detailSectionName");
const detailClassCode = document.getElementById("detailClassCode");
const detailTeacherEmail = document.getElementById("detailTeacherEmail");

const joinClassModal = document.getElementById("joinClassModal");
const joinCodeInput = document.getElementById("joinCode");
const joinCodeError = document.getElementById("joinCodeError");

const sessionCountText = document.getElementById("sessionCountText");
const attendanceEmptyState = document.getElementById("attendanceEmptyState");
const sessionList = document.getElementById("sessionList");

const scanQrModal = document.getElementById("scanQrModal");
const scanError = document.getElementById("scanError");
const scanStatusText = document.getElementById("scanStatusText");
let html5QrScanner = null;

const memberCountText = document.getElementById("memberCountText");
const teacherMemberName = document.getElementById("teacherMemberName");
const teacherMemberEmail = document.getElementById("teacherMemberEmail");
const membersEmptyState = document.getElementById("membersEmptyState");
const membersList = document.getElementById("membersList");


function formatTimeString12hr(timeStr) {
  if (!timeStr) return "";
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${ampm}`;
}

function openModal(id) {
  document.getElementById(id).classList.add("active");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("active");
  if (id === "scanQrModal") stopScanner();
}

function updateClassSummary() {
  const visible = classes.filter((c) => (classFilter === "archived" ? c.archived : !c.archived));
  const count = visible.length;
  const label = classFilter === "archived" ? "archived" : "joined";
  classSummary.textContent = `${count} ${count === 1 ? "class" : "classes"} ${label}`;

  const isArchivedTab = classFilter === "archived";
  emptyState.classList.toggle("active", count === 0 && !isArchivedTab);
  archivedEmptyState.classList.toggle("active", count === 0 && isArchivedTab);
  subjectGrid.style.display = count === 0 ? "none" : "grid";
}

function renderAllCards() {
  subjectGrid.innerHTML = "";
  const visible = classes.filter((c) => (classFilter === "archived" ? c.archived : !c.archived));
  visible.forEach(renderSubjectCard);
}

function renderSubjectCard(cls) {
  const card = document.createElement("div");
  card.className = `subject-card color-${cls.color}`;
  card.dataset.id = cls.id;

  card.innerHTML = `
    <div class="card-icon"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
    <div>
      <h3>${escapeHtml(cls.subject)}</h3>
      <p class="section-label">${escapeHtml(cls.section || "No section set")}${cls.archived ? " · Archived" : ""}</p>
    </div>
    <p class="card-code-row">Code: <span>${escapeHtml(cls.code)}</span></p>
    <div class="card-footer">
      <a class="open-class-link">Open class <span>›</span></a>
    </div>
  `;

  card.addEventListener("click", () => openClassDetail(cls.id));
  subjectGrid.appendChild(card);
}

async function openClassDetail(classId) {
  const cls = classes.find((c) => c.id === classId);
  if (!cls) return;
  activeClassId = classId;

  detailSubjectName.textContent = cls.subject;
  detailSectionName.textContent = cls.section || "No section set";
  detailClassCode.textContent = cls.code;
  detailTeacherEmail.textContent = cls.teacherFirstName
    ? `Teacher: ${cls.teacherFirstName} (${cls.teacherEmail})`
    : "";

  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  document.querySelector('.tab-btn[data-tab="attendance"]').classList.add("active");
  document.querySelectorAll(".tab-content").forEach((t) => t.classList.remove("active"));
  document.getElementById("attendanceTab").classList.add("active");

  await renderAttendanceForActiveClass();
  await renderMembersForActiveClass();

  appShell.style.display = "none";
  detailPage.classList.add("active");
}

function backToClasses() {
  detailPage.classList.remove("active");
  appShell.style.display = "flex";
  activeClassId = null;
}

async function renderMembersForActiveClass() {
  if (!activeClassId) return;
  try {
    const res = await fetch(`/api/classes/${activeClassId}/members`, { credentials: "include" });
    const data = await res.json();
    if (!data.success) return;

    teacherMemberName.textContent = data.teacher ? data.teacher.first_name : "—";
    teacherMemberEmail.textContent = data.teacher ? data.teacher.email : "—";

    const students = data.students || [];
    memberCountText.textContent = `${students.length} student${students.length === 1 ? "" : "s"} joined`;
    membersEmptyState.classList.toggle("active", students.length === 0);

    membersList.innerHTML = "";
    students.forEach((s) => {
      const row = document.createElement("div");
      row.className = "session-card";
      row.innerHTML = `
        <div>
          <div class="session-date">${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}</div>
          <div class="session-time">${escapeHtml(s.email)}</div>
        </div>
      `;
      membersList.appendChild(row);
    });
  } catch (err) {
    console.error("Failed to load members:", err);
  }
}

async function loadClasses() {
  try {
    const res = await fetch("/api/classes", { credentials: "include" });
    const data = await res.json();
    if (data.success) {
      classes = data.classes.map((c) => ({
        id: c.id,
        subject: c.subject_name,
        section: c.section,
        code: c.class_code,
        color: c.color,
        archived: !!c.archived,
        teacherFirstName: c.teacher_first_name,
        teacherEmail: c.teacher_email,
      }));
      renderAllCards();
      updateClassSummary();
    }
  } catch (err) {
    console.error("Failed to load classes:", err);
  }
}

document.getElementById("submitJoinClass").addEventListener("click", async () => {
  const code = joinCodeInput.value.trim();
  joinCodeError.textContent = "";
  joinCodeInput.style.borderColor = "";

  if (!code) {
    joinCodeInput.style.borderColor = "#dc2626";
    joinCodeError.textContent = "Class code is required.";
    return;
  }

  const submitBtn = document.getElementById("submitJoinClass");
  submitBtn.disabled = true;
  submitBtn.textContent = "Joining…";

  try {
    const res = await fetch("/api/classes/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ classCode: code }),
    });
    const data = await res.json();

    if (!data.success) {
      const msg = (data.errors && data.errors.joinCode) || data.generalError || "Could not join class.";
      joinCodeInput.style.borderColor = "#dc2626";
      joinCodeError.textContent = msg;
      return;
    }

    const newClass = {
      id: data.class.id,
      subject: data.class.subject_name,
      section: data.class.section,
      code: data.class.class_code,
      color: data.class.color,
      archived: !!data.class.archived,
      teacherFirstName: data.class.teacher_first_name,
      teacherEmail: data.class.teacher_email,
    };

    classes.push(newClass);
    if (classFilter === "active" && !newClass.archived) renderSubjectCard(newClass);
    updateClassSummary();
    closeModal("joinClassModal");
    joinCodeInput.value = "";
  } catch (err) {
    console.error("Join class error:", err);
    joinCodeError.textContent = "Something went wrong. Please try again.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Join";
  }
});


document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".tab-content").forEach((t) => t.classList.remove("active"));
    document.getElementById(`${btn.dataset.tab}Tab`).classList.add("active");

    if (btn.dataset.tab === "members") {
      renderMembersForActiveClass();
    }
  });
});


document.getElementById("joinClassBtn").addEventListener("click", () => openModal("joinClassModal"));
document.getElementById("emptyJoinBtn").addEventListener("click", () => openModal("joinClassModal"));
document.getElementById("backToClasses").addEventListener("click", backToClasses);

// My Classes / Archive sidebar links (Scan link is handled separately below)
document.querySelectorAll(".sidebar-link[data-filter]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".sidebar-link[data-filter]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    classFilter = btn.dataset.filter;
    document.getElementById("sectionHeading").textContent =
      classFilter === "archived" ? "Archived Classes" : "My Classes";
    renderAllCards();
    updateClassSummary();
  });
});

document.querySelectorAll("[data-close]").forEach((el) => {
  el.addEventListener("click", () => closeModal(el.dataset.close));
});

document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  openModal("logoutConfirmModal");
});

document.getElementById("confirmLogoutBtn").addEventListener("click", async () => {
  const btn = document.getElementById("confirmLogoutBtn");
  btn.disabled = true;
  btn.textContent = "Logging out…";

  try {
    const res = await fetch("/api/logout", { method: "POST", credentials: "include" });
    const data = await res.json();
    window.location.href = data.redirect || "login.html";
  } catch (err) {
    console.error("Logout failed:", err);
    window.location.href = "login.html";
  } finally {
    btn.disabled = false;
    btn.textContent = "Log out";
  }
});


async function renderAttendanceForActiveClass() {
  if (!activeClassId) return;
  try {
    const res = await fetch(`/api/classes/${activeClassId}/sessions`, { credentials: "include" });
    const data = await res.json();
    if (!data.success) return;

    const sessions = data.sessions || [];
    sessionCountText.textContent = `${sessions.length} session${sessions.length === 1 ? "" : "s"} recorded`;
    attendanceEmptyState.classList.toggle("active", sessions.length === 0);

    sessionList.innerHTML = "";
 sessions.forEach((s) => {
      const item = document.createElement("div");
      item.className = "session-card";
      item.style.cursor = "pointer";
      item.innerHTML = `
        <div>
          <div class="session-date">${s.session_date}</div>
          <div class="session-time">${formatTimeString12hr(s.start_time)} – ${formatTimeString12hr(s.end_time)} · Late after ${formatTimeString12hr(s.late_after)}</div>
        </div>
      `;
      item.addEventListener("click", () => openSessionRecords(s));
      sessionList.appendChild(item);
    });
  } catch (err) {
    console.error("Failed to load sessions:", err);
  }
}

async function openSessionRecords(session) {
  document.getElementById("viewSessionDate").textContent = session.session_date;
  document.getElementById("viewSessionTimeRange").textContent =
    `${formatTimeString12hr(session.start_time)} – ${formatTimeString12hr(session.end_time)} · Late after ${formatTimeString12hr(session.late_after)}`;

  const body = document.getElementById("viewSessionBody");
  body.innerHTML = "<p class='muted-text'>Loading…</p>";
  openModal("viewSessionModal");

  try {
    const res = await fetch(`/api/sessions/${session.id}/records`, { credentials: "include" });
    const data = await res.json();
    if (!data.success) {
      body.innerHTML = "<p class='muted-text'>Could not load records.</p>";
      return;
    }

    const records = data.records || [];
    if (records.length === 0) {
      body.innerHTML = "<p class='muted-text'>No students in this class yet.</p>";
      return;
    }

    const rows = records.map((r) => `
      <tr>
        <td>${escapeHtml(r.first_name)} ${escapeHtml(r.last_name)}</td>
        <td>${r.time_in ? formatTimeString12hr(r.time_in) : "—"}</td>
        <td>${r.status || "Not yet"}</td>
      </tr>
    `).join("");

    body.innerHTML = `
      <table class="records-table">
        <thead>
          <tr><th>Name</th><th>Time</th><th>Status</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  } catch (err) {
    console.error("Failed to load session records:", err);
    body.innerHTML = "<p class='muted-text'>Something went wrong.</p>";
  }
}


function startScanner() {
  scanError.textContent = "";
  scanStatusText.textContent = "";

  html5QrScanner = new Html5Qrcode("qrReader");
  html5QrScanner
    .start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 220 },
      onScanSuccess,
      () => {}
    )
    .catch((err) => {
      scanError.textContent = "Could not access camera. Please allow camera permission.";
      console.error("Camera start error:", err);
    });
}

function stopScanner() {
  if (html5QrScanner) {
    const scanner = html5QrScanner;
    html5QrScanner = null;
    scanner.stop().then(() => scanner.clear()).catch(() => {});
  }
}

async function onScanSuccess(decodedText) {
  if (!html5QrScanner) return;
  stopScanner();

  scanStatusText.textContent = "Marking attendance…";

  try {
    const res = await fetch("/api/attend/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code: decodedText }),
    });
    const data = await res.json();

    if (!data.success) {
      scanError.textContent = data.generalError || "Could not mark attendance.";
      scanStatusText.textContent = "";
      startScanner();
      return;
    }

    const subjectLabel = data.subject_name ? ` for ${data.subject_name}` : "";
    scanStatusText.textContent = `Marked as ${data.status}${subjectLabel} at ${formatTimeString12hr(data.time_in)}`;

    if (activeClassId && data.class_id && activeClassId === data.class_id) {
      await renderAttendanceForActiveClass();
    }
    setTimeout(() => closeModal("scanQrModal"), 1500);
  } catch (err) {
    console.error("Scan attend error:", err);
    scanError.textContent = "Something went wrong. Please try again.";
    startScanner();
  }
}

document.getElementById("sidebarScanBtn").addEventListener("click", () => {
  openModal("scanQrModal");
  startScanner();
});

document.getElementById("sidebarToggleBtn").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("collapsed");
});

loadClasses();

document.getElementById("leaveClassBtn").addEventListener("click", () => {
  const cls = classes.find((c) => c.id === activeClassId);
  if (!cls) return;
  document.getElementById("leaveClassSubject").textContent = cls.subject;
  document.getElementById("leaveClassError").textContent = "";
  openModal("leaveClassModal");
});

document.getElementById("confirmLeaveClassBtn").addEventListener("click", async () => {
  const cls = classes.find((c) => c.id === activeClassId);
  if (!cls) return;

  const btn = document.getElementById("confirmLeaveClassBtn");
  const errorEl = document.getElementById("leaveClassError");
  errorEl.textContent = "";
  btn.disabled = true;
  btn.textContent = "Leaving…";

  try {
    const res = await fetch(`/api/classes/${cls.id}/leave`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();

    if (!data.success) {
      errorEl.textContent = data.generalError || "Could not leave this class.";
      return;
    }

    classes = classes.filter((c) => c.id !== cls.id);
    closeModal("leaveClassModal");
    backToClasses();
    renderAllCards();
    updateClassSummary();
  } catch (err) {
    console.error("Leave class error:", err);
    errorEl.textContent = "Something went wrong. Please try again.";
  } finally {
    btn.disabled = false;
    btn.textContent = "Leave class";
  }
});