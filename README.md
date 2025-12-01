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
    **MediSync — Project Overview**

    MediSync is a lightweight Hospital Management System (PHP + MySQL) intended for local development and demos. It is configured to run on XAMPP (Windows) and includes backend API endpoints in `api/`, a single-page frontend (`index.html`, `script.js`), and a sample database in `db/seed.sql`.

    **Table of contents**
    - **Overview**: What this repo contains
    - **Quick start**: Run locally with XAMPP (short steps)
    - **Full setup**: See `docs/SETUP.md` for detailed instructions
    - **API**: See `docs/API.md` for endpoints and examples
    - **Contributing**: See `docs/CONTRIBUTING.md` for contribution and style
    - **Security**: See `docs/SECURITY.md` for reporting and sensitive data guidance

    **Overview**
    - Backend: `api/` — REST-like PHP endpoints (login, logout, me, patients, staff, appointments, billing, diag)
    - Frontend: `index.html`, `script.js` — role-based dashboards (Admin, Doctor, Nurse, Receptionist)
    - Database: `db/seed.sql` — creates `hmedic_db` with sample data (staff, patients, appointments, billing)
    - Tools: `tools/` — helper scripts for seeding, tests and maintenance

    **Quick start (short)**
    1. Install XAMPP and start **Apache** and **MySQL**.
    2. Copy `config.local.php.example` to `config.local.php` and edit if needed.
    3. Create and import the DB seed (see `docs/SETUP.md` for commands): `db/seed.sql` creates `hmedic_db` and sample rows.
    4. Open in your browser: `http://localhost/hmedic/` and login with one of the sample accounts.

    **Where to read more**
    - Setup & troubleshooting: `docs/SETUP.md`
    - API reference and examples: `docs/API.md`
    - How to contribute & run tests: `docs/CONTRIBUTING.md`
    - Security and responsible disclosure: `docs/SECURITY.md`

    If you'd like, I can also: add extra tests, add a single reset SQL file, or harden specific endpoints. Tell me which and I'll implement it.
  Run from project root (PowerShell):
