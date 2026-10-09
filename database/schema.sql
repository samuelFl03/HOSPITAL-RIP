CREATE DATABASE IF NOT EXISTS hospital_rip CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hospital_rip;
CREATE TABLE IF NOT EXISTS users (
 id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100) NOT NULL, email VARCHAR(160) NOT NULL UNIQUE,
 password_hash VARCHAR(180) NOT NULL, role ENUM('admin','supervisor','chief') NOT NULL,
 active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash CHAR(64) PRIMARY KEY, user_id INT NOT NULL, expires_at DATETIME NOT NULL,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS departments (
 id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100) NOT NULL UNIQUE, description VARCHAR(400) NOT NULL DEFAULT '',
 color VARCHAR(7) NOT NULL DEFAULT '#527da8', active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS doctors (
 id INT PRIMARY KEY AUTO_INCREMENT, identification VARCHAR(30) NOT NULL UNIQUE, name VARCHAR(100) NOT NULL,
 specialty VARCHAR(100) NOT NULL, department_id INT NOT NULL, email VARCHAR(160) NOT NULL DEFAULT '',
 active BOOLEAN NOT NULL DEFAULT TRUE, FOREIGN KEY(department_id) REFERENCES departments(id)
);
CREATE TABLE IF NOT EXISTS availability (
 id INT PRIMARY KEY AUTO_INCREMENT, doctor_id INT NOT NULL, starts_at DATETIME NOT NULL, ends_at DATETIME NOT NULL,
 FOREIGN KEY(doctor_id) REFERENCES doctors(id), CHECK(ends_at > starts_at), INDEX(doctor_id,starts_at)
);
CREATE TABLE IF NOT EXISTS plans (
 id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(120) NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL,
 status ENUM('draft','pending','approved','rejected') NOT NULL DEFAULT 'draft',
 author_id INT NOT NULL, reviewer_id INT NULL, review_note VARCHAR(1000) NOT NULL DEFAULT '',
 version INT NOT NULL DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(author_id) REFERENCES users(id), FOREIGN KEY(reviewer_id) REFERENCES users(id), CHECK(end_date >= start_date)
);
CREATE TABLE IF NOT EXISTS shifts (
 id INT PRIMARY KEY AUTO_INCREMENT, plan_id INT NOT NULL, department_id INT NOT NULL, doctor_id INT NULL,
 starts_at DATETIME NOT NULL, ends_at DATETIME NOT NULL, label VARCHAR(100) NOT NULL,
 FOREIGN KEY(plan_id) REFERENCES plans(id), FOREIGN KEY(department_id) REFERENCES departments(id),
 FOREIGN KEY(doctor_id) REFERENCES doctors(id), CHECK(ends_at > starts_at), INDEX(doctor_id,starts_at)
);
CREATE TABLE IF NOT EXISTS tasks (
 id INT PRIMARY KEY AUTO_INCREMENT, plan_id INT NOT NULL, shift_id INT NULL, department_id INT NOT NULL,
 title VARCHAR(180) NOT NULL, priority ENUM('high','normal') NOT NULL DEFAULT 'high',
 FOREIGN KEY(plan_id) REFERENCES plans(id), FOREIGN KEY(shift_id) REFERENCES shifts(id), FOREIGN KEY(department_id) REFERENCES departments(id)
);
CREATE TABLE IF NOT EXISTS audit (
 id INT PRIMARY KEY AUTO_INCREMENT, user_id INT NULL, action VARCHAR(100) NOT NULL, entity VARCHAR(50) NOT NULL,
 entity_id INT NULL, detail VARCHAR(1000) NOT NULL DEFAULT '', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS locks (id INT PRIMARY KEY);
INSERT IGNORE INTO locks(id) VALUES(1);
CREATE TABLE IF NOT EXISTS workers (
 id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(100) NOT NULL,
 identification VARCHAR(30) NOT NULL UNIQUE, position VARCHAR(100) NOT NULL,
 rate_cents BIGINT NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE, CHECK(rate_cents>0)
);
CREATE TABLE IF NOT EXISTS payrolls (
 id INT PRIMARY KEY AUTO_INCREMENT, worker_id INT NOT NULL,
 worker_name VARCHAR(100) NOT NULL, identification VARCHAR(30) NOT NULL,
 start_date DATE NOT NULL, end_date DATE NOT NULL, minutes INT NOT NULL,
 total_cents BIGINT NOT NULL, status ENUM('pending','paid') NOT NULL DEFAULT 'pending',
 created_by INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 paid_at DATETIME NULL, paid_by INT NULL, reference VARCHAR(100) NOT NULL DEFAULT '',
 FOREIGN KEY(worker_id) REFERENCES workers(id), FOREIGN KEY(created_by) REFERENCES users(id),
 FOREIGN KEY(paid_by) REFERENCES users(id), CHECK(end_date>=start_date), CHECK(total_cents>0)
);
CREATE TABLE IF NOT EXISTS work_hours (
 id INT PRIMARY KEY AUTO_INCREMENT, worker_id INT NOT NULL, starts_at DATETIME NOT NULL,
 ends_at DATETIME NOT NULL, minutes INT NOT NULL, rate_cents BIGINT NOT NULL,
 note VARCHAR(400) NOT NULL DEFAULT '', payroll_id INT NULL,
 FOREIGN KEY(worker_id) REFERENCES workers(id), FOREIGN KEY(payroll_id) REFERENCES payrolls(id),
 CHECK(ends_at>starts_at), CHECK(minutes>0 AND minutes<=1440), CHECK(rate_cents>0), INDEX(worker_id,starts_at)
);
