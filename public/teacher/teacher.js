let classes = [];      
let attendanceSessions = {};
let activeClassId = null;
let selectedColor = "blue";
let currentTeacher = null;
let classFilter = "active"; 
let archiveSearchQuery = "";

const emptyState = document.getElementById("emptyState");
const archiveSearchInput = document.getElementById("archiveSearchInput");
const archivedEmptyState = document.getElementById("archivedEmptyState");
const subjectGrid = document.getElementById("subjectGrid");
const classSummary = document.getElementById("classSummary");
const archiveClassBtn = document.getElementById("archiveClassBtn");
const createAttendanceBtn = document.getElementById("createAttendanceBtn");
const archivedHint = document.getElementById("archivedHint");

const detailPage = document.getElementById("detailPage");
const mainContent = document.querySelector(".main-content");
const appShell = document.getElementById("appShell");
const detailBanner = document.getElementById("detailBanner");
const detailSubjectName = document.getElementById("detailSubjectName");
const detailSectionName = document.getElementById("detailSectionName");
const detailClassCode = document.getElementById("detailClassCode");

const createClassModal = document.getElementById("createClassModal");
const subjectNameInput = document.getElementById("subjectName");
const sectionGradeInput = document.getElementById("sectionGrade");
const classCodeInput = document.getElementById("classCode");
const colorPicker = document.getElementById("colorPicker");


const createAttendanceModal = document.getElementById("createAttendanceModal");
const attendanceModalSubject = document.getElementById("attendanceModalSubject");
const attendanceModalSection = document.getElementById("attendanceModalSection");
const lateAfterInput = document.getElementById("lateAfter");
const lateAfterPreview = document.getElementById("lateAfterPreview");
const sessionList = document.getElementById("sessionList");
const attendanceEmptyState = document.getElementById("attendanceEmptyState");
const sessionCountText = document.getElementById("sessionCountText");

const sessionQrModal = document.getElementById("sessionQrModal");
const qrSessionDate = document.getElementById("qrSessionDate");
const qrSessionTimeRange = document.getElementById("qrSessionTimeRange");
const qrCodeContainer = document.getElementById("qrCodeContainer");

const memberCountText = document.getElementById("memberCountText");
const teacherMemberName = document.getElementById("teacherMemberName");
const teacherMemberEmail = document.getElementById("teacherMemberEmail");
const membersEmptyState = document.getElementById("membersEmptyState");
const membersList = document.getElementById("membersList");


const CLASS_BANNER_GRADIENT = {
  blue: "linear-gradient(135deg, #1e3a8a 0%, #0f1f4b 100%)",
  green: "linear-gradient(135deg, #14532d 0%, #052e14 100%)",
  pink: "linear-gradient(135deg, #9d174d 0%, #4a0f28 100%)",
  orange: "linear-gradient(135deg, #9a3412 0%, #431a09 100%)",
  purple: "linear-gradient(135deg, #5b21b6 0%, #2c0f5c 100%)",
  teal: "linear-gradient(135deg, #0f766e 0%, #063a36 100%)",
};

function applyClassBannerColor(color) {
  if (!detailBanner) return;
  detailBanner.style.background = CLASS_BANNER_GRADIENT[color] || CLASS_BANNER_GRADIENT.blue;
}

function openModal(id) {
  document.getElementById(id).classList.add("active");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("active");
  if (id === "createAttendanceModal") stopLiveClock();
}

function getPHNow() {
  const phString = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
  return new Date(phString);
}

function pad2(n) {
  return n.toString().padStart(2, "0");
}

