-- PYB Attendance Schema
-- Cloudflare D1 (SQLite)

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS attendance_records;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  birthday TEXT NOT NULL,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  session_date TEXT NOT NULL UNIQUE,
  start_time TEXT NOT NULL DEFAULT '09:00',
  late_threshold_minutes INTEGER NOT NULL DEFAULT 15,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE attendance_records (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('present','absent','late')),
  check_in_timestamp TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(student_id, session_id),
  FOREIGN KEY(student_id) REFERENCES students(id),
  FOREIGN KEY(session_id) REFERENCES sessions(id)
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX idx_students_active ON students(active);
CREATE INDEX idx_sessions_date ON sessions(session_date);
CREATE INDEX idx_attendance_student_session ON attendance_records(student_id, session_id);
CREATE INDEX idx_attendance_session ON attendance_records(session_id);
CREATE INDEX idx_attendance_student ON attendance_records(student_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
