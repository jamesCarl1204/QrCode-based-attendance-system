let allStudents = [];
let allTeachers = [];
let allClasses = [];

let studentsFilter = "";
let studentsSort = { field: "name", dir: "asc" };
let studentsPage = 1;
const ROWS_PER_PAGE = 10;

let teachersFilter = "";
let teachersSort = { field: "name", dir: "asc" };
let teachersPage = 1;

let classesFilter = "";
let archivedClassesFilter = "";

let pendingDeleteStudentId = null;
let pendingDeleteTeacherId = null;
let currentDetailClassId = null;
let pendingDeleteClassId = null;

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function openModal(id) {
  document.getElementById(id).classList.add("active");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("active");
}

document.querySelectorAll("[data-close]").forEach((el) => {
  el.addEventListener("click", () => closeModal(el.dataset.close));
});
document.querySelectorAll(".modal-overlay").forEach((overlay) => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

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

function formatTimeString12hr(timeStr) {
  if (!timeStr) return "";
  const [hStr, mStr] = timeStr.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${ampm}`;
}

document.querySelectorAll(".sidebar-link[data-tab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".sidebar-link[data-tab]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("active"));
    document.getElementById(`${btn.dataset.tab}Tab`).classList.add("active");
  });
});

async function loadStudents() {
  try {
    const res = await fetch("/api/admin/students", { credentials: "include" });
    const data = await res.json();
    if (!data.success) return;
    allStudents = data.students.map((s) => ({
      id: s.id,
      studentIdNumber: s.student_id_number,
      name: `${s.first_name} ${s.last_name}`,
      firstName: s.first_name,
      middleName: s.middle_name,
      lastName: s.last_name,
      email: s.email,
      parentEmail: s.parent_email,
      createdAt: s.created_at,
    }));
    studentsPage = 1;
    renderStudentsTable();
  } catch (err) {
    console.error("Failed to load students:", err);
  }
}

function renderStudentsTable() {
  let rows = allStudents.filter((s) => {
    if (!studentsFilter.trim()) return true;
    const q = studentsFilter.trim().toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.studentIdNumber || "").toLowerCase().includes(q);
  });

  rows.sort((a, b) => {
    const av = (a[studentsSort.field] || "").toString().toLowerCase();
    const bv = (b[studentsSort.field] || "").toString().toLowerCase();
    if (av < bv) return studentsSort.dir === "asc" ? -1 : 1;
    if (av > bv) return studentsSort.dir === "asc" ? 1 : -1;
    return 0;
  });

  document.getElementById("studentsCountText").textContent =
    `${allStudents.length} registered student${allStudents.length === 1 ? "" : "s"}`;

  const totalPages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  if (studentsPage > totalPages) studentsPage = totalPages;
  const start = (studentsPage - 1) * ROWS_PER_PAGE;
  const pageRows = rows.slice(start, start + ROWS_PER_PAGE);

  const tbody = document.getElementById("studentsTableBody");
  tbody.innerHTML = "";

  if (pageRows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="muted-text" style="padding:20px;">No students found.</td></tr>`;
  }

  pageRows.forEach((s) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.studentIdNumber || "—")}</td>
      <td>${escapeHtml(s.email)}</td>
      <td>${escapeHtml(s.parentEmail || "—")}</td>
      <td>
        <div class="table-actions">
          <button class="table-action-btn" data-view-student="${s.id}">View</button>
          <button class="table-action-btn danger" data-delete-student="${s.id}">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-view-student]").forEach((btn) => {
    btn.addEventListener("click", () => openViewStudent(Number(btn.dataset.viewStudent)));
  });
  tbody.querySelectorAll("[data-delete-student]").forEach((btn) => {
    btn.addEventListener("click", () => openDeleteStudent(Number(btn.dataset.deleteStudent)));
  });

  document.getElementById("studentsPaginationInfo").textContent =
    rows.length === 0 ? "0 results" : `Page ${studentsPage} of ${totalPages} · ${rows.length} result${rows.length === 1 ? "" : "s"}`;
  document.getElementById("studentsPrevBtn").disabled = studentsPage <= 1;
  document.getElementById("studentsNextBtn").disabled = studentsPage >= totalPages;
}