function toDateInputValue(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toTimeInputValue(d) {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatDate12hr(d) {
  let hours = d.getHours();
  const minutes = pad2(d.getMinutes());
  const seconds = pad2(d.getSeconds());
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes}:${seconds} ${ampm}`;
}

function formatTimeString12hr(timeStr) {
  if (!timeStr) return "";
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${ampm}`;
}

let liveClockInterval = null;
function startLiveClock() {
  const el = document.getElementById("liveClockText");
  function tick() {
    el.textContent = formatDate12hr(getPHNow());
  }
  tick();
  stopLiveClock(); 
  liveClockInterval = setInterval(tick, 1000);
}
function stopLiveClock() {
  if (liveClockInterval) {
    clearInterval(liveClockInterval);
    liveClockInterval = null;
  }
}

function updateClassSummary() {
  const visible = classes.filter((c) => (classFilter === "archived" ? c.archived : !c.archived));
  const count = visible.length;
  const label = classFilter === "archived" ? "archived" : "active";
  classSummary.textContent = `${count} ${label} ${count === 1 ? "class" : "classes"} · School Year 2025–2026`;

  const isArchivedTab = classFilter === "archived";
  emptyState.classList.toggle("active", count === 0 && !isArchivedTab);
  archivedEmptyState.classList.toggle("active", count === 0 && isArchivedTab);
  subjectGrid.style.display = count === 0 ? "none" : "grid";
}

function renderAllCards() {
  subjectGrid.innerHTML = "";
  let visible = classes.filter((c) => (classFilter === "archived" ? c.archived : !c.archived));

  if (classFilter === "archived" && archiveSearchQuery.trim()) {
    const q = archiveSearchQuery.trim().toLowerCase();
    visible = visible.filter((c) =>
      (c.subject || "").toLowerCase().includes(q) ||
      (c.section || "").toLowerCase().includes(q) ||
      (c.code || "").toLowerCase().includes(q)
    );
  }

  visible.forEach(renderSubjectCard);
}

function renderSubjectCard(cls) {
  const card = document.createElement("div");
  card.className = `subject-card color-${cls.color}`;
  card.dataset.id = cls.id;

  const cornerHtml = cls.archived
    ? `
      <div class="card-menu-actions">
        <button class="card-menu-btn" data-card-menu-btn>⋮</button>
        <div class="card-menu-dropdown" data-card-menu-dropdown>
          <button data-restore-btn>Restore</button>
          <button class="danger" data-delete-btn> Delete</button>
        </div>
      </div>
    `
    : `<div class="card-icon"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>`;

  card.innerHTML = `
    ${cornerHtml}
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

  if (cls.archived) {
    const menuBtn = card.querySelector("[data-card-menu-btn]");
    const dropdown = card.querySelector("[data-card-menu-dropdown]");

    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains("active");
      closeAllCardMenus();
      if (!isOpen) dropdown.classList.add("active");
    });

    card.querySelector("[data-restore-btn]").addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllCardMenus();
      restoreClassFromCard(cls);
    });

    card.querySelector("[data-delete-btn]").addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllCardMenus();
      openDeleteClassModal(cls);
    });
  }

  subjectGrid.appendChild(card);
}

function openClassDetail(classId) {
  const cls = classes.find((c) => c.id === classId);
  if (!cls) return;
  activeClassId = classId;

  detailSubjectName.textContent = cls.subject;
  detailSectionName.textContent = cls.section || "No section set";
  detailClassCode.textContent = cls.code;
applyClassBannerColor(cls.color);
  archiveClassBtn.textContent = cls.archived ? "Restore class" : "Archive class";
  createAttendanceBtn.style.display = cls.archived ? "none" : "inline-block";
  archivedHint.style.display = cls.archived ? "block" : "none";
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  document.querySelector('.tab-btn[data-tab="attendance"]').classList.add("active");
  document.querySelectorAll(".tab-content").forEach((t) => t.classList.remove("active"));
  document.getElementById("attendanceTab").classList.add("active");

  renderAttendanceForActiveClass();
  renderMembersForActiveClass();

  appShell.style.display = "none";
  detailPage.classList.add("active");
}

async function renderMembersForActiveClass() {
  if (!activeClassId) return;

  
  if (currentTeacher) {
    teacherMemberName.textContent = currentTeacher.firstName || currentTeacher.email;
    teacherMemberEmail.textContent = currentTeacher.email;
  }

  try {
    const res = await fetch(`/api/classes/${activeClassId}/members`, { credentials: "include" });
    const data = await res.json();
    if (!data.success) return;

    if (data.teacher) {
      teacherMemberName.textContent = data.teacher.first_name;
      teacherMemberEmail.textContent = data.teacher.email;
    }

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
        <button class="btn btn-outline remove-member-btn" data-remove-student="${s.id}">Remove</button>
      `;
      row.querySelector("[data-remove-student]").addEventListener("click", () => {
        openRemoveMemberModal(s);
      });
      membersList.appendChild(row);
    });
  } catch (err) {
    console.error("Failed to load members:", err);
  }
}

