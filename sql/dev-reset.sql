-- LOCAL DEV ONLY — never run this against --remote.
-- Wipes all tables so `npm run db:reset` can rebuild from migrations + seed.sql.

-- Also drop wrangler's own migration-tracking table, otherwise it thinks
-- migrations/*.sql are already applied and skips re-running them against
-- the freshly-emptied database above.
DROP TABLE IF EXISTS d1_migrations;

DROP TABLE IF EXISTS forecasts;
DROP TABLE IF EXISTS event_attendance_records;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS attendance_records;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS settings;
