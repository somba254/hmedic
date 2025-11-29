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
  const darkToggleIds = [
    "darkModeToggleDashboardAdmin",
    "darkModeToggleDashboardDoctor",
    "darkModeToggleDashboardNurse",
    "darkModeToggleDashboardReception"
  ];
  const darkModeToggles = darkToggleIds
    .map(id => document.getElementById(id))
    .filter(Boolean);
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
  function setThemeState(isDark) {
    if (isDark) {
      htmlEl.classList.add("dark"); bodyEl.classList.add("dark");
      htmlEl.classList.remove("light"); bodyEl.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else {
      htmlEl.classList.add("light"); bodyEl.classList.add("light");
      htmlEl.classList.remove("dark"); bodyEl.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    if (darkModeToggle) darkModeToggle.checked = !!isDark;
    darkModeToggles.forEach(t => { t.checked = !!isDark; });
  }
  setThemeState(savedTheme === "dark");

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
        if (target === "patients") { loadPatients(); if (dashboardId === 'doctor-dashboard') loadDoctorPatients(); }
        if (target === "appointments") { 
          loadAppointments(); 
          if (dashboardId === 'doctor-dashboard') loadDoctorAppointments(); 
        }
        if (target === "staff") loadStaff();
        if (target === "billing") loadBilling();
        if (target === "prescriptions" && dashboardId === 'doctor-dashboard') { loadDoctorPrescriptions(); populateDoctorPatientSelects(); }
        if (target === "notes" && dashboardId === 'doctor-dashboard') { loadDoctorNotes(); populateDoctorPatientSelects(); }
        if (target === "messages" && dashboardId === 'doctor-dashboard') renderDoctorMessages();
        if (target === "medications" && dashboardId === 'nurse-dashboard') loadNurseData();
        if (target === "alerts" && dashboardId === 'nurse-dashboard') loadNurseData();
        if (target === "doctors" && dashboardId === 'receptionist-dashboard') loadReceptionDoctors();
        if (target === "registration" && dashboardId === 'receptionist-dashboard') { populateDoctorDropdowns(); loadPatients(); }
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
        data: { labels: ["Mon","Tue","Wed","Thu","Fri"], datasets: [{ label: "Patients Seen", data: [8,10,6,9,7] }] }
      });
      createChartSafe(document.getElementById("doctorTreatmentChart"), {
        type: "line",
        data: {
          labels: ["Jan","Feb","Mar","Apr","May","Jun"],
          datasets: [
            { label: "Successful", data: [85,88,90,92,91,93] },
            { label: "Complications", data: [5,4,3,4,3,2] }
          ]
        }
      });
    }
    if (role === "nurse") {
      createChartSafe(document.getElementById("nurseVitalsChart"), {
        type: "line",
        data: { labels: ["6AM","9AM","12PM","3PM","6PM"], datasets: [{ label: "Avg SpO2", data: [98,99,100,98,97] }] }
      });
      createChartSafe(document.getElementById("nurseMedicationChart"), {
        type: "bar",
        data: { labels: ["Ward A","Ward B","Ward C"], datasets: [{ label: "Scheduled Doses", data: [12,9,7] }] }
      });
    }
    if (role === "receptionist") {
      createChartSafe(document.getElementById("receptionistAppointmentChart"), {
        type: "bar",
        data: { labels: ["8AM","10AM","12PM","2PM","4PM"], datasets: [{ label: "Appointments", data: [5,8,4,6,7] }] }
      });
      createChartSafe(document.getElementById("receptionistRegistrationChart"), {
        type: "line",
        data: { labels: ["Mon","Tue","Wed","Thu","Fri"], datasets: [{ label: "Registrations", data: [6,9,7,8,10] }] }
      });
    }
  }

  // Doctor: Patients list (filtered by assigned doctor)
  async function loadDoctorPatients() {
    const container = document.getElementById('doctorPatientsList');
    if (!container) return;
    container.innerHTML = '<div>Loading...</div>';
    try {
      const username = localStorage.getItem('username') || '';
      const patients = await safeFetchJSON(`${API_BASE}/patients.php`);
      const mine = Array.isArray(patients) ? patients.filter(p => String(p.doctor || '').toLowerCase() === username.toLowerCase()) : [];
      if (mine.length === 0) {
        container.innerHTML = '<div class="text-sm">No patients assigned.</div>';
        return;
      }
      const rows = mine.map(p => `<tr><td class=\"px-3 py-2\">${escapeHtml(p.name)}</td><td class=\"px-3 py-2\">${escapeHtml(p.gender)}</td><td class=\"px-3 py-2\">${escapeHtml(String(p.age))}</td><td class=\"px-3 py-2\">${escapeHtml(p.date || '')}</td></tr>`).join('');
      container.innerHTML = `<div class=\"overflow-x-auto\"><table class=\"min-w-full\"><thead><tr><th class=\"px-3 py-2 text-left\">Name</th><th class=\"px-3 py-2 text-left\">Gender</th><th class=\"px-3 py-2 text-left\">Age</th><th class=\"px-3 py-2 text-left\">Appt Date</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    } catch (err) {
      console.error('loadDoctorPatients error:', err);
      container.innerHTML = '<div class=\"text-sm text-red-600\">Failed to load patients.</div>';
    }
  }

  // Doctor: Appointments filtered by doctor
  async function loadDoctorAppointments() {
    const tbody = document.getElementById('doctorAppointmentsTbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
    try {
      const username = localStorage.getItem('username') || '';
      const appointments = await safeFetchJSON(`${API_BASE}/appointments.php`);
      const mine = Array.isArray(appointments) ? appointments.filter(a => String(a.doctor || '').toLowerCase() === username.toLowerCase()) : [];
      if (mine.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No appointments scheduled.</td></tr>';
        return;
      }
      tbody.innerHTML = '';
      mine.forEach(a => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="px-3 py-2">${escapeHtml(a.date || '')}</td>
          <td class="px-3 py-2">${escapeHtml(a.time || '')}</td>
          <td class="px-3 py-2">${escapeHtml(a.patient_name || '')}</td>
          <td class="px-3 py-2">${escapeHtml(a.status || '')}</td>
          <td class="px-3 py-2">
            <button class="px-2 py-1 text-xs rounded bg-blue-600 text-white" onclick="alert('View appointment details')">View</button>
          </td>
        `;
        tbody.appendChild(row);
      });
    } catch (err) {
      console.error('loadDoctorAppointments error:', err);
      tbody.innerHTML = '<tr><td colspan="5">Failed to load appointments.</td></tr>';
    }
  }

  // Populate patient selects for doctor forms (prescriptions, notes)
  async function populateDoctorPatientSelects() {
    try {
      const username = localStorage.getItem('username') || '';
      const patients = await safeFetchJSON(`${API_BASE}/patients.php`);
      const mine = Array.isArray(patients) ? patients.filter(p => String(p.doctor || '').toLowerCase() === username.toLowerCase()) : [];
      const options = mine.length > 0 
        ? mine.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('')
        : '<option value="">No patients assigned</option>';
      
      const prescriptionSelect = document.getElementById('prescriptionPatient');
      const noteSelect = document.getElementById('notePatient');
      
      if (prescriptionSelect) prescriptionSelect.innerHTML = '<option value="">Select patient...</option>' + options;
      if (noteSelect) noteSelect.innerHTML = '<option value="">Select patient...</option>' + options;
    } catch (err) {
      console.error('Error loading patients for selects:', err);
    }
  }

  // Doctor: Prescriptions (stored in localStorage for demo)
  async function loadDoctorPrescriptions() {
    const container = document.getElementById('doctorPrescriptionsList');
    if (!container) return;
    container.innerHTML = 'Loading...';
    
    // Load from localStorage (would be API in production)
    const stored = localStorage.getItem('doctor_prescriptions') || '[]';
    const prescriptions = JSON.parse(stored);
    
    if (prescriptions.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-600">No active prescriptions.</p>';
      return;
    }
    
    const list = prescriptions.map((p, idx) => `
      <div class="p-3 border rounded-lg mb-2 flex justify-between items-center">
        <div>
          <div class="font-semibold">${escapeHtml(p.patient)}</div>
          <div class="text-sm text-gray-600">${escapeHtml(p.medication)} — ${escapeHtml(p.dosage)}</div>
          <div class="text-xs text-gray-500">Date: ${escapeHtml(p.date)}</div>
        </div>
        <button class="px-2 py-1 text-xs rounded bg-red-600 text-white" onclick="removePrescription(${idx})">Remove</button>
      </div>
    `).join('');
    
    container.innerHTML = list;
  }

  // Doctor: Patient Notes (stored in localStorage for demo)
  async function loadDoctorNotes() {
    const container = document.getElementById('doctorNotesList');
    if (!container) return;
    container.innerHTML = 'Loading...';
    
    // Load from localStorage (would be API in production)
    const stored = localStorage.getItem('doctor_notes') || '[]';
    const allNotes = JSON.parse(stored);
    const notes = [...allNotes].reverse(); // Most recent first (copy array to avoid mutating)
    
    if (notes.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-600">No notes recorded.</p>';
      return;
    }
    
    const list = notes.map((n, idx) => {
      // Find original index in non-reversed array
      const originalIdx = allNotes.length - 1 - idx;
      return `
      <div class="p-3 border rounded-lg mb-2">
        <div class="flex justify-between items-start mb-2">
          <div>
            <div class="font-semibold">${escapeHtml(n.patient)}</div>
            <div class="text-xs text-gray-500">${escapeHtml(n.date)}</div>
          </div>
          <button class="px-2 py-1 text-xs rounded bg-red-600 text-white" onclick="removeNote(${originalIdx})">Delete</button>
        </div>
        <div class="text-sm">${escapeHtml(n.content).replace(/\n/g, '<br>')}</div>
      </div>
    `;
    }).join('');
    
    container.innerHTML = list;
  }

  // Doctor: Enhanced messages feed
  function renderDoctorMessages() {
    const container = document.getElementById('doctorMessagesList');
    if (!container) return;
    const messages = [
      { from: 'Admin', text: 'Department meeting at 4 PM today in Conference Room A.', time: '2 hours ago', type: 'info' },
      { from: 'Nurse Anne', text: 'Patient Jane Roe updated vitals. BP: 120/80, Pulse: 72.', time: '1 hour ago', type: 'patient' },
      { from: 'Reception', text: 'New patient registration: Samuel Kamau assigned to you.', time: '30 mins ago', type: 'new' }
    ];
    const items = messages.map(m => `
      <div class="p-3 border rounded-lg mb-2">
        <div class="flex justify-between items-start mb-1">
          <span class="font-semibold">${escapeHtml(m.from)}</span>
          <span class="text-xs text-gray-500">${escapeHtml(m.time)}</span>
        </div>
        <div class="text-sm">${escapeHtml(m.text)}</div>
      </div>
    `).join('');
    container.innerHTML = items || '<p class="text-sm text-gray-600">No messages.</p>';
  }

  // Prescription form handler
  const prescriptionForm = document.getElementById('prescriptionForm');
  if (prescriptionForm) {
    prescriptionForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const stored = localStorage.getItem('doctor_prescriptions') || '[]';
      const prescriptions = JSON.parse(stored);
      prescriptions.push({
        patient: document.getElementById('prescriptionPatient').value,
        medication: document.getElementById('prescriptionMedication').value,
        dosage: document.getElementById('prescriptionDosage').value,
        date: new Date().toISOString().split('T')[0]
      });
      localStorage.setItem('doctor_prescriptions', JSON.stringify(prescriptions));
      prescriptionForm.reset();
      await loadDoctorPrescriptions();
      alert('Prescription added successfully');
    });
  }

  // Patient note form handler
  const patientNoteForm = document.getElementById('patientNoteForm');
  if (patientNoteForm) {
    patientNoteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const stored = localStorage.getItem('doctor_notes') || '[]';
      const notes = JSON.parse(stored);
      notes.push({
        patient: document.getElementById('notePatient').value,
        date: document.getElementById('noteDate').value || new Date().toISOString().split('T')[0],
        content: document.getElementById('noteContent').value
      });
      localStorage.setItem('doctor_notes', JSON.stringify(notes));
      patientNoteForm.reset();
      await loadDoctorNotes();
      alert('Note saved successfully');
    });
  }

  // Helper functions for removing prescriptions/notes
  window.removePrescription = function(idx) {
    if (!confirm('Remove this prescription?')) return;
    const stored = localStorage.getItem('doctor_prescriptions') || '[]';
    const prescriptions = JSON.parse(stored);
    prescriptions.splice(idx, 1);
    localStorage.setItem('doctor_prescriptions', JSON.stringify(prescriptions));
    loadDoctorPrescriptions();
  };

  window.removeNote = function(idx) {
    if (!confirm('Delete this note?')) return;
    const stored = localStorage.getItem('doctor_notes') || '[]';
    const notes = JSON.parse(stored);
    notes.splice(idx, 1);
    localStorage.setItem('doctor_notes', JSON.stringify(notes));
    loadDoctorNotes();
  };

  // Nurse: medications, alerts placeholders
  async function loadNurseData() {
    const medsEl = document.getElementById('nurseMedList');
    const alertsEl = document.getElementById('nurseAlerts');
    if (medsEl) {
      const meds = [
        { patient: 'John Doe', drug: 'Amoxicillin 500mg', time: '10:00' },
        { patient: 'Jane Roe', drug: 'Metformin 850mg', time: '12:00' }
      ];
      medsEl.innerHTML = meds.map(m => `<li class=\"flex justify-between\"><span>${escapeHtml(m.patient)}</span><span class=\"text-sm text-gray-600\">${escapeHtml(m.drug)} — ${escapeHtml(m.time)}</span></li>`).join('');
    }
    if (alertsEl) {
      const alerts = [
        { text: 'Ward A — Low stock of saline.' },
        { text: 'Patient Kelvin — Elevated BP, check at 14:00.' }
      ];
      alertsEl.innerHTML = alerts.map(a => `<li>${escapeHtml(a.text)}</li>`).join('');
    }
  }

  // Populate doctor dropdowns from staff API
  async function populateDoctorDropdowns() {
    try {
      const staff = await safeFetchJSON(`${API_BASE}/staff.php`);
      const doctors = Array.isArray(staff) ? staff.filter(s => String(s.role).toLowerCase() === 'doctor') : [];
      const options = doctors.length > 0 
        ? doctors.map(d => `<option value="${escapeHtml(d.username)}">${escapeHtml(d.username)}</option>`).join('')
        : '<option value="">No doctors available</option>';
      
      const addDoctorSelect = document.getElementById('assignedDoctor');
      const editDoctorSelect = document.getElementById('editAssignedDoctor');
      
      if (addDoctorSelect) {
        addDoctorSelect.innerHTML = options;
      }
      if (editDoctorSelect) {
        editDoctorSelect.innerHTML = options;
      }
    } catch (err) {
      console.error('Error loading doctors for dropdowns:', err);
      const addDoctorSelect = document.getElementById('assignedDoctor');
      const editDoctorSelect = document.getElementById('editAssignedDoctor');
      if (addDoctorSelect) addDoctorSelect.innerHTML = '<option value="">Failed to load doctors</option>';
      if (editDoctorSelect) editDoctorSelect.innerHTML = '<option value="">Failed to load doctors</option>';
    }
  }

  // Receptionist: list available doctors with details
  async function loadReceptionDoctors() {
    const el = document.getElementById('receptionDoctorsList');
    if (!el) return;
    el.innerHTML = 'Loading...';
    try {
      const staff = await safeFetchJSON(`${API_BASE}/staff.php`);
      const doctors = Array.isArray(staff) ? staff.filter(s => String(s.role).toLowerCase() === 'doctor') : [];
      if (doctors.length === 0) { 
        el.innerHTML = '<p class="text-sm text-gray-600">No doctors available. Admin can add doctors in the Staff section.</p>'; 
        return; 
      }
      
      // Get patient counts for each doctor
      const patients = await safeFetchJSON(`${API_BASE}/patients.php`);
      const patientCounts = {};
      if (Array.isArray(patients)) {
        patients.forEach(p => {
          const doc = p.doctor || '';
          patientCounts[doc] = (patientCounts[doc] || 0) + 1;
        });
      }
      
      const doctorCards = doctors.map(d => {
        const count = patientCounts[d.username] || 0;
        return `
          <div class="p-3 border rounded-lg mb-2">
            <div class="font-semibold">${escapeHtml(d.username)}</div>
            <div class="text-sm text-gray-600">Patients assigned: ${count}</div>
          </div>
        `;
      }).join('');
      
      el.innerHTML = `<div class="space-y-2">${doctorCards}</div>`;
    } catch (err) {
      console.error('loadReceptionDoctors error:', err);
      el.innerHTML = '<p class="text-sm text-red-600">Failed to load doctors.</p>';
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
    setThemeState(e.target.checked);
  });
  darkModeToggles.forEach(toggle => {
    toggle.addEventListener("change", (e) => {
      setThemeState(e.target.checked);
    });
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
    const recentTbody = document.getElementById("patientTableBody"); // Receptionist recent registrations
    const adminTbody = document.getElementById("adminPatientsTbody"); // Admin patients list
    if (!recentTbody && !adminTbody) return;
    if (recentTbody) recentTbody.innerHTML = "<tr><td colspan='6'>Loading...</td></tr>";
    if (adminTbody) adminTbody.innerHTML = "<tr><td colspan='6'>Loading...</td></tr>";
    try {
      const patients = await safeFetchJSON(`${API_BASE}/patients.php`);
      if (!Array.isArray(patients)) {
        if (recentTbody) recentTbody.innerHTML = "<tr><td colspan='6'>No patients or invalid response</td></tr>";
        if (adminTbody) adminTbody.innerHTML = "<tr><td colspan='6'>No patients or invalid response</td></tr>";
        return;
      }
      if (recentTbody) {
        recentTbody.innerHTML = "";
        patients.forEach(p => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${escapeHtml(p.name || "")}</td>
            <td>${escapeHtml(String(p.age || ""))}</td>
            <td>${escapeHtml(p.gender || "")}</td>
            <td>${escapeHtml(p.date || "")}</td>
            <td>${escapeHtml(p.doctor || "")}</td>
            <td>
              <div class="flex gap-2">
                <button class="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700" data-action="view" data-id="${p.id}">View</button>
                <button class="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700" data-action="edit" data-id="${p.id}">Edit</button>
                <button class="px-2 py-1 text-xs rounded bg-amber-500 text-white hover:bg-amber-600" data-action="reschedule" data-id="${p.id}">Reschedule</button>
              </div>
            </td>
          `;
          row.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
              const action = btn.getAttribute('data-action');
              const pid = btn.getAttribute('data-id');
              const patient = patients.find(pt => pt.id == pid);
              if (!patient) return;
              if (action === 'view') {
                showPatientViewModal(patient);
              } else if (action === 'edit') {
                showPatientEditModal(patient);
              } else if (action === 'reschedule') {
                handleReschedule(patient);
              }
            });
          });
          recentTbody.appendChild(row);
        });
      }
      if (adminTbody) {
        adminTbody.innerHTML = "";
        patients.forEach(p => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${escapeHtml(p.name || "")}</td>
            <td>${escapeHtml(String(p.age || ""))}</td>
            <td>${escapeHtml(p.gender || "")}</td>
            <td>${escapeHtml(p.doctor || "")}</td>
            <td>${escapeHtml(p.date || "")}</td>
            <td>
              <div class="flex gap-2">
                <button class="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700" data-action="view" data-id="${p.id}">View</button>
                <button class="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700" data-action="edit" data-id="${p.id}">Edit</button>
                <button class="px-2 py-1 text-xs rounded bg-amber-500 text-white hover:bg-amber-600" data-action="reschedule" data-id="${p.id}">Reschedule</button>
                <button class="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700" data-action="delete" data-id="${p.id}">Delete</button>
              </div>
            </td>
          `;
          row.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
              const action = btn.getAttribute('data-action');
              const pid = btn.getAttribute('data-id');
              const patient = patients.find(pt => pt.id == pid);
              if (!patient) return;
              if (action === 'view') {
                showPatientViewModal(patient);
              } else if (action === 'edit') {
                showPatientEditModal(patient);
              } else if (action === 'reschedule') {
                handleReschedule(patient);
              } else if (action === 'delete') {
                handleDeletePatient(patient);
              }
            });
          });
          adminTbody.appendChild(row);
        });
      }
    } catch (err) {
      console.error("loadPatients error:", err);
      if (recentTbody) recentTbody.innerHTML = "<tr><td colspan='6'>Failed to load patients.</td></tr>";
      if (adminTbody) adminTbody.innerHTML = "<tr><td colspan='6'>Failed to load patients.</td></tr>";
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
    const container = document.querySelector("#receptionAppointmentsTbody");
    if (!container) return;
    container.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";
    try {
      const appointments = await safeFetchJSON(`${API_BASE}/appointments.php`);
      container.innerHTML = "";
      if (!Array.isArray(appointments) || appointments.length === 0) {
        container.innerHTML = "<tr><td colspan='4'>No appointments</td></tr>";
        return;
      }
      appointments.forEach(a => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${escapeHtml(a.time || "")}</td>
          <td>${escapeHtml(a.patient_name || a.patient || "")}</td>
          <td>${escapeHtml(a.doctor || "")}</td>
          <td>${escapeHtml(a.status || "")}</td>
        `;
        container.appendChild(row);
      });
    } catch (err) {
      console.error("loadAppointments error:", err);
      container.innerHTML = "<tr><td colspan='4'>Failed to load appointments.</td></tr>";
    }
  }

  async function loadStaff() {
    const listEl = document.querySelector('#staffList');
    const elAdmin = document.getElementById('staffListAdmin');
    const elDoctor = document.getElementById('staffListDoctor');
    const elNurse = document.getElementById('staffListNurse');
    const elReception = document.getElementById('staffListReceptionist');
    if (listEl) listEl.innerHTML = '<li>Loading...</li>';
    if (elAdmin) elAdmin.innerHTML = 'Loading...';
    if (elDoctor) elDoctor.innerHTML = 'Loading...';
    if (elNurse) elNurse.innerHTML = 'Loading...';
    if (elReception) elReception.innerHTML = 'Loading...';
    try {
      const staff = await safeFetchJSON(`${API_BASE}/staff.php`);
      if (listEl) {
        listEl.innerHTML = '';
        if (!Array.isArray(staff) || staff.length === 0) {
          listEl.innerHTML = '<li>No staff</li>';
        } else {
          staff.forEach(s => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center';
            li.innerHTML = `<span>${escapeHtml(s.username)} — ${escapeHtml(s.role)}</span>`;
            listEl.appendChild(li);
          });
        }
      }
      if (Array.isArray(staff)) {
        const byRole = staff.reduce((acc, s) => {
          const r = String(s.role || '').toLowerCase();
          (acc[r] = acc[r] || []).push(s);
          return acc;
        }, {});
        const render = (arr, el) => {
          if (!el) return;
          if (!arr || arr.length === 0) { el.innerHTML = '<li>No staff</li>'; return; }
          el.innerHTML = '';
          arr.forEach(s => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-center';
            li.innerHTML = `<span>${escapeHtml(s.username)} — ${escapeHtml(s.role)}</span>`;
            el.appendChild(li);
          });
        };
        render(byRole['admin'], elAdmin);
        render(byRole['doctor'], elDoctor);
        render(byRole['nurse'], elNurse);
        render(byRole['receptionist'], elReception);
      }
    } catch (err) {
      console.error("loadStaff error:", err);
      if (listEl) listEl.innerHTML = '<li>Failed to load staff.</li>';
      if (elAdmin) elAdmin.innerHTML = 'Failed to load.';
      if (elDoctor) elDoctor.innerHTML = 'Failed to load.';
      if (elNurse) elNurse.innerHTML = 'Failed to load.';
      if (elReception) elReception.innerHTML = 'Failed to load.';
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
          // If a doctor was added, refresh doctor dropdowns
          const roleSelect = document.getElementById('staffRole');
          if (roleSelect && roleSelect.value === 'Doctor') {
            await populateDoctorDropdowns();
          }
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
    const container = document.querySelector("#billingTbody");
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
   * Patient Action Handlers
   * Functions to handle view, edit, delete, and reschedule actions
   */
  function showPatientViewModal(patient) {
    const modal = document.getElementById('patientViewModal');
    const content = document.getElementById('patientViewContent');
    content.innerHTML = `
      <p><strong>Name:</strong> ${escapeHtml(patient.name || '')}</p>
      <p><strong>Age:</strong> ${escapeHtml(String(patient.age || ''))}</p>
      <p><strong>Gender:</strong> ${escapeHtml(patient.gender || '')}</p>
      <p><strong>Assigned Doctor:</strong> ${escapeHtml(patient.doctor || '')}</p>
      <p><strong>Appointment Date:</strong> ${escapeHtml(patient.date || '')}</p>
    `;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  function showPatientEditModal(patient) {
    const modal = document.getElementById('patientEditModal');
    document.getElementById('editPatientId').value = patient.id || '';
    document.getElementById('editPatientName').value = patient.name || '';
    document.getElementById('editPatientAge').value = patient.age || '';
    document.getElementById('editPatientGender').value = patient.gender || 'Male';
    document.getElementById('editAppointmentDate').value = patient.date || '';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    // Populate doctor dropdown and set selected value
    populateDoctorDropdowns().then(() => {
      document.getElementById('editAssignedDoctor').value = patient.doctor || '';
    });
  }

  async function handleDeletePatient(patient) {
    if (!confirm(`Are you sure you want to delete patient "${patient.name}"?`)) return;
    try {
      const data = await safeFetchJSON(`${API_BASE}/patients.php`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: patient.id })
      });
      if (data.status === 'success') {
        alert('Patient deleted successfully');
        await loadPatients();
      } else {
        alert(data.message || 'Failed to delete patient');
      }
    } catch (err) {
      console.error('Error deleting patient:', err);
      alert('Error deleting patient. Check console for details.');
    }
  }

  async function handleReschedule(patient) {
    const newDate = prompt('Enter new appointment date (YYYY-MM-DD):', patient.date || '');
    if (!newDate) return;
    try {
      const data = await safeFetchJSON(`${API_BASE}/patients.php`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: patient.id,
          patientName: patient.name,
          patientAge: patient.age,
          patientGender: patient.gender,
          assignedDoctor: patient.doctor,
          appointmentDate: newDate
        })
      });
      if (data.status === 'success') {
        alert('Appointment rescheduled successfully');
        await loadPatients();
      } else {
        alert(data.message || 'Failed to reschedule appointment');
      }
    } catch (err) {
      console.error('Error rescheduling:', err);
      alert('Error rescheduling appointment. Check console for details.');
    }
  }

  // Edit form submission
  const patientEditForm = document.getElementById('patientEditForm');
  if (patientEditForm) {
    patientEditForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('editPatientId').value;
      const formData = {
        id: id,
        patientName: document.getElementById('editPatientName').value,
        patientAge: document.getElementById('editPatientAge').value,
        patientGender: document.getElementById('editPatientGender').value,
        assignedDoctor: document.getElementById('editAssignedDoctor').value,
        appointmentDate: document.getElementById('editAppointmentDate').value
      };
      try {
        const data = await safeFetchJSON(`${API_BASE}/patients.php`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (data.status === 'success') {
          const modal = document.getElementById('patientEditModal');
          modal.classList.add('hidden');
          modal.classList.remove('flex');
          alert('Patient updated successfully');
          await loadPatients();
        } else {
          alert(data.message || 'Failed to update patient');
        }
      } catch (err) {
        console.error('Error updating patient:', err);
        alert('Error updating patient. Check console for details.');
      }
    });
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
   * Mobile sidebar toggle handlers
   * - toggles the aside open/closed on small screens
   * - closes sidebar when overlay is clicked or when a nav item is selected
   */
  (function setupMobileSidebarToggles() {
    const overlay = document.getElementById('sidebarOverlay');
    const toggles = Array.from(document.querySelectorAll('.mobile-sidebar-toggle'));
    let currentToggle = null;
    let focusTrapCleanup = null;

    function closeAllSidebars() {
      document.querySelectorAll('aside').forEach(a => a.classList.remove('open'));
      if (overlay) overlay.classList.remove('show');
      // restore page scroll
      document.body.classList.remove('no-scroll');
      // update aria-expanded on toggles and reset icon to bars
      toggles.forEach(t => {
        t.setAttribute('aria-expanded', 'false');
        const icon = t.querySelector('i');
        if (icon) {
          icon.classList.remove('fa-xmark');
          icon.classList.add('fa-bars');
        }
      });
      // cleanup focus trap if any
      if (typeof focusTrapCleanup === 'function') {
        try { focusTrapCleanup(); } catch (e) { /* ignore */ }
        focusTrapCleanup = null;
      }
      // restore aria-hidden on mains
      document.querySelectorAll('[id$="-dashboard"]').forEach(d => {
        const m = d.querySelector('main');
        if (m) m.removeAttribute('aria-hidden');
      });
      // restore focus to the toggle that opened the sidebar (if any)
      try { if (currentToggle && currentToggle.focus) currentToggle.focus(); } catch (e) { /* ignore */ }
      // clear current toggle reference after focus restored
      currentToggle = null;
    }

    function openSidebarFor(toggle) {
      // find the closest dashboard section parent and open its aside
      const dashboard = toggle.closest('[id$="-dashboard"]');
      if (!dashboard) return;
      const aside = dashboard.querySelector('aside');
      if (!aside) return;
      // close others first
      closeAllSidebars();
      aside.classList.add('open');
      if (overlay) overlay.classList.add('show');
      // prevent background scroll while menu open
      document.body.classList.add('no-scroll');
      // mark toggle aria
      if (toggle && toggle.setAttribute) toggle.setAttribute('aria-expanded', 'true');
      // change hamburger icon to X
      const icon = toggle.querySelector('i');
      if (icon) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-xmark');
      }
      currentToggle = toggle;
      // setup focus trap inside this aside
      focusTrapCleanup = setupFocusTrap(aside);
      // hide main content from assistive tech while aside is open
      const main = dashboard.querySelector('main');
      if (main) main.setAttribute('aria-hidden', 'true');
    }

    toggles.forEach(t => {
      t.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const dashboard = t.closest('[id$="-dashboard"]');
        if (!dashboard) return;
        const aside = dashboard.querySelector('aside');
        if (!aside) return;
        const isOpen = aside.classList.contains('open');
        if (isOpen) {
          closeAllSidebars();
        } else {
          openSidebarFor(t);
        }
      });
    });

    // Close when overlay clicked
    if (overlay) {
      overlay.addEventListener('click', () => {
        closeAllSidebars();
      });
    }

    // close buttons inside aside
    document.querySelectorAll('.aside-close-btn').forEach(b => {
      b.addEventListener('click', (e) => { e.preventDefault(); closeAllSidebars(); });
    });

    // Close on Escape and manage focus trap cleanup
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        closeAllSidebars();
      }
    });

    // Focus-trap helper: returns a cleanup function to remove the keydown listener
    function setupFocusTrap(container) {
      const focusableSelector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const nodes = Array.from(container.querySelectorAll(focusableSelector)).filter(n => n.offsetParent !== null);
      if (nodes.length === 0) return function(){};
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      // focus the first element
      try { first.focus(); } catch (e) { /* ignore */ }

      function onKeyDown(e) {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }

      document.addEventListener('keydown', onKeyDown);
      return function cleanup() { document.removeEventListener('keydown', onKeyDown); };
    }

    // Close aside when a nav button is clicked (mobile)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest && e.target.closest('aside nav button');
      if (!btn) return;
      // only on small screens
      if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) {
        closeAllSidebars();
      }
    });
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