let pendingRemoveStudent = null;

function openRemoveMemberModal(student) {
  pendingRemoveStudent = student;
  document.getElementById("removeMemberName").textContent = `${student.first_name} ${student.last_name}`;
  document.getElementById("removeMemberError").textContent = "";
  openModal("removeMemberModal");
}

document.getElementById("confirmRemoveMemberBtn").addEventListener("click", async () => {
  if (!pendingRemoveStudent || !activeClassId) return;

  const btn = document.getElementById("confirmRemoveMemberBtn");
  const errorEl = document.getElementById("removeMemberError");
  errorEl.textContent = "";
  btn.disabled = true;
  btn.textContent = "Removing…";

  try {
    const res = await fetch(`/api/classes/${activeClassId}/students/${pendingRemoveStudent.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();

    if (!data.success) {
      errorEl.textContent = data.generalError || "Could not remove student. Please try again.";
      return;
    }

    const removedName = `${pendingRemoveStudent.first_name} ${pendingRemoveStudent.last_name}`;
    closeModal("removeMemberModal");
    showToast(`Removed ${removedName} from the class. Their attendance records were kept.`, "success");
    await renderMembersForActiveClass();
  } catch (err) {
    console.error("Remove student error:", err);
    errorEl.textContent = "Something went wrong. Please try again.";
  } finally {
    btn.disabled = false;
    btn.textContent = "Remove student";
    pendingRemoveStudent = null;
  }
});

function backToClasses() {
  detailPage.classList.remove("active");
  appShell.style.display = "flex";
  activeClassId = null;
}

async function renderAttendanceForActiveClass() {
  if (!activeClassId) return;
  try {
    const res = await fetch(`/api/classes/${activeClassId}/sessions`, { credentials: "include" });
    const data = await res.json();
    if (!data.success) return;

    const sessions = data.sessions || [];
    attendanceSessions[activeClassId] = sessions;

    sessionList.innerHTML = "";
    attendanceEmptyState.classList.toggle("active", sessions.length === 0);
    sessionCountText.textContent = `${sessions.length} session${sessions.length === 1 ? "" : "s"} recorded`;

    sessions.forEach((s) => {
      const item = document.createElement("div");
      item.className = "session-card";
      item.innerHTML = `
        <div style="cursor:pointer;">
          <div class="session-date">${s.session_date}</div>
          <div class="session-time">${formatTimeString12hr(s.start_time)} – ${formatTimeString12hr(s.end_time)} · Late after ${formatTimeString12hr(s.late_after)}</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button class="btn btn-outline" data-qr-btn>QR</button>
          <div class="session-card-actions">
            <button class="session-menu-btn" data-menu-btn>⋮</button>
            <div class="session-menu-dropdown" data-menu-dropdown>
              <button data-download-btn>Download</button>
              <button class="danger" data-delete-btn>Delete</button>
            </div>
          </div>
        </div>
      `;
      item.querySelector("div").addEventListener("click", () => openSessionRecords(s));
      item.querySelector("[data-qr-btn]").addEventListener("click", (e) => {
        e.stopPropagation();
        openSessionQr(s);
      });

      const menuBtn = item.querySelector("[data-menu-btn]");
      const dropdown = item.querySelector("[data-menu-dropdown]");
      menuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains("active");
        closeAllSessionMenus();
        if (!isOpen) dropdown.classList.add("active");
      });

      item.querySelector("[data-download-btn]").addEventListener("click", (e) => {
        e.stopPropagation();
        closeAllSessionMenus();
        downloadSession(s);
      });

      item.querySelector("[data-delete-btn]").addEventListener("click", (e) => {
        e.stopPropagation();
        closeAllSessionMenus();
        deleteSession(s);
      });

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

  await loadSessionRecordsIntoModal(session);
}

async function loadSessionRecordsIntoModal(session) {
  const body = document.getElementById("viewSessionBody");

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
      <tr data-student-id="${r.student_id}">
        <td>${escapeHtml(r.first_name)} ${escapeHtml(r.last_name)}</td>
        <td>${r.time_in ? formatTimeString12hr(r.time_in) : "—"}</td>
        <td>${r.status || "Not yet"}</td>
        <td style="white-space:nowrap;">
          <button class="btn btn-outline" style="padding:4px 10px; font-size:0.75rem;" data-mark-btn data-status="Present">Present</button>
          <button class="btn btn-outline" style="padding:4px 10px; font-size:0.75rem;" data-mark-btn data-status="Late">Late</button>
          <button class="btn btn-outline" style="padding:4px 10px; font-size:0.75rem;" data-mark-btn data-status="Absent">Absent</button>
        </td>
      </tr>
    `).join("");

    body.innerHTML = `
    <p class="hint-text" style="margin-bottom:10px;">Student has no internet or couldn't scan the QR code? Mark their attendance manually using the buttons below.</p>
      <table class="records-table">
        <thead>
          <tr><th>Name</th><th>Time</th><th>Status</th><th>Mark</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    body.querySelectorAll("[data-mark-btn]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const row = btn.closest("tr");
        const studentId = row.dataset.studentId;
        const status = btn.dataset.status;

        body.querySelectorAll("[data-mark-btn]").forEach((b) => (b.disabled = true));

        try {
          const markRes = await fetch(`/api/sessions/${session.id}/manual-attend`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ studentId, status }),
          });
          const markData = await markRes.json();

          if (!markData.success) {
            showToast(markData.generalError || "Could not mark attendance.", "error");
            return;
          }

          showToast(`Marked as ${status}.`, "success");
          await loadSessionRecordsIntoModal(session);
          await renderAttendanceForActiveClass();
        } catch (err) {
          console.error("Manual mark error:", err);
          showToast("Something went wrong. Please try again.", "error");
        } finally {
          body.querySelectorAll("[data-mark-btn]").forEach((b) => (b.disabled = false));
        }
      });
    });
  } catch (err) {
    console.error("Failed to load session records:", err);
    body.innerHTML = "<p class='muted-text'>Something went wrong.</p>";
  }
}

const toastStack = document.getElementById("toastStack");

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const iconSvg = type === "success"
    ? `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  toast.innerHTML = `
    <span class="toast-icon">${iconSvg}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" aria-label="Dismiss">
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;

  let dismissTimer = null;

  function dismiss() {
    if (dismissTimer) clearTimeout(dismissTimer);
    toast.classList.remove("toast-visible");
    toast.classList.add("toast-exit");
    setTimeout(() => toast.remove(), 200);
  }

  toast.querySelector(".toast-close").addEventListener("click", dismiss);
  toastStack.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("toast-visible"));
  dismissTimer = setTimeout(dismiss, 4500);
}

function closeAllSessionMenus() {
  document.querySelectorAll(".session-menu-dropdown.active").forEach((d) => d.classList.remove("active"));
}
document.addEventListener("click", closeAllSessionMenus);

function closeAllCardMenus() {
  document.querySelectorAll(".card-menu-dropdown.active").forEach((d) => d.classList.remove("active"));
}
document.addEventListener("click", closeAllCardMenus);

archiveClassBtn.addEventListener("click", async () => {
  const cls = classes.find((c) => c.id === activeClassId);
  if (!cls) return;

  const nextArchived = !cls.archived;
  archiveClassBtn.disabled = true;

  try {
    const res = await fetch(`/api/classes/${cls.id}/archive`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ archived: nextArchived }),
    });
    const data = await res.json();

    if (!data.success) {
      showToast(data.generalError || "Could not update this class. Please try again.", "error");
      return;
    }

    cls.archived = nextArchived;
    archiveClassBtn.textContent = cls.archived ? "Restore class" : "Archive class";
    backToClasses();
    renderAllCards();
    updateClassSummary();
  } catch (err) {
    console.error("Archive class error:", err);
    showToast("Something went wrong. Please try again.", "error");
  } finally {
    archiveClassBtn.disabled = false;
  }
});

async function restoreClassFromCard(cls) {
  try {
    const res = await fetch(`/api/classes/${cls.id}/archive`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ archived: false }),
    });
    const data = await res.json();
    if (!data.success) return;

    cls.archived = false;
    renderAllCards();
    updateClassSummary();
  } catch (err) {
    console.error("Restore class error:", err);
  }
}

function openDeleteClassModal(cls) {
  activeClassId = cls.id;
  document.getElementById("deleteClassSubject").textContent = cls.subject;
  document.getElementById("deleteClassError").textContent = "";
  openModal("deleteClassModal");
}

function downloadSession(session) {
  window.open(`/api/sessions/${session.id}/download`, "_blank");
}

let pendingDeleteSession = null;

function deleteSession(session) {
  pendingDeleteSession = session;
  document.getElementById("deleteSessionDate").textContent = session.session_date;
  openModal("deleteSessionModal");
}

document.getElementById("confirmDeleteSessionBtn").addEventListener("click", async () => {
  if (!pendingDeleteSession) return;
  const session = pendingDeleteSession;
  const btn = document.getElementById("confirmDeleteSessionBtn");
  btn.disabled = true;
  btn.textContent = "Deleting…";

  try {
    const res = await fetch(`/api/sessions/${session.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();

    if (!data.success) {
      showToast(data.generalError || "Could not delete session. Please try again.", "error");
      return;
    }

    closeModal("deleteSessionModal");
    showToast(`Deleted the attendance session for ${session.session_date}.`, "success");
    await renderAttendanceForActiveClass();
  } catch (err) {
    console.error("Delete session error:", err);
    showToast("Something went wrong. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Delete session";
    pendingDeleteSession = null;
  }
});

function openSessionQr(session) {
  qrSessionDate.textContent = session.session_date;
  qrSessionTimeRange.textContent =
    `${formatTimeString12hr(session.start_time)} – ${formatTimeString12hr(session.end_time)} · Late after ${formatTimeString12hr(session.late_after)}`;

  qrCodeContainer.innerHTML = "";
  new QRCode(qrCodeContainer, {
    text: session.attendance_code,
    width: 220,
    height: 220,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });

  openModal("sessionQrModal");
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
      }));
      classes.forEach((c) => {
        if (!attendanceSessions[c.id]) attendanceSessions[c.id] = [];
      });
      renderAllCards();
      updateClassSummary();
    }
  } catch (err) {
    console.error("Failed to load classes:", err);
  }
}

