-- JDY no longer distinguishes Coordinator/JDY Member/Mentor roles — every JDY
-- student just gets a single 'JDY' level going forward, so collapse the
-- existing role values on file to match. Data-only, safe to re-run.
UPDATE students SET level = 'JDY' WHERE group_name = 'JDY';
