-- =====================================================
-- hmedic_db — Fully populated database schema
-- =====================================================

-- Create database
CREATE DATABASE IF NOT EXISTS hmedic_db;
USE hmedic_db;

-- ========================
-- STAFF TABLE
-- ========================
DROP TABLE IF EXISTS staff;
CREATE TABLE staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL
);

-- Hashed passwords (bcrypt)
INSERT INTO staff (username, password, role) VALUES
('admin', '$2y$10$YCXIO2Erh0ji6y0QkP5Gj.K2JwEJNtD1WutrOGt5GmWwZG/VxYo6i', 'Admin'),
('reception_mary', '$2y$10$HS8t7RaoaSAdUviyPgP6zuqKjTU8XWPNkVHf4FIOX5g/HRJOlnzTq', 'Receptionist'),
('doctor_john', '$2y$10$R05zMA24CyDJOVGxthLkCukM1AwFwaFW./nxiUb.KBBFhTYOGA092', 'Doctor'),
('nurse_anne', '$2y$10$GCtT8rucDHfIBpmciGskaO.MSdCvHw/EvEEHzGgAHO11qOjr4oODO', 'Nurse');

-- ========================
-- PATIENTS TABLE
-- ========================
DROP TABLE IF EXISTS patients;
CREATE TABLE patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  age INT NOT NULL,
  gender VARCHAR(20),
  doctor VARCHAR(100),
  date DATE
);

INSERT INTO patients (name, age, gender, doctor, date) VALUES
('John Doe', 30, 'Male', 'doctor_john', '2025-10-10'),
('Jane Roe', 45, 'Female', 'doctor_john', '2025-10-11'),
('Samuel Kamau', 28, 'Male', 'doctor_john', '2025-10-15'),
('Mary Wanjiku', 34, 'Female', 'doctor_john', '2025-10-16'),
('Kelvin Otieno', 55, 'Male', 'doctor_john', '2025-10-17'),
('Lucy Njeri', 23, 'Female', 'doctor_john', '2025-10-18');

-- ========================
-- APPOINTMENTS TABLE
-- ========================
DROP TABLE IF EXISTS appointments;
CREATE TABLE appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_name VARCHAR(100),
  doctor VARCHAR(100),
  date DATE,
  time VARCHAR(20),
  status VARCHAR(50)
);

INSERT INTO appointments (patient_name, doctor, date, time, status) VALUES
('John Doe', 'doctor_john', '2025-10-20', '09:00 AM', 'Pending'),
('Jane Roe', 'doctor_john', '2025-10-21', '10:00 AM', 'Completed'),
('Samuel Kamau', 'doctor_john', '2025-10-22', '11:30 AM', 'Cancelled'),
('Mary Wanjiku', 'doctor_john', '2025-10-23', '01:00 PM', 'Pending'),
('Lucy Njeri', 'doctor_john', '2025-10-24', '03:30 PM', 'Completed');

-- ========================
-- BILLING TABLE
-- ========================
DROP TABLE IF EXISTS billing;
CREATE TABLE billing (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_name VARCHAR(100),
  amount DECIMAL(10,2),
  date DATE,
  status VARCHAR(50)
);

INSERT INTO billing (patient_name, amount, date, status) VALUES
('John Doe', 1200.00, '2025-10-10', 'Paid'),
('Jane Roe', 800.00, '2025-10-11', 'Pending'),
('Samuel Kamau', 650.00, '2025-10-15', 'Paid'),
('Mary Wanjiku', 980.00, '2025-10-16', 'Pending'),
('Kelvin Otieno', 450.00, '2025-10-17', 'Paid'),
('Lucy Njeri', 1100.00, '2025-10-18', 'Paid');

COMMIT;