async function fetchCurrentTeacher() {
  try {
    const res = await fetch("/api/me", { credentials: "include" });
    const data = await res.json();
    if (data.success && data.user.role === "teacher") {
      currentTeacher = { firstName: data.user.firstName, email: data.user.email };
    }
  } catch (err) {
    console.error("Failed to load current teacher:", err);
  }
}

function resetCreateClassForm() {
  subjectNameInput.value = "";
  sectionGradeInput.value = "";
  classCodeInput.value = "";
  classCodeInput.placeholder = "Enter a subject name first";
  selectedColor = "blue";
  document.querySelectorAll(".color-swatch").forEach((sw) => sw.classList.remove("selected"));
  document.querySelector('.color-swatch[data-color="blue"]').classList.add("selected");
}


subjectNameInput.addEventListener("input", () => {
  const name = subjectNameInput.value.trim();
  classCodeInput.value = name ? "Will be generated on save" : "";
  classCodeInput.placeholder = name ? "" : "Enter a subject name first";
});

colorPicker.addEventListener("click", (e) => {
  const swatch = e.target.closest(".color-swatch");
  if (!swatch) return;
  document.querySelectorAll(".color-swatch").forEach((sw) => sw.classList.remove("selected"));
  swatch.classList.add("selected");
  selectedColor = swatch.dataset.color;
});

