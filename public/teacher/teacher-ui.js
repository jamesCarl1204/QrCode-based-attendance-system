// teacher-ui.js
// Layout behavior only (theme, clock, sidebar views, profile card, dashboard shell).
// All class / session / member / AI logic stays in teacher.js.

(function () {
  const root = document.documentElement;
  const THEME_KEY = "eduqr_theme";

  const pageTitle = document.getElementById("pageTitle");
  const dashboardView = document.getElementById("dashboardView");
  const classesView = document.getElementById("classesView");
  const dashboardLink = document.getElementById("dashboardLink");
  const sidebar = document.getElementById("sidebar");
  const mainContent = document.querySelector(".main-content");
const aiView = document.getElementById("aiView");
const aiBtn = document.getElementById("aiAssistantBtn");
  /* ---------- Theme ---------- */
  const themeBtn = document.getElementById("themeToggleBtn");
  const themeIcon = document.getElementById("themeIcon");
  const themeText = document.getElementById("themeText");

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}

    if (theme === "dark") {
      themeIcon.className = "fa-solid fa-sun";
      themeText.textContent = "Light Mode";
    } else {
      themeIcon.className = "fa-solid fa-moon";
      themeText.textContent = "Dark Mode";
    }
    updateChartsTheme();
  }

  themeBtn.addEventListener("click", () => {
    applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });

  /* ---------- Navbar clock (PH time) ---------- */
  const navClock = document.getElementById("navClock");
  function tickClock() {
    navClock.textContent = new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Manila" });
  }
  tickClock();
  setInterval(tickClock, 1000);

function closeMobileDrawer() {
  if (window.innerWidth <= 768) sidebar.classList.remove("collapsed");
}

function showDashboard() {
  dashboardView.hidden = false;
  classesView.hidden = true;
  aiView.hidden = true;
  aiBtn.classList.remove("active");
  dashboardLink.classList.add("active");
  pageTitle.textContent = "Dashboard";
}

function showClasses(filter) {
  dashboardView.hidden = true;
  classesView.hidden = false;
  aiView.hidden = true;
  aiBtn.classList.remove("active");
  dashboardLink.classList.remove("active");
  pageTitle.textContent = filter === "archived" ? "Archived Classes" : "My Classes";
}

function showAi() {
  dashboardView.hidden = true;
  classesView.hidden = true;
  aiView.hidden = false;
  document.querySelectorAll(".sidebar-link").forEach((b) => b.classList.remove("active"));
  aiBtn.classList.add("active");
  pageTitle.textContent = "AI Assistant";
  const log = document.getElementById("aiChatLog");
  log.scrollTop = log.scrollHeight;
}

dashboardLink.addEventListener("click", () => {
  document.querySelectorAll(".sidebar-link[data-filter]").forEach((b) => b.classList.remove("active"));
  showDashboard();
});

document.querySelectorAll(".sidebar-link[data-filter]").forEach((btn) => {
  btn.addEventListener("click", () => showClasses(btn.dataset.filter));
});

aiBtn.addEventListener("click", showAi);

document.getElementById("dashGoClassesBtn").addEventListener("click", () => {
  document.querySelector('.sidebar-link[data-filter="active"]').click();
});

  document.querySelectorAll(".sidebar-link").forEach((l) => l.addEventListener("click", closeMobileDrawer));
  mainContent.addEventListener("click", closeMobileDrawer);

  /* ---------- Profile card ---------- */
  async function loadProfileCard() {
    try {
      const res = await fetch("/api/me", { credentials: "include" });
      const data = await res.json();
      if (!data.success || !data.user) return;

      const name = data.user.firstName || data.user.email || "Teacher";
      document.getElementById("profileName").textContent = name;
      document.getElementById("profileEmail").textContent = data.user.email || "";
      document.getElementById("profileAvatar").textContent = name.trim().charAt(0).toUpperCase();
    } catch (err) {
      console.error("Failed to load profile card:", err);
    }
  }

  /* ---------- Dashboard charts (empty shells — data wiring comes next) ---------- */
  let weeklyChart = null;
  let statusChart = null;

  function chartColors() {
    const dark = root.getAttribute("data-theme") === "dark";
    return {
      grid: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
      tick: dark ? "#94a3b8" : "#64748b",
      empty: dark ? "#1e293b" : "#e2e8f0",
    };
  }

  function initCharts() {
    if (typeof Chart === "undefined") return;
    const c = chartColors();

    const weeklyCtx = document.getElementById("chartWeeklyTrend");
    if (weeklyCtx) {
      weeklyChart = new Chart(weeklyCtx, {
        type: "line",
        data: {
          labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
          datasets: [{
            label: "Attendance %",
            data: [],
            borderColor: "#22c55e",
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#22c55e",
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { min: 0, max: 100, grid: { color: c.grid }, ticks: { color: c.tick } },
            x: { grid: { display: false }, ticks: { color: c.tick } },
          },
        },
      });
    }

    const statusCtx = document.getElementById("chartStatusBreakdown");
    if (statusCtx) {
      statusChart = new Chart(statusCtx, {
        type: "doughnut",
        data: {
          labels: ["Present", "Late", "Absent"],
          datasets: [{
            data: [],
            backgroundColor: ["#22c55e", "#f59e0b", "#f43f5e"],
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "75%",
          plugins: { legend: { display: false } },
        },
      });
    }

    // Handy for the dashboard step later: window.dashboardCharts.weekly.data.datasets[0].data = [...]; .update()
    window.dashboardCharts = { weekly: weeklyChart, status: statusChart };
  }

  function updateChartsTheme() {
    if (!weeklyChart) return;
    const c = chartColors();
    weeklyChart.options.scales.y.grid.color = c.grid;
    weeklyChart.options.scales.y.ticks.color = c.tick;
    weeklyChart.options.scales.x.ticks.color = c.tick;
    weeklyChart.update();
  }

  /* ---------- Init ---------- */
  applyTheme(root.getAttribute("data-theme") === "light" ? "light" : "dark");
  showDashboard();
  initCharts();
  loadProfileCard();
})();