document.getElementById("studentsSearchInput").addEventListener("input", (e) => {
  studentsFilter = e.target.value;
  studentsPage = 1;
  renderStudentsTable();
});
document.getElementById("studentsPrevBtn").addEventListener("click", () => {
  studentsPage = Math.max(1, studentsPage - 1);
  renderStudentsTable();
});
document.getElementById("studentsNextBtn").addEventListener("click", () => {
  studentsPage += 1;
  renderStudentsTable();
});
document.querySelectorAll('#studentsTab th[data-sort]').forEach((th) => {
  th.addEventListener("click", () => {
    const field = th.dataset.sort;
    if (studentsSort.field === field) {
      studentsSort.dir = studentsSort.dir === "asc" ? "desc" : "asc";
    } else {
      studentsSort = { field, dir: "asc" };
    }
    renderStudentsTable();
  });
});

function openViewStudent(id) {
  const s = allStudents.find((x) => x.id === id);
  if (!s) return;
  document.getElementById("viewStudentName").textContent = s.name;
  document.getElementById("viewStudentBody").innerHTML = `
    <p style="margin-bottom:10px;"><strong>Student ID:</strong> ${escapeHtml(s.studentIdNumber || "—")}</p>
    <p style="margin-bottom:10px;"><strong>Email:</strong> ${escapeHtml(s.email)}</p>
    <p style="margin-bottom:10px;"><strong>Parent's Email:</strong> ${escapeHtml(s.parentEmail || "—")}</p>
    <p><strong>Registered:</strong> ${escapeHtml(s.createdAt || "—")}</p>
  `;
  openModal("viewStudentModal");
}

function openDeleteStudent(id) {
  const s = allStudents.find((x) => x.id === id);
  if (!s) return;
  pendingDeleteStudentId = id;
  document.getElementById("deleteStudentName").textContent = s.name;
  openModal("deleteStudentModal");
}