document.getElementById("submitCreateClass").addEventListener("click", async () => {
  const subject = subjectNameInput.value.trim();
  if (!subject) {
    subjectNameInput.focus();
    subjectNameInput.style.borderColor = "#dc2626";
    return;
  }
  subjectNameInput.style.borderColor = "";

  const submitBtn = document.getElementById("submitCreateClass");
  submitBtn.disabled = true;
  submitBtn.textContent = "Creating…";

  try {
    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        subjectName: subject,
        section: sectionGradeInput.value.trim(),
        color: selectedColor,
      }),
    });
    const data = await res.json();

    if (!data.success) {
      alert(data.generalError || "Could not create class. Please try again.");
      return;
    }

    const newClass = {
      id: data.class.id,
      subject: data.class.subject_name,
      section: data.class.section,
      code: data.class.class_code,
      color: data.class.color,
      archived: false,
    };

    classes.push(newClass);
    attendanceSessions[newClass.id] = [];
    if (classFilter === "active") renderSubjectCard(newClass);
    updateClassSummary();
    closeModal("createClassModal");
    resetCreateClassForm();
  } catch (err) {
    console.error("Create class error:", err);
    alert("Something went wrong. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Create";
  }
});



document.getElementById("createAttendanceBtn").addEventListener("click", () => {
  const cls = classes.find((c) => c.id === activeClassId);
  if (!cls) return;
  attendanceModalSubject.textContent = cls.subject;
  attendanceModalSection.textContent = cls.section || "No section set";

  const now = getPHNow();
  document.getElementById("attendanceDate").value = toDateInputValue(now);
  document.getElementById("classStart").value = toTimeInputValue(now);

  const defaultEnd = new Date(now.getTime() + 90 * 60000);
  document.getElementById("classEnd").value = toTimeInputValue(defaultEnd);

  const defaultLate = new Date(now.getTime() + 10 * 60000); 
  lateAfterInput.value = toTimeInputValue(defaultLate);
  lateAfterPreview.textContent = formatTimeString12hr(toTimeInputValue(defaultLate));

  openModal("createAttendanceModal");
  startLiveClock();
});

