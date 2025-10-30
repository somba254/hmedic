/**
 * script.js — MediSync Hospital Management System Frontend Controller
 *
 * This script manages all frontend interactions for MediSync, including:
 * - User authentication via login form (POST to api/login.php)
 * - Dynamic dashboard navigation and role-based content rendering
 * - Data loading for patients, appointments, staff, and billing via API endpoints
 * - Chart rendering for analytics using Chart.js
 * - Theme management (light/dark mode)
 * - Patient CRUD operations for receptionists
 * - Responsive UI updates and localStorage state management
 *
 * Dependencies:
 * - index.html: Must include loginForm, dashboard sections, and required input fields with correct name attributes
 * - Backend: PHP API endpoints (login.php, patients.php, appointments.php, staff.php, billing.php)
 * - Chart.js, Tailwind CSS, Font Awesome (via CDN)
 */
document.addEventListener("DOMContentLoaded", () => {
  /**
   * DOM Element References
   * - sections: All page sections for navigation
   * - loginForm: Login form element for authentication
   * - darkModeToggle: Theme toggle switch
   * - dashboards: All dashboard sections for role-based navigation
   * - API_BASE: Base path for API endpoints
   */
  const sections = Array.from(document.querySelectorAll(".page-section"));
  const loginForm = document.getElementById("loginForm");
  const darkModeToggle = document.getElementById("darkModeToggle");
  const htmlEl = document.documentElement;
  const bodyEl = document.body;
  const dashboards = Array.from(document.querySelectorAll("[id$='-dashboard']"));
  const API_BASE = "api";

  /**
   * Chart Management
   * Ensures charts are properly destroyed before re-creation to prevent memory leaks.
   * @param {HTMLCanvasElement} ctx - Canvas context for chart
   * @param {Object} config - Chart.js configuration object
   * @returns {Chart|null} - Chart instance or null
   */
  const activeCharts = {};
  function createChartSafe(ctx, config) {
    if (!ctx) return null;
    const id = ctx.id || ctx.getAttribute("id") || Math.random().toString(36).slice(2);
    if (activeCharts[id]) {
      try { activeCharts[id].destroy(); } catch (e) { /* ignore */ }
    }
    activeCharts[id] = new Chart(ctx, config);
    return activeCharts[id];
  }

  /**
   * Safe Fetch Helper
   * Fetches data from the given URL and parses JSON safely.
   * Throws an error if response is not valid JSON.
   * @param {string} url - API endpoint URL
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} - Parsed JSON response
   */
  async function safeFetchJSON(url, options = {}) {
    // Ensure cookies (session) are included for same-origin requests
    options.credentials = options.credentials || 'same-origin';
    const res = await fetch(url, options);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (err) {
      // Server returned non-JSON (likely error / HTML). Surface for debugging.
      console.error("Non-JSON response from", url, ":\n", text);
      throw new Error("Non-JSON response from server");
    }
  }

  /**
   * Theme Initialization
   * Loads theme preference from localStorage and applies light/dark mode.
   */
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    htmlEl.classList.add("dark");
    bodyEl.classList.add("dark");
    htmlEl.classList.remove("light");
    bodyEl.classList.remove("light");
    if (darkModeToggle) darkModeToggle.checked = true;
  } else {
    htmlEl.classList.add("light");
    bodyEl.classList.add("light");
    htmlEl.classList.remove("dark");
    bodyEl.classList.remove("dark");
    if (darkModeToggle) darkModeToggle.checked = false;
  }

  /**
   * Section Navigation
   * Shows the specified section by ID and hides all others.
   * @param {string} id - Section ID to show
   */
  function showSectionById(id) {
    sections.forEach(s => s.classList.add("hidden"));
    const el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
  }

  /**
   * Sidebar Navigation Setup
   * Configures sidebar navigation for each dashboard, including button click handlers and data loading.
   * @param {string} dashboardId - Dashboard section ID
   */
  function setupSidebarNavigation(dashboardId) {
    const dashboard = document.getElementById(dashboardId);
    if (!dashboard) return;

    const navButtons = Array.from(dashboard.querySelectorAll("aside nav button"));
    const contentSections = Array.from(dashboard.querySelectorAll(".dashboard-content"));

    navButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.target;
        navButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        contentSections.forEach(sec => {
          sec.classList.toggle("hidden", sec.dataset.section !== target);
        });

        // Load data when specific sections open
        if (target === "patients") loadPatients();
        if (target === "appointments") loadAppointments();
        if (target === "staff") loadStaff();
        if (target === "billing") loadBilling();
        if (target === "overview") {
          // render charts for role (admin/doctor/nurse/receptionist)
          const role = dashboardId.replace("-dashboard", "");
          renderCharts(role);
        }
      });
    });

    // default open overview
    const overviewBtn = dashboard.querySelector("aside nav button[data-target='overview']");
    if (overviewBtn) {
      overviewBtn.classList.add("active");
      contentSections.forEach(sec => sec.classList.toggle("hidden", sec.dataset.section !== "overview"));
      const role = dashboardId.replace("-dashboard", "");
      renderCharts(role);
    }
  }

  /**
   * Chart Rendering Helpers
   * Renders role-specific charts for analytics dashboards.
   * @param {string} role - User role (admin, doctor, nurse, receptionist)
   */
  function renderCharts(role) {
    // Example charts - only render if canvas exists
    if (role === "admin") {
      createChartSafe(document.getElementById("adminOccupancyChart"), {
        type: "doughnut",
        data: { labels: ["Occupied", "Available"], datasets: [{ data: [85, 15] }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
      createChartSafe(document.getElementById("adminRevenueChart"), {
        type: "bar",
        data: { labels: ["Jan","Feb","Mar","Apr","May","Jun"], datasets: [{ data: [12000,15000,13000,17000,19000,21000] }] },
        options: { responsive: true }
      });
    }
    if (role === "doctor") {
      createChartSafe(document.getElementById("doctorPatientChart"), {
        type: "bar",
        data: { labels: ["Mon","Tue","Wed","Thu","Fri"], datasets: [{ data: [8,10,6,9,7] }] }
      });
    }
    if (role === "nurse") {
      createChartSafe(document.getElementById("nurseVitalsChart"), {
        type: "line",
        data: { labels: ["6AM","9AM","12PM","3PM","6PM"], datasets: [{ data: [98,99,100,98,97] }] }
      });
    }
    if (role === "receptionist") {
      createChartSafe(document.getElementById("receptionistAppointmentChart"), {
        type: "bar",
        data: { labels: ["8AM","10AM","12PM","2PM","4PM"], datasets: [{ data: [5,8,4,6,7] }] }
      });
    }
  }

  /**
   * Login Handler
   * Submits login form data to api/login.php and processes authentication response.
   * On success, displays the appropriate dashboard and initializes navigation.
   */
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(loginForm);

      try {
        const data = await safeFetchJSON(`${API_BASE}/login.php`, { method: "POST", body: formData });

        if (data.status === "success") {
          // normalize role to lowercase for dashboard id
          const roleNormalized = String(data.role).toLowerCase();
          localStorage.setItem("role", roleNormalized);
          localStorage.setItem("username", data.username || "");
          showSectionById(`${roleNormalized}-dashboard`);
          setupSidebarNavigation(`${roleNormalized}-dashboard`);
          // Render initial components for that dashboard
          dashboards.forEach(d => {
            if (d.id === `${roleNormalized}-dashboard`) setupSidebarNavigation(d.id);
          });
        } else {
          alert(data.message || "Invalid credentials");
        }
      } catch (err) {
        console.error("Error connecting to server:", err);
        alert("Error connecting to server. Please ensure XAMPP (Apache & MySQL) are running.");
      }
    });
  }

  /**
   * Dark Mode Toggle Handler
   * Updates theme and localStorage based on user selection.
   */
  darkModeToggle?.addEventListener("change", (e) => {
    const isDark = e.target.checked;
    if (isDark) {
      htmlEl.classList.add("dark"); bodyEl.classList.add("dark");
      htmlEl.classList.remove("light"); bodyEl.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else {
      htmlEl.classList.add("light"); bodyEl.classList.add("light");
      htmlEl.classList.remove("dark"); bodyEl.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  });

  /**
   * Return & Logout Handler
   * Handles logout and return actions, clearing localStorage and returning to landing page.
   */
  document.querySelectorAll(".return-btn, [id$='Logout']").forEach(btn => {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      // call server logout to destroy session
      try { safeFetchJSON(`${API_BASE}/logout.php`, { method: 'POST' }); } catch (e) { /* ignore */ }
      localStorage.removeItem("role");
      localStorage.removeItem("username");
      showSectionById("landing");
    });
  });

  /**
   * Receptionist: Patients CRUD
   * Loads patient data and handles patient addition via API.
   */
  async function loadPatients() {
    const tbody = document.getElementById("patientTableBody");
    if (!tbody) return;
    tbody.innerHTML = "<tr><td colspan='5'>Loading...</td></tr>";
    try {
      const patients = await safeFetchJSON(`${API_BASE}/patients.php`);
      if (!Array.isArray(patients)) {
        tbody.innerHTML = "<tr><td colspan='5'>No patients or invalid response</td></tr>";
        return;
      }
      tbody.innerHTML = "";
      patients.forEach(p => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${escapeHtml(p.name || "")}</td>
          <td>${escapeHtml(String(p.age || ""))}</td>
          <td>${escapeHtml(p.gender || "")}</td>
          <td>${escapeHtml(p.doctor || p.contact || "")}</td>
          <td>${escapeHtml(p.date || p.address || "")}</td>
        `;
        tbody.appendChild(row);
      });
    } catch (err) {
      console.error("loadPatients error:", err);
      tbody.innerHTML = "<tr><td colspan='5'>Failed to load patients.</td></tr>";
    }
  }

  const addPatientForm = document.getElementById("addPatientForm");
  if (addPatientForm) {
    addPatientForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(addPatientForm);

      try {
        const data = await safeFetchJSON(`${API_BASE}/patients.php`, { method: "POST", body: formData });
        if (!data) {
          alert("Server returned unexpected response while adding patient. Check console.");
          console.error("Add patient non-json:", text);
          return;
        }
        if (data.status === "success") {
          addPatientForm.reset();
          await loadPatients();
          alert(data.message || "Patient added");
        } else {
          alert(data.message || "Failed to add patient");
        }
      } catch (err) {
        console.error("Error adding patient:", err);
        alert("Error connecting to server while adding patient.");
      }
    });
  }

  /**
   * Appointments / Staff / Billing Loaders
   * Loads data for appointments, staff, and billing sections via API endpoints.
   */
  async function loadAppointments() {
    const container = document.querySelector("#appointmentsTableBody");
    if (!container) return;
    container.innerHTML = "<tr><td colspan='5'>Loading...</td></tr>";
    try {
      const appointments = await safeFetchJSON(`${API_BASE}/appointments.php`);
      container.innerHTML = "";
      if (!Array.isArray(appointments) || appointments.length === 0) {
        container.innerHTML = "<tr><td colspan='5'>No appointments</td></tr>";
        return;
      }
      appointments.forEach(a => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${escapeHtml(a.patient_name || a.patient || "")}</td>
          <td>${escapeHtml(a.doctor || "")}</td>
          <td>${escapeHtml(a.date || "")}</td>
          <td>${escapeHtml(a.time || "")}</td>
          <td>${escapeHtml(a.status || "")}</td>
        `;
        container.appendChild(row);
      });
    } catch (err) {
      console.error("loadAppointments error:", err);
      container.innerHTML = "<tr><td colspan='5'>Failed to load appointments.</td></tr>";
    }
  }

  async function loadStaff() {
    const container = document.querySelector("#staffTableBody");
    const listEl = document.querySelector('#staffList');
    if (!container) return;
    container.innerHTML = "<tr><td colspan='3'>Loading...</td></tr>";
    try {
      const staff = await safeFetchJSON(`${API_BASE}/staff.php`);
      container.innerHTML = "";
      if (!Array.isArray(staff) || staff.length === 0) {
        container.innerHTML = "<tr><td colspan='3'>No staff</td></tr>";
        if (listEl) listEl.innerHTML = '<li>No staff</li>';
        return;
      }
      staff.forEach(s => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${escapeHtml(s.username || "")}</td>
          <td>${escapeHtml(s.role || "")}</td>
          <td><button class="btn small">View</button></td>
        `;
        container.appendChild(row);
      });
      if (listEl) {
        listEl.innerHTML = '';
        staff.forEach(s => {
          const li = document.createElement('li');
          li.className = 'flex justify-between items-center';
          li.innerHTML = `<span>${escapeHtml(s.username)} — ${escapeHtml(s.role)}</span>`;
          listEl.appendChild(li);
        });
      }
    } catch (err) {
      console.error("loadStaff error:", err);
      container.innerHTML = "<tr><td colspan='3'>Failed to load staff.</td></tr>";
    }
  }

  // Add Staff form submission
  const addStaffForm = document.getElementById('addStaffForm');
  if (addStaffForm) {
    addStaffForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(addStaffForm);
      try {
        const data = await safeFetchJSON(`${API_BASE}/staff.php`, { method: 'POST', body: formData });
        if (data && data.status === 'success') {
          addStaffForm.reset();
          await loadStaff();
          alert('Staff added');
        } else {
          alert(data.message || 'Failed to add staff');
        }
      } catch (err) {
        console.error('Error adding staff:', err);
        alert('Error connecting to server while adding staff.');
      }
    });
  }

  async function loadBilling() {
    const container = document.querySelector("#billingTableBody");
    if (!container) return;
    container.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";
    try {
      const bills = await safeFetchJSON(`${API_BASE}/billing.php`);
      container.innerHTML = "";
      if (!Array.isArray(bills) || bills.length === 0) {
        container.innerHTML = "<tr><td colspan='4'>No billing records</td></tr>";
        return;
      }
      bills.forEach(b => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${escapeHtml(b.patient_name || "")}</td>
          <td>${escapeHtml(b.amount || "")}</td>
          <td>${escapeHtml(b.date || "")}</td>
          <td>${escapeHtml(b.status || "")}</td>
        `;
        container.appendChild(row);
      });
    } catch (err) {
      console.error("loadBilling error:", err);
      container.innerHTML = "<tr><td colspan='4'>Failed to load billing.</td></tr>";
    }
  }

  /**
   * HTML Escape Helper
   * Escapes HTML special characters for safe DOM injection.
   * @param {string} str - Input string
   * @returns {string} - Escaped string
   */
  function escapeHtml(str) {
    if (typeof str !== "string") return str;
    return str.replace(/[&<>"'`=\/]/g, function (s) {
      return ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;',
        '`': '&#x60;', '=': '&#x3D;'
      })[s];
    });
  }

  /**
   * Dashboard Initialization
   * Sets up navigation for all dashboard sections present in the DOM.
   */
  dashboards.forEach(d => setupSidebarNavigation(d.id));

  /**
   * Role Persistence
   * Automatically displays the dashboard for the stored role in localStorage.
   */
  const savedRole = localStorage.getItem("role");
  if (savedRole) {
    const dash = document.getElementById(`${savedRole}-dashboard`);
    if (dash) {
      showSectionById(`${savedRole}-dashboard`);
      setupSidebarNavigation(`${savedRole}-dashboard`);
    } else {
      // fallback to landing
      showSectionById("landing");
    }
  } else {
    showSectionById("landing");
  }

  // Try to restore session from server (me.php)
  (async function restoreSession() {
    try {
      const me = await safeFetchJSON(`${API_BASE}/me.php`);
      if (me && me.status === 'success' && me.user && me.user.role) {
        const roleNormalized = String(me.user.role).toLowerCase();
        localStorage.setItem('role', roleNormalized);
        localStorage.setItem('username', me.user.username || '');
        showSectionById(`${roleNormalized}-dashboard`);
        setupSidebarNavigation(`${roleNormalized}-dashboard`);
      }
    } catch (err) {
      // ignore
    }
  })();

  /**
   * Initial Data Load
   * Loads patients, appointments, staff, and billing data on page load if relevant sections are visible.
   */
  renderInitialPatientLoad();

  async function renderInitialPatientLoad() {
    // if receptionist-dashboard exists and is visible, load patients
    const receptionistDash = document.getElementById("receptionist-dashboard");
    if (receptionistDash && !receptionistDash.classList.contains("hidden")) {
      await loadPatients();
    }
    // also initial load for any sections that exist and are visible
    await loadAppointments();
    await loadStaff();
    await loadBilling();
  }
});
