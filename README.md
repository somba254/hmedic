MediSync — Local Development README

This project is a small hospital management system (PHP + MySQL) configured to run on XAMPP (Windows).

Quick overview
- PHP endpoints live in `api/` (login, patients, staff, billing, appointments, etc.)
- Frontend is `index.html` + `script.js` (Tailwind + Chart.js via CDN)
- Database schema and sample data: `db/seed.sql`

Prerequisites
- XAMPP (Apache + MySQL) installed and running
- PHP CLI available in PATH (for optional scripts)

Database setup (phpMyAdmin)
1. Open phpMyAdmin (usually http://localhost/phpmyadmin)
2. Create/import the database using `db/seed.sql`. Alternatively paste the SQL block into the SQL tab and run.
   - The seed SQL creates `hmedic_db` and tables: `staff`, `patients`, `appointments`, `billing`.
   - Default users (with bcrypt passwords) inserted:
     - admin / admin123 (role: Admin)
     - reception_mary / mary123 (role: Receptionist)
     - doctor_john / john123 (role: Doctor)
     - nurse_anne / anne123 (role: Nurse)

Configuration
- `config.php` reads DB credentials from environment variables or `config.local.php` if present.
  Example `config.local.php`:
  ```php
  <?php
  $host = 'localhost';
  $user = 'root';
  $pass = '';
  $db   = 'hmedic_db';
  $port = 3307; // if your MySQL runs on 3307
  ```

Authentication and Roles
- Login endpoint: `api/login.php` — accepts username, password, and selected `role` from the login form.
- On successful login, server sets a session with `user` containing `id, username, role`.
- Role protections exist on endpoints:
  - `api/staff.php`: Admin only (GET listing, POST create)
  - `api/patients.php`: POST requires `Receptionist` or `Admin` (GET public)
  - `api/billing.php`: GET requires `Admin` or `Receptionist`
- Frontend uses `api/me.php` to restore session and show the correct dashboard.

Admin staff management
- Admins can add staff via the admin Staff section in the UI (uses `POST api/staff.php`). Passwords are hashed automatically.

Optional scripts (tools)
- `tools/hash_plain_passwords.php` — finds `staff` rows with non-bcrypt passwords and replaces them with bcrypt hashes. Run only if you have plaintext passwords you want to convert.
  Run from project root (PowerShell):
  ```powershell
  php tools\hash_plain_passwords.php
  ```

Cleaning up test files
- Test/example helper scripts used during development were removed from `tools/` (they included CLI and small HTTP test scripts). The `hash_plain_passwords.php` helper is kept for convenience.

How to test in browser
1. Start XAMPP (Apache & MySQL)
2. Open http://localhost/hmedic/
3. Login with one of the default users (select the matching role in the login form):
   - admin / admin123 → Admin dashboard
   - reception_mary / mary123 → Receptionist dashboard
   - doctor_john / john123 → Doctor dashboard
   - nurse_anne / anne123 → Nurse dashboard
4. As Admin: go to Staff → Add Staff to create new users.
5. As Receptionist: go to Registration to add a patient (will insert to `patients` table).

Notes & Troubleshooting
- If you get JSON errors or HTML from API endpoints, check Apache error logs and ensure `config.php` point to the correct DB host/port.
- If you run into CORS or cookie issues, ensure the app is served from the same origin (http://localhost) and `script.js` uses `credentials: 'same-origin'` on fetch (already configured).

If you want me to:
- Add staff edit/delete UI and endpoints (Admin only)
- Harden appointment creation/update rules
- Produce a single SQL file that fully resets the DB to the provided seed
Tell me which and I'll implement it next.