lateAfterInput.addEventListener("input", () => {
  lateAfterPreview.textContent = formatTimeString12hr(lateAfterInput.value);
});

document.getElementById("submitCreateAttendance").addEventListener("click", async () => {
  if (!activeClassId) return;

  const sessionDate = document.getElementById("attendanceDate").value;
  const startTime = document.getElementById("classStart").value;
  const endTime = document.getElementById("classEnd").value;
  const lateAfter = lateAfterInput.value;

  if (!sessionDate || !startTime || !endTime || !lateAfter) {
    alert("Please fill out all fields.");
    return;
  }

  const submitBtn = document.getElementById("submitCreateAttendance");
  submitBtn.disabled = true;
  submitBtn.textContent = "Opening…";

  try {
    const res = await fetch(`/api/classes/${activeClassId}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ sessionDate, startTime, endTime, lateAfter }),
    });
    const data = await res.json();

    if (!data.success) {
      alert(data.generalError || "Could not open attendance. Please try again.");
      return;
    }

  await renderAttendanceForActiveClass();
    renderAllCards();
    closeModal("createAttendanceModal");
    openSessionQr(data.session);
  } catch (err) {
    console.error("Create attendance error:", err);
    alert("Something went wrong. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Open Attendance ›";
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

document.getElementById("createClassBtn").addEventListener("click", () => openModal("createClassModal"));
document.getElementById("sidebarToggleBtn").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("collapsed");
});
document.getElementById("emptyCreateBtn").addEventListener("click", () => openModal("createClassModal"));

document.getElementById("backToClasses").addEventListener("click", backToClasses);

document.querySelectorAll(".sidebar-link[data-filter]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".sidebar-link[data-filter]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    classFilter = btn.dataset.filter;
    document.getElementById("sectionHeading").textContent =
      classFilter === "archived" ? "Archived Subjects" : "My Subjects";

    archiveSearchInput.style.display = classFilter === "archived" ? "block" : "none";
    if (classFilter !== "archived") {
      archiveSearchQuery = "";
      archiveSearchInput.value = "";
    }

    renderAllCards();
    updateClassSummary();
  });
});

archiveSearchInput.addEventListener("input", () => {
  archiveSearchQuery = archiveSearchInput.value;
  renderAllCards();
});


document.getElementById("confirmDeleteClassBtn").addEventListener("click", async () => {
  const cls = classes.find((c) => c.id === activeClassId);
  if (!cls) return;

  const btn = document.getElementById("confirmDeleteClassBtn");
  const errorEl = document.getElementById("deleteClassError");
  errorEl.textContent = "";
  btn.disabled = true;
  btn.textContent = "Deleting…";

  try {
    const res = await fetch(`/api/classes/${cls.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();

    if (!data.success) {
      errorEl.textContent = data.generalError || "Could not delete this class.";
      return;
    }

    classes = classes.filter((c) => c.id !== cls.id);
    closeModal("deleteClassModal");
    backToClasses();
    renderAllCards();
    updateClassSummary();
    showToast(`Deleted ${cls.subject}.`, "success");
  } catch (err) {
    console.error("Delete class error:", err);
    errorEl.textContent = "Something went wrong. Please try again.";
  } finally {
    btn.disabled = false;
    btn.textContent = "Delete class";
  }
});

document.querySelectorAll("[data-close]").forEach((el) => {
  el.addEventListener("click", () => closeModal(el.dataset.close));
});

document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});


