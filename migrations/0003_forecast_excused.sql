-- Allow 'excused' as a forecast expectation (in addition to yes/no), so a student known
-- in advance to be excused from an event can be marked as such on the Forecast page too.
--
-- SQLite/D1 can't ALTER a CHECK constraint in place, so this rebuilds the table (copy ->
-- drop -> rename). Unlike the earlier students-table rebuild attempt (see migration 0002's
-- comment), nothing has a FOREIGN KEY pointing at forecasts.id, so dropping/recreating this
-- table carries none of the remote-D1 foreign-key-enforcement risk that forced students to
-- stay additive-only.

CREATE TABLE forecasts_new (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  expected TEXT NOT NULL CHECK(expected IN ('yes','no','excused')),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(student_id, event_id),
  FOREIGN KEY(student_id) REFERENCES students(id),
  FOREIGN KEY(event_id) REFERENCES events(id)
);

INSERT INTO forecasts_new (id, student_id, event_id, expected, notes, created_at, updated_at)
SELECT id, student_id, event_id, expected, notes, created_at, updated_at FROM forecasts;

DROP TABLE forecasts;
ALTER TABLE forecasts_new RENAME TO forecasts;

CREATE INDEX IF NOT EXISTS idx_forecasts_event ON forecasts(event_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_student ON forecasts(student_id);
