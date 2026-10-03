-- Drops the pre-"events" attendance system. Its data was folded into
-- events/event_attendance_records by the one-time migrate-legacy-sessions
-- admin route (run against production 2026-10-03; both tables verified empty
-- afterwards), and no code reads or writes these tables any more.
-- attendance_records goes first: it holds the foreign key to sessions.
DROP INDEX IF EXISTS idx_attendance_student_session;
DROP INDEX IF EXISTS idx_attendance_session;
DROP INDEX IF EXISTS idx_attendance_student;
DROP TABLE IF EXISTS attendance_records;
DROP INDEX IF EXISTS idx_sessions_date;
DROP TABLE IF EXISTS sessions;
