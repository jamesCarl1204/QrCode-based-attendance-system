// admin-ui.js
// Layout behavior only (theme, clock, page title, mobile drawer, profile card).
// All students / teachers / classes logic stays in admin.js.

(function () {
  const root = document.documentElement;
  const THEME_KEY = "eduqr_theme";

  const sidebar = document.getElementById("sidebar");
  const mainContent = document.querySelector(".main-content");
  const pageTitle = document.getElementById("pageTitle");

  const PAGE_TITLES = {
    dashboard: "Dashboard",
    students: "Students",
    teachers: "Teachers",
    classes: "Classes",
    archivedClasses: "Archived Classes",
    createTeacher: "Create Teacher",
  };

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

  /* ---------- Page title + mobile drawer ---------- */
  function setTitle(tab) {
    pageTitle.textContent = PAGE_TITLES[tab] || "Dashboard";
  }

  function closeMobileDrawer() {
    if (window.innerWidth <= 768) sidebar.classList.remove("collapsed");
  }

  document.querySelectorAll(".sidebar-link[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setTitle(btn.dataset.tab);
      closeMobileDrawer();
    });
  });

  document.querySelectorAll("[data-quick-tab]").forEach((btn) => {
    btn.addEventListener("click", () => setTitle(btn.dataset.quickTab));
  });

  mainContent.addEventListener("click", closeMobileDrawer);

  /* ---------- Profile card ---------- */
  async function loadProfileCard() {
    try {
      const res = await fetch("/api/me", { credentials: "include" });
      const data = await res.json();
      if (!data.success || !data.user) return;

      const name = data.user.firstName || data.user.email || "Admin";
      document.getElementById("profileName").textContent = name;
      document.getElementById("profileEmail").textContent = data.user.email || "";
      document.getElementById("profileAvatar").textContent = name.trim().charAt(0).toUpperCase();
    } catch (err) {
      console.error("Failed to load profile card:", err);
    }
  }

  /* ---------- Init ---------- */
  applyTheme(root.getAttribute("data-theme") === "light" ? "light" : "dark");
  setTitle("dashboard");
  loadProfileCard();
})();