document.getElementById("confirmDeleteStudentBtn").addEventListener("click", async () => {
  if (!pendingDeleteStudentId) return;
  const btn = document.getElementById("confirmDeleteStudentBtn");
  btn.disabled = true;
  btn.textContent = "Deleting…";
  try {
    const res = await fetch(`/api/admin/students/${pendingDeleteStudentId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();
    if (!data.success) {
      showToast(data.generalError || "Could not delete student.", "error");
      return;
    }
    closeModal("deleteStudentModal");
    await loadStudents();
  } catch (err) {
    console.error("Delete student error:", err);
    showToast("Something went wrong. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Delete student";
    pendingDeleteStudentId = null;
  }
});

async function loadTeachers() {
  try {
    const res = await fetch("/api/admin/teachers", { credentials: "include" });
    const data = await res.json();
    if (!data.success) return;
    allTeachers = data.teachers.map((t) => ({
      id: t.id,
      teacherIdNumber: t.teacher_id_number,
      name: `${t.first_name} ${t.last_name}`,
      firstName: t.first_name,
      middleName: t.middle_name,
      lastName: t.last_name,
      email: t.email,
      createdAt: t.created_at,
    }));
    teachersPage = 1;
    renderTeachersTable();
  } catch (err) {
    console.error("Failed to load teachers:", err);
  }
}

function renderTeachersTable() {
  let rows = allTeachers.filter((t) => {
    if (!teachersFilter.trim()) return true;
    const q = teachersFilter.trim().toLowerCase();
    return t.name.toLowerCase().includes(q) || (t.teacherIdNumber || "").toLowerCase().includes(q);
  });

  rows.sort((a, b) => {
    const av = (a[teachersSort.field] || "").toString().toLowerCase();
    const bv = (b[teachersSort.field] || "").toString().toLowerCase();
    if (av < bv) return teachersSort.dir === "asc" ? -1 : 1;
    if (av > bv) return teachersSort.dir === "asc" ? 1 : -1;
    return 0;
  });

  document.getElementById("teachersCountText").textContent =
    `${allTeachers.length} registered teacher${allTeachers.length === 1 ? "" : "s"}`;

  const totalPages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  if (teachersPage > totalPages) teachersPage = totalPages;
  const start = (teachersPage - 1) * ROWS_PER_PAGE;
  const pageRows = rows.slice(start, start + ROWS_PER_PAGE);

  const tbody = document.getElementById("teachersTableBody");
  tbody.innerHTML = "";

  if (pageRows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="muted-text" style="padding:20px;">No teachers found.</td></tr>`;
  }

  pageRows.forEach((t) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(t.name)}</td>
      <td>${escapeHtml(t.teacherIdNumber || "—")}</td>
      <td>${escapeHtml(t.email)}</td>
      <td>
        <div class="table-actions">
          <button class="table-action-btn" data-view-teacher="${t.id}">View</button>
          <button class="table-action-btn danger" data-delete-teacher="${t.id}">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-view-teacher]").forEach((btn) => {
    btn.addEventListener("click", () => openViewTeacher(Number(btn.dataset.viewTeacher)));
  });
  tbody.querySelectorAll("[data-delete-teacher]").forEach((btn) => {
    btn.addEventListener("click", () => openDeleteTeacher(Number(btn.dataset.deleteTeacher)));
  });

  document.getElementById("teachersPaginationInfo").textContent =
    rows.length === 0 ? "0 results" : `Page ${teachersPage} of ${totalPages} · ${rows.length} result${rows.length === 1 ? "" : "s"}`;
  document.getElementById("teachersPrevBtn").disabled = teachersPage <= 1;
  document.getElementById("teachersNextBtn").disabled = teachersPage >= totalPages;
}

document.getElementById("teachersSearchInput").addEventListener("input", (e) => {
  teachersFilter = e.target.value;
  teachersPage = 1;
  renderTeachersTable();
});
document.getElementById("teachersPrevBtn").addEventListener("click", () => {
  teachersPage = Math.max(1, teachersPage - 1);
  renderTeachersTable();
});
document.getElementById("teachersNextBtn").addEventListener("click", () => {
  teachersPage += 1;
  renderTeachersTable();
});
document.querySelectorAll('#teachersTab th[data-sort]').forEach((th) => {
  th.addEventListener("click", () => {
    const field = th.dataset.sort;
    if (teachersSort.field === field) {
      teachersSort.dir = teachersSort.dir === "asc" ? "desc" : "asc";
    } else {
      teachersSort = { field, dir: "asc" };
    }
    renderTeachersTable();
  });
});

function openViewTeacher(id) {
  const t = allTeachers.find((x) => x.id === id);
  if (!t) return;
  document.getElementById("viewTeacherName").textContent = t.name;
  document.getElementById("viewTeacherBody").innerHTML = `
    <p style="margin-bottom:10px;"><strong>Teacher ID:</strong> ${escapeHtml(t.teacherIdNumber || "—")}</p>
    <p style="margin-bottom:10px;"><strong>Email:</strong> ${escapeHtml(t.email)}</p>
    <p><strong>Registered:</strong> ${escapeHtml(t.createdAt || "—")}</p>
  `;
  openModal("viewTeacherModal");
}

function openDeleteTeacher(id) {
  const t = allTeachers.find((x) => x.id === id);
  if (!t) return;
  pendingDeleteTeacherId = id;
  document.getElementById("deleteTeacherName").textContent = t.name;
  openModal("deleteTeacherModal");
}