const aiChatLog = document.getElementById("aiChatLog");
const aiChatInput = document.getElementById("aiChatInput");
const aiChatError = document.getElementById("aiChatError");
const aiChatSendBtn = document.getElementById("aiChatSendBtn");
let aiHistoryLoaded = false;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function cleanAiText(text) {
  return text
    .split("\n")
    .filter((line) => !/^[\s|:\-]+$/.test(line))  
    .map((line) => {
      let l = line;
      if (l.trim().startsWith("|")) {
        l = l.trim().replace(/^\|/, "").replace(/\|$/, "");
        l = l.split("|").map((cell) => cell.trim()).filter(Boolean).join(", ");
      }
      return l;
    })
    .join("\n")
    .replace(/^#{1,6}\s*/gm, "")   
    .replace(/^>\s?/gm, "")     
    .replace(/`{1,3}([^`]*)`{1,3}/g, "$1") 
    .replace(/\|/g, "")          
    .replace(/\n{3,}/g, "\n\n")  
}

function renderAiMessageHtml(text) {
  const cleaned = cleanAiText(text);
  const escaped = escapeHtml(cleaned);
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return withBold.replace(/\n/g, "<br>");
}

function appendAiMessage(role, text) {
  const bubble = document.createElement("div");
  bubble.className = `ai-msg ai-msg-${role}`;
  if (role === "assistant") {
    bubble.innerHTML = renderAiMessageHtml(text);
  } else {
    bubble.textContent = text;
  }
  aiChatLog.appendChild(bubble);
  aiChatLog.scrollTop = aiChatLog.scrollHeight;
  return bubble;
}

async function loadAiHistory() {
  if (aiHistoryLoaded) return;
  try {
    const res = await fetch("/api/ai/history", { credentials: "include" });
    const data = await res.json();
    if (!data.success) return;

    data.messages.forEach((m) => appendAiMessage(m.role, m.content));
    aiHistoryLoaded = true;
  } catch (err) {
    console.error("Failed to load AI history:", err);
  }
}

async function sendAiQuestion() {
  const question = aiChatInput.value.trim();
  aiChatError.textContent = "";
  if (!question) return;

  appendAiMessage("user", question);
  aiChatInput.value = "";
  aiChatSendBtn.disabled = true;
  const thinkingBubble = appendAiMessage("assistant", "Thinking…");

  try {
    const res = await fetch("/api/ai/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ question }),
    });
    const data = await res.json();

    if (!data.success) {
      thinkingBubble.remove();
      appendAiMessage("error", data.generalError || "The AI assistant could not respond right now.");
      return;
    }

    thinkingBubble.innerHTML = renderAiMessageHtml(data.answer);
  } catch (err) {
    console.error("AI ask error:", err);
    thinkingBubble.remove();
    appendAiMessage("error", "Something went wrong. Please try again.");
  } finally {
    aiChatSendBtn.disabled = false;
  }
}

document.getElementById("aiAssistantBtn").addEventListener("click", () => {
  openModal("aiAssistantModal");
  loadAiHistory();
});

aiChatSendBtn.addEventListener("click", sendAiQuestion);
aiChatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendAiQuestion();
});

document.getElementById("aiChatClearBtn").addEventListener("click", async () => {
  if (!confirm("Clear your AI assistant conversation history? This cannot be undone.")) return;
  try {
    const res = await fetch("/api/ai/clear", { method: "POST", credentials: "include" });
    const data = await res.json();
    if (data.success) {
      aiChatLog.innerHTML = "";
      aiHistoryLoaded = false;
      appendAiMessage(
        "assistant",
        "History cleared. Ask me about attendance in your own classes — for example, \"Who was absent in Mathematics?\""
      );
      aiHistoryLoaded = true;
    }
  } catch (err) {
    console.error("Failed to clear AI history:", err);
  }
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

fetchCurrentTeacher();
loadClasses();