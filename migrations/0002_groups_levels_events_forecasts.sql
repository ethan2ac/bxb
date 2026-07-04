-- Add BY/JDY groups + Level/Role, calendar events, forecasts.
-- Purely additive: ALTER TABLE ADD COLUMN (with defaults) + new sibling tables. No DROP TABLE
-- anywhere in this file.
--
-- An earlier version of this migration rebuilt the students table (copy -> drop -> rename) to
-- relax english_name/age to nullable for JDY students. That failed against the remote
-- production database: attendance_records.student_id holds a FOREIGN KEY to students(id), and
-- Cloudflare D1 enforces foreign keys on --remote (local Miniflare does not, which is why the
-- rebuild passed locally but failed remotely even with PRAGMA defer_foreign_keys). Rather than
-- fight D1's FK enforcement, english_name/age stay NOT NULL and JDY's "no English name / no
-- tracked age" is handled at the application layer instead: JDY students store their Chinese
-- name in english_name (their only name) and use age=0 as a documented "not tracked" sentinel
-- — enforced in functions/api/students/{index.ts,[id].ts} and hidden in the UI.

ALTER TABLE students ADD COLUMN group_name TEXT NOT NULL DEFAULT 'BY';
ALTER TABLE students ADD COLUMN level TEXT NOT NULL DEFAULT '';

-- Backfill the real Level for all 23 existing BY students, matched by english_name
-- (stable identifier already in the data — not by id, since this runs against production).
UPDATE students SET level = 'P4' WHERE english_name = 'Wong Kai Ming Kader';
UPDATE students SET level = 'P4' WHERE english_name = 'Lee Run Yuan';
UPDATE students SET level = 'P5' WHERE english_name = 'Yeo Pei Ling Rena';
UPDATE students SET level = 'P5' WHERE english_name = 'Averice Ong Yong Qing';
UPDATE students SET level = 'P5' WHERE english_name = 'Karl Chia Yi Heng';
UPDATE students SET level = 'P6' WHERE english_name = 'Lim Zhi Heng Davian';
UPDATE students SET level = 'P6' WHERE english_name = 'Goh Si Jun';
UPDATE students SET level = 'P6' WHERE english_name = 'Teo You Jia, Kirin';
UPDATE students SET level = 'P6' WHERE english_name = 'Chin Hong Wei';
UPDATE students SET level = 'S1' WHERE english_name = 'Isabel Eng Xin Ya';
UPDATE students SET level = 'S1' WHERE english_name = 'Yang Zhong Chuan Richard';
UPDATE students SET level = 'S1' WHERE english_name = 'Ang Xin Rong';
UPDATE students SET level = 'S1' WHERE english_name = 'Lloyd Chia Yi Cen';
UPDATE students SET level = 'S2' WHERE english_name = 'Ayden Hang Sheng Yang';
UPDATE students SET level = 'S2' WHERE english_name = 'Keng Reii Kym Vera';
UPDATE students SET level = 'S2' WHERE english_name = 'Kaden Chew Cheng Xi';
UPDATE students SET level = 'S2' WHERE english_name = 'Teo Jia Hui Kimberly';
UPDATE students SET level = 'S2' WHERE english_name = 'Peh Jia Hao Jayden';
UPDATE students SET level = 'S3' WHERE english_name = 'Seah Jia En';
UPDATE students SET level = 'S3' WHERE english_name = 'Ang Wei Ting';
UPDATE students SET level = 'S3' WHERE english_name = 'Xenon Chew Yong Jun';
UPDATE students SET level = 'S4' WHERE english_name = 'Han Hao En';
UPDATE students SET level = 'S4' WHERE english_name = 'Royston Keng Ray Hern';

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
