-- Add BY/JDY groups + Level/Role, calendar events, forecasts.
-- Additive/data-preserving: students is rebuilt (copy -> drop -> rename) only to relax
-- NOT NULL constraints that SQLite can't ALTER in place; no data is lost since everything
-- is copied into students_new before the old table is dropped. events/event_attendance_records/
-- forecasts are brand new sibling tables — the legacy sessions/attendance_records flow is
-- untouched.

CREATE TABLE students_new (
  id TEXT PRIMARY KEY,
  english_name TEXT,
  chinese_name TEXT,
  group_name TEXT NOT NULL DEFAULT 'BY' CHECK(group_name IN ('BY','JDY')),
  level TEXT NOT NULL DEFAULT '',
  age INTEGER,
  gender TEXT NOT NULL,
  birthday TEXT,
  phone TEXT,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (english_name IS NOT NULL OR chinese_name IS NOT NULL)
);

INSERT INTO students_new (id, english_name, chinese_name, group_name, level, age, gender,
  birthday, phone, description, active, created_at, updated_at)
SELECT id, english_name, chinese_name, 'BY', '', age, gender, birthday, phone, description,
  active, created_at, updated_at
FROM students;

-- Backfill the real Level for all 23 existing BY students, matched by english_name
-- (stable identifier already in the data — not by id, since this runs against production).
UPDATE students_new SET level = 'P4' WHERE english_name = 'Wong Kai Ming Kader';
UPDATE students_new SET level = 'P4' WHERE english_name = 'Lee Run Yuan';
UPDATE students_new SET level = 'P5' WHERE english_name = 'Yeo Pei Ling Rena';
UPDATE students_new SET level = 'P5' WHERE english_name = 'Averice Ong Yong Qing';
UPDATE students_new SET level = 'P5' WHERE english_name = 'Karl Chia Yi Heng';
UPDATE students_new SET level = 'P6' WHERE english_name = 'Lim Zhi Heng Davian';
UPDATE students_new SET level = 'P6' WHERE english_name = 'Goh Si Jun';
UPDATE students_new SET level = 'P6' WHERE english_name = 'Teo You Jia, Kirin';
UPDATE students_new SET level = 'P6' WHERE english_name = 'Chin Hong Wei';
UPDATE students_new SET level = 'S1' WHERE english_name = 'Isabel Eng Xin Ya';
UPDATE students_new SET level = 'S1' WHERE english_name = 'Yang Zhong Chuan Richard';
UPDATE students_new SET level = 'S1' WHERE english_name = 'Ang Xin Rong';
UPDATE students_new SET level = 'S1' WHERE english_name = 'Lloyd Chia Yi Cen';
UPDATE students_new SET level = 'S2' WHERE english_name = 'Ayden Hang Sheng Yang';
UPDATE students_new SET level = 'S2' WHERE english_name = 'Keng Reii Kym Vera';
UPDATE students_new SET level = 'S2' WHERE english_name = 'Kaden Chew Cheng Xi';
UPDATE students_new SET level = 'S2' WHERE english_name = 'Teo Jia Hui Kimberly';
UPDATE students_new SET level = 'S2' WHERE english_name = 'Peh Jia Hao Jayden';
UPDATE students_new SET level = 'S3' WHERE english_name = 'Seah Jia En';
UPDATE students_new SET level = 'S3' WHERE english_name = 'Ang Wei Ting';
UPDATE students_new SET level = 'S3' WHERE english_name = 'Xenon Chew Yong Jun';
UPDATE students_new SET level = 'S4' WHERE english_name = 'Han Hao En';
UPDATE students_new SET level = 'S4' WHERE english_name = 'Royston Keng Ray Hern';

DROP TABLE students;
ALTER TABLE students_new RENAME TO students;

CREATE INDEX IF NOT EXISTS idx_students_active ON students(active);
CREATE INDEX IF NOT EXISTS idx_students_group ON students(group_name);
CREATE INDEX IF NOT EXISTS idx_students_level ON students(level);

-- Calendar events: named, ad-hoc, any date, scoped to BY / JDY / BOTH.
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  event_date TEXT NOT NULL,
  group_scope TEXT NOT NULL CHECK(group_scope IN ('BY','JDY','BOTH')),
  start_time TEXT NOT NULL DEFAULT '09:00',
  late_threshold_minutes INTEGER NOT NULL DEFAULT 15,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_group_scope ON events(group_scope);

CREATE TABLE IF NOT EXISTS event_attendance_records (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('present','absent','late','excused')),
  check_in_timestamp TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(student_id, event_id),
  FOREIGN KEY(student_id) REFERENCES students(id),
  FOREIGN KEY(event_id) REFERENCES events(id)
);
CREATE INDEX IF NOT EXISTS idx_event_attendance_event ON event_attendance_records(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_student ON event_attendance_records(student_id);

CREATE TABLE IF NOT EXISTS forecasts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  expected TEXT NOT NULL CHECK(expected IN ('yes','no')),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(student_id, event_id),
  FOREIGN KEY(student_id) REFERENCES students(id),
  FOREIGN KEY(event_id) REFERENCES events(id)
);
CREATE INDEX IF NOT EXISTS idx_forecasts_event ON forecasts(event_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_student ON forecasts(student_id);