document.getElementById("confirmDeleteTeacherBtn").addEventListener("click", async () => {
  if (!pendingDeleteTeacherId) return;
  const btn = document.getElementById("confirmDeleteTeacherBtn");
  btn.disabled = true;
  btn.textContent = "Deleting…";
  try {
    const res = await fetch(`/api/admin/teachers/${pendingDeleteTeacherId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();
    if (!data.success) {
      showToast(data.generalError || "Could not delete teacher.", "error");
      return;
    }
    closeModal("deleteTeacherModal");
    await loadTeachers();
  } catch (err) {
    console.error("Delete teacher error:", err);
    showToast("Something went wrong. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Delete teacher";
    pendingDeleteTeacherId = null;
  }
});

async function loadClasses() {
  try {
    const res = await fetch("/api/admin/classes", { credentials: "include" });
    const data = await res.json();
    if (!data.success) return;
    allClasses = data.classes;
    renderClassesGrid();
    renderArchivedClassesGrid();
  } catch (err) {
    console.error("Failed to load classes:", err);
  }
}

function renderClassesGrid() {
  const activeClasses = allClasses.filter((c) => !c.archived);
  const rows = activeClasses.filter((c) => {
    if (!classesFilter.trim()) return true;
    const q = classesFilter.trim().toLowerCase();
    return (
      c.subject_name.toLowerCase().includes(q) ||
      (c.section || "").toLowerCase().includes(q) ||
      `${c.teacher_first_name} ${c.teacher_last_name}`.toLowerCase().includes(q)
    );
  });

  document.getElementById("classesCountText").textContent =
    `${activeClasses.length} class${activeClasses.length === 1 ? "" : "es"} created`;

  const grid = document.getElementById("classesGrid");
  grid.innerHTML = "";

  if (rows.length === 0) {
    grid.innerHTML = `<p class="muted-text">No classes found.</p>`;
    return;
  }

  rows.forEach((c) => {
    const card = document.createElement("div");
    card.className = `subject-card color-${c.color}`;
    card.innerHTML = `
      <div class="card-icon"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
      <div>
        <h3>${escapeHtml(c.subject_name)}</h3>
        <p class="section-label">${escapeHtml(c.section || "No section set")}${c.archived ? " · Archived" : ""}</p>
        <p class="section-label" style="margin-top:6px;">Teacher: ${escapeHtml(c.teacher_first_name)} ${escapeHtml(c.teacher_last_name)}</p>
      </div>
      <div class="card-footer">
        <div class="card-meta">
          <span>${c.total_students} student${c.total_students === 1 ? "" : "s"}</span>
          <span>${c.total_sessions} session${c.total_sessions === 1 ? "" : "s"}</span>
        </div>
        <a class="open-class-link">View class record <span>›</span></a>
      </div>
    `;
    card.addEventListener("click", () => openClassDetail(c.id));
    grid.appendChild(card);
  });
}

function renderArchivedClassesGrid() {
  const archivedClasses = allClasses.filter((c) => c.archived);
  const rows = archivedClasses.filter((c) => {
    if (!archivedClassesFilter.trim()) return true;
    const q = archivedClassesFilter.trim().toLowerCase();
    return (
      c.subject_name.toLowerCase().includes(q) ||
      (c.section || "").toLowerCase().includes(q) ||
      `${c.teacher_first_name} ${c.teacher_last_name}`.toLowerCase().includes(q)
    );
  });

  document.getElementById("archivedClassesCountText").textContent =
    `${archivedClasses.length} archived class${archivedClasses.length === 1 ? "" : "es"}`;

  const grid = document.getElementById("archivedClassesGrid");
  grid.innerHTML = "";

  if (rows.length === 0) {
    grid.innerHTML = `<p class="muted-text">No archived classes found.</p>`;
    return;
  }

  rows.forEach((c) => {
    const card = document.createElement("div");
    card.className = `subject-card color-${c.color}`;
    card.innerHTML = `
      <div class="card-icon"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
      <div>
        <h3>${escapeHtml(c.subject_name)}</h3>
        <p class="section-label">${escapeHtml(c.section || "No section set")} · Archived</p>
        <p class="section-label" style="margin-top:6px;">Teacher: ${escapeHtml(c.teacher_first_name)} ${escapeHtml(c.teacher_last_name)}</p>
      </div>
      <div class="card-footer">
        <div class="card-meta">
          <span>${c.total_students} student${c.total_students === 1 ? "" : "s"}</span>
          <span>${c.total_sessions} session${c.total_sessions === 1 ? "" : "s"}</span>
        </div>
        <a class="open-class-link">View class record <span>›</span></a>
      </div>
    `;
    card.addEventListener("click", () => openClassDetail(c.id));
    grid.appendChild(card);
  });
}

document.getElementById("classesSearchInput").addEventListener("input", (e) => {
  classesFilter = e.target.value;
  renderClassesGrid();
});

document.getElementById("archivedClassesSearchInput").addEventListener("input", (e) => {
  archivedClassesFilter = e.target.value;
  renderArchivedClassesGrid();
});

async function openClassDetail(classId) {
  currentDetailClassId = classId;
  document.getElementById("classDetailSubject").textContent = "Loading…";
  document.getElementById("classDetailMeta").textContent = "";
  document.getElementById("classDetailBody").innerHTML = "<p class='muted-text'>Loading…</p>";
  openModal("classDetailModal");

  try {
    const res = await fetch(`/api/admin/classes/${classId}`, { credentials: "include" });
    const data = await res.json();
    if (!data.success) {
      document.getElementById("classDetailBody").innerHTML = "<p class='muted-text'>Could not load class.</p>";
      return;
    }

    const cls = data.class;
    document.getElementById("classDetailSubject").textContent = cls.subject_name;
    document.getElementById("classDetailMeta").textContent =
      `${cls.section || "No section set"} · Teacher: ${cls.teacher_first_name} ${cls.teacher_last_name} (${cls.teacher_email}) · Class code: ${cls.class_code}`;

    const totals = data.totals;
    const studentsHtml = data.students.length
      ? data.students.map((s) => `<div class="session-card"><div><div class="session-date">${escapeHtml(s.first_name)} ${escapeHtml(s.last_name)}</div><div class="session-time">${escapeHtml(s.email)}</div></div></div>`).join("")
      : `<p class="muted-text">No students enrolled yet.</p>`;

    const sessionsHtml = data.sessions.length
      ? data.sessions.map((sess, idx) => {
          const recordsRows = sess.records.map((r) => `
            <tr>
              <td>${escapeHtml(r.first_name)} ${escapeHtml(r.last_name)}</td>
              <td>${r.time_in ? formatTimeString12hr(r.time_in) : "—"}</td>
              <td>${r.status || "Not yet"}</td>
            </tr>
          `).join("");
          return `
            <div class="session-accordion">
              <div class="session-accordion-header" data-accordion-toggle="${idx}">
                <div>
                  <div class="session-date">${sess.session_date}</div>
                  <div class="session-time">${formatTimeString12hr(sess.start_time)} – ${formatTimeString12hr(sess.end_time)} · Late after ${formatTimeString12hr(sess.late_after)}</div>
                </div>
                <span class="muted-text">${sess.ended ? "Ended" : "Ongoing"}</span>
              </div>
              <div class="session-accordion-body" id="classSessionBody-${idx}">
                <table class="records-table">
                  <thead><tr><th>Name</th><th>Time</th><th>Status</th></tr></thead>
                  <tbody>${recordsRows}</tbody>
                </table>
              </div>
            </div>
          `;
        }).join("")
      : `<p class="muted-text">No attendance sessions yet.</p>`;

    document.getElementById("classDetailBody").innerHTML = `
      <div class="stat-pill-row">
        <div class="stat-pill"><div class="stat-value">${totals.present}</div><div class="stat-label">Present</div></div>
        <div class="stat-pill"><div class="stat-value">${totals.late}</div><div class="stat-label">Late</div></div>
        <div class="stat-pill"><div class="stat-value">${totals.absent}</div><div class="stat-label">Absent</div></div>
        <div class="stat-pill"><div class="stat-value">${totals.attendanceRatePercent !== null ? totals.attendanceRatePercent + "%" : "—"}</div><div class="stat-label">Attendance Rate</div></div>
      </div>

      <h4 class="section-block-title">Students (${data.students.length})</h4>
      ${studentsHtml}

      <h4 class="section-block-title">Attendance Sessions (${data.sessions.length})</h4>
      ${sessionsHtml}
    `;

    document.querySelectorAll("[data-accordion-toggle]").forEach((header) => {
      header.addEventListener("click", () => {
        const idx = header.dataset.accordionToggle;
        document.getElementById(`classSessionBody-${idx}`).classList.toggle("active");
      });
    });
  } catch (err) {
    console.error("Failed to load class detail:", err);
    document.getElementById("classDetailBody").innerHTML = "<p class='muted-text'>Something went wrong.</p>";
  }
}

document.getElementById("deleteClassFromDetailBtn").addEventListener("click", () => {
  const cls = allClasses.find((c) => c.id === currentDetailClassId);
  if (!cls) return;
  pendingDeleteClassId = cls.id;
  document.getElementById("deleteClassSubject").textContent = cls.subject_name;
  closeModal("classDetailModal");
  openModal("deleteClassModal");
});

document.getElementById("confirmDeleteClassBtn").addEventListener("click", async () => {
  if (!pendingDeleteClassId) return;
  const btn = document.getElementById("confirmDeleteClassBtn");
  btn.disabled = true;
  btn.textContent = "Deleting…";
  try {
    const res = await fetch(`/api/admin/classes/${pendingDeleteClassId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json();
    if (!data.success) {
      showToast(data.generalError || "Could not delete class.", "error");
      return;
    }
    closeModal("deleteClassModal");
    await loadClasses();
  } catch (err) {
    console.error("Delete class error:", err);
    showToast("Something went wrong. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Delete class";
    pendingDeleteClassId = null;
  }
});

document.getElementById("submitCreateTeacher").addEventListener("click", async () => {
  const teacherIdNumber = document.getElementById("ctTeacherId").value.trim();
  const firstName = document.getElementById("ctFirstName").value.trim();
  const middleName = document.getElementById("ctMiddleName").value.trim();
  const lastName = document.getElementById("ctLastName").value.trim();
  const email = document.getElementById("ctEmail").value.trim();
  const password = document.getElementById("ctPassword").value;

  ["ctTeacherIdError", "ctFirstNameError", "ctLastNameError", "ctEmailError", "ctPasswordError"].forEach((id) => {
    document.getElementById(id).textContent = "";
  });

  const btn = document.getElementById("submitCreateTeacher");
  btn.disabled = true;
  btn.textContent = "Creating…";

  try {
    const res = await fetch("/api/admin/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ teacherIdNumber, firstName, middleName, lastName, email, password }),
    });
    const data = await res.json();

    if (!data.success) {
      if (data.errors) {
        const map = {
          teacherIdNumber: "ctTeacherIdError",
          firstName: "ctFirstNameError",
          lastName: "ctLastNameError",
          email: "ctEmailError",
          password: "ctPasswordError",
        };
        Object.keys(data.errors).forEach((key) => {
          const elId = map[key];
          if (elId) document.getElementById(elId).textContent = data.errors[key];
        });
      } else {
        showToast(data.generalError || "Could not create teacher account.", "error");
      }
      return;
    }

   
    document.getElementById("ctTeacherId").value = "";
    document.getElementById("ctFirstName").value = "";
    document.getElementById("ctMiddleName").value = "";
    document.getElementById("ctLastName").value = "";
    document.getElementById("ctEmail").value = "";
    document.getElementById("ctPassword").value = "";
    await loadTeachers();
  } catch (err) {
    console.error("Create teacher error:", err);
    showToast("Something went wrong. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Create Teacher Account";
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
    window.location.href = data.redirect || "/login.html";
  } catch (err) {
    console.error("Logout failed:", err);
    window.location.href = "/login.html";
  } finally {
    btn.disabled = false;
    btn.textContent = "Log out";
  }
});

document.getElementById("sidebarToggleBtn").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("collapsed");
});

const ACTIVITY_ICONS = {
  present: { colorClass: "activity-green", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>` },
  late: { colorClass: "activity-orange", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>` },
  absent: { colorClass: "activity-red", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>` },
  teacher: { colorClass: "activity-blue", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/></svg>` },
  class: { colorClass: "activity-blue", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>` },
  default: { colorClass: "activity-blue", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>` }
};

function getActivityIcon(message) {
  const msg = (message || "").toLowerCase();
  let key = "default";
  if (msg.includes("marked late")) key = "late";
  else if (msg.includes("marked absent")) key = "absent";
  else if (msg.includes("marked present")) key = "present";
  else if (msg.includes("teacher account")) key = "teacher";
  else if (msg.includes("class was created") || msg.includes("class created")) key = "class";
  return { colorClass: ACTIVITY_ICONS[key].colorClass, iconSvg: ACTIVITY_ICONS[key].svg };
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

async function loadDashboard() {
  try {
    const res = await fetch("/api/admin/dashboard", { credentials: "include" });
    const data = await res.json();
    if (!data.success) return;

    document.getElementById("dashStudentsCount").textContent = data.totals.students;
    document.getElementById("dashTeachersCount").textContent = data.totals.teachers;
    document.getElementById("dashOngoingCount").textContent = data.totals.ongoingSessions;
    document.getElementById("dashTodayRate").textContent =
      data.today.attendanceRatePercent !== null ? `${data.today.attendanceRatePercent}%` : "—";

    document.getElementById("dashPresent").textContent = data.today.present;
    document.getElementById("dashLate").textContent = data.today.late;
    document.getElementById("dashAbsent").textContent = data.today.absent;

    const activityEl = document.getElementById("dashActivity");
    activityEl.innerHTML = "";
    if (data.recentActivity.length === 0) {
      activityEl.innerHTML = `<p class="muted-text">No recent activity yet.</p>`;
    } else {
      data.recentActivity.forEach((item) => {
        const div = document.createElement("div");
        div.className = "dash-activity-item";
        const { colorClass, iconSvg } = getActivityIcon(item.message);
        div.innerHTML = `
          <span class="dash-activity-icon ${colorClass}">${iconSvg}</span>
          <span>${escapeHtml(item.message)}</span>
          <span class="dash-activity-time">${timeAgo(item.at)}</span>`;
        activityEl.appendChild(div);
      });
    }

    document.getElementById("dashboardUpdatedText").innerHTML =
      `<span class="live-dot"></span>Live overview · updated ${new Date().toLocaleTimeString()}`;
  } catch (err) {
    console.error("Failed to load dashboard:", err);
  }
}

let dashboardPollInterval = null;
function startDashboardPolling() {
  loadDashboard();
  if (dashboardPollInterval) clearInterval(dashboardPollInterval);
  dashboardPollInterval = setInterval(loadDashboard, 15000);
}

document.querySelectorAll("[data-quick-tab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.quickTab;
    document.querySelectorAll(".sidebar-link[data-tab]").forEach((b) => b.classList.remove("active"));
    document.querySelector(`.sidebar-link[data-tab="${tab}"]`).classList.add("active");
    document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("active"));
    document.getElementById(`${tab}Tab`).classList.add("active");
  });
});

startDashboardPolling();

loadStudents();
loadTeachers();
loadClasses();