-- Lets an event opt out of the default "everyone active in group_scope attends"
-- roster and instead hand-pick which students are expected. Additive only —
-- ADD COLUMN with a constant DEFAULT needs no table rebuild (same pattern as
-- students.group_name in migration 0002), and existing events default to
-- restricted_roster=0 (unchanged behavior).
ALTER TABLE events ADD COLUMN restricted_roster INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS event_invitees (
  event_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  PRIMARY KEY (event_id, student_id),
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);
CREATE INDEX IF NOT EXISTS idx_event_invitees_event ON event_invitees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_invitees_student ON event_invitees(student_id);
