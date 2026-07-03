-- LOCAL DEV ONLY — never run this against --remote.
-- Wipes all tables so `npm run db:reset` can rebuild from migrations + seed.sql.

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS attendance_records;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS settings;
