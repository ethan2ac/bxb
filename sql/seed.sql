-- PYB Attendance Seed Data
-- Default admin: admin@pyb.org / admin123

-- Admin user (password: admin123, PBKDF2-SHA256 hash)
INSERT INTO users (id, name, email, password_hash, role, active, created_at, updated_at)
VALUES (
  'usr_admin_001',
  'Admin',
  'admin@pyb.org',
  '100000:e22c57fcabda89d1ab3c947c0192363c:f643e101e55b4e0c8c8b21a1bc77adc5f099bad853cfdc830f86de48fefa637d',
  'admin',
  1,
  '2024-01-01T00:00:00.000Z',
  '2024-01-01T00:00:00.000Z'
);

-- Active students
INSERT INTO students (id, name, age, gender, birthday, description, active, created_at, updated_at)
VALUES
  ('stu_001', 'Emma Chen',      14, 'Female', '2010-03-15', 'Enthusiastic learner, always participates in discussions', 1, '2024-06-01T00:00:00.000Z', '2024-06-01T00:00:00.000Z'),
  ('stu_002', 'Liam Johnson',   13, 'Male',   '2011-07-22', 'Quiet but attentive, excels in written assignments',       1, '2024-06-01T00:00:00.000Z', '2024-06-01T00:00:00.000Z'),
  ('stu_003', 'Sofia Rodriguez', 15, 'Female', '2009-11-03', 'Natural leader, helps other students',                     1, '2024-06-01T00:00:00.000Z', '2024-06-01T00:00:00.000Z'),
  ('stu_004', 'Noah Williams',   12, 'Male',   '2012-01-28', 'New to the program, adjusting well',                       1, '2024-06-01T00:00:00.000Z', '2024-06-01T00:00:00.000Z'),
  ('stu_005', 'Mia Thompson',    14, 'Female', '2010-09-10', 'Creative thinker, strong in group projects',               1, '2024-06-01T00:00:00.000Z', '2024-06-01T00:00:00.000Z'),
  ('stu_006', 'James Park',      13, 'Male',   '2011-05-17', 'Consistent performer, rarely misses class',                1, '2024-06-01T00:00:00.000Z', '2024-06-01T00:00:00.000Z');

-- Archived student
INSERT INTO students (id, name, age, gender, birthday, description, active, created_at, updated_at)
VALUES
  ('stu_007', 'Olivia Davis', 16, 'Female', '2008-12-05', 'Moved to another city', 0, '2024-03-01T00:00:00.000Z', '2024-08-15T00:00:00.000Z');

-- Recent Sunday sessions (using dates that are actual Sundays near mid-2025)
INSERT INTO sessions (id, session_date, start_time, late_threshold_minutes, notes, created_at, updated_at)
VALUES
  ('ses_001', '2025-06-01', '09:00', 15, 'Regular Sunday session',           '2025-06-01T08:00:00.000Z', '2025-06-01T08:00:00.000Z'),
  ('ses_002', '2025-06-08', '09:00', 15, 'Guest speaker week',               '2025-06-08T08:00:00.000Z', '2025-06-08T08:00:00.000Z'),
  ('ses_003', '2025-06-15', '09:00', 15, 'Review session',                   '2025-06-15T08:00:00.000Z', '2025-06-15T08:00:00.000Z'),
  ('ses_004', '2025-06-22', '09:00', 15, 'End of month wrap-up',             '2025-06-22T08:00:00.000Z', '2025-06-22T08:00:00.000Z'),
  ('ses_005', '2025-06-29', '09:00', 15, 'New month prep',                  '2025-06-29T08:00:00.000Z', '2025-06-29T08:00:00.000Z');

-- Attendance records
-- Session 1 (Jun 1): Everyone present, Liam late
INSERT INTO attendance_records (id, student_id, session_id, status, check_in_timestamp, notes, created_at, updated_at)
VALUES
  ('att_001', 'stu_001', 'ses_001', 'present', '2025-06-01T08:55:00.000Z', NULL,               '2025-06-01T09:00:00.000Z', '2025-06-01T09:00:00.000Z'),
  ('att_002', 'stu_002', 'ses_001', 'late',    '2025-06-01T09:22:00.000Z', 'Traffic delay',     '2025-06-01T09:22:00.000Z', '2025-06-01T09:22:00.000Z'),
  ('att_003', 'stu_003', 'ses_001', 'present', '2025-06-01T08:50:00.000Z', NULL,               '2025-06-01T09:00:00.000Z', '2025-06-01T09:00:00.000Z'),
  ('att_004', 'stu_004', 'ses_001', 'present', '2025-06-01T08:58:00.000Z', NULL,               '2025-06-01T09:00:00.000Z', '2025-06-01T09:00:00.000Z'),
  ('att_005', 'stu_005', 'ses_001', 'present', '2025-06-01T09:00:00.000Z', NULL,               '2025-06-01T09:00:00.000Z', '2025-06-01T09:00:00.000Z'),
  ('att_006', 'stu_006', 'ses_001', 'present', '2025-06-01T08:45:00.000Z', 'Arrived early',     '2025-06-01T09:00:00.000Z', '2025-06-01T09:00:00.000Z');

-- Session 2 (Jun 8): Noah absent (1st consecutive), Mia late
INSERT INTO attendance_records (id, student_id, session_id, status, check_in_timestamp, notes, created_at, updated_at)
VALUES
  ('att_007', 'stu_001', 'ses_002', 'present', '2025-06-08T08:52:00.000Z', NULL,               '2025-06-08T09:00:00.000Z', '2025-06-08T09:00:00.000Z'),
  ('att_008', 'stu_002', 'ses_002', 'present', '2025-06-08T09:05:00.000Z', NULL,               '2025-06-08T09:05:00.000Z', '2025-06-08T09:05:00.000Z'),
  ('att_009', 'stu_003', 'ses_002', 'present', '2025-06-08T08:48:00.000Z', NULL,               '2025-06-08T09:00:00.000Z', '2025-06-08T09:00:00.000Z'),
  ('att_010', 'stu_004', 'ses_002', 'absent',  NULL,                       'Family event',      '2025-06-08T09:00:00.000Z', '2025-06-08T09:00:00.000Z'),
  ('att_011', 'stu_005', 'ses_002', 'late',    '2025-06-08T09:25:00.000Z', 'Overslept',         '2025-06-08T09:25:00.000Z', '2025-06-08T09:25:00.000Z'),
  ('att_012', 'stu_006', 'ses_002', 'present', '2025-06-08T08:50:00.000Z', NULL,               '2025-06-08T09:00:00.000Z', '2025-06-08T09:00:00.000Z');

-- Session 3 (Jun 15): Noah absent (2nd consecutive)
INSERT INTO attendance_records (id, student_id, session_id, status, check_in_timestamp, notes, created_at, updated_at)
VALUES
  ('att_013', 'stu_001', 'ses_003', 'present', '2025-06-15T08:57:00.000Z', NULL,               '2025-06-15T09:00:00.000Z', '2025-06-15T09:00:00.000Z'),
  ('att_014', 'stu_002', 'ses_003', 'present', '2025-06-15T09:02:00.000Z', NULL,               '2025-06-15T09:02:00.000Z', '2025-06-15T09:02:00.000Z'),
  ('att_015', 'stu_003', 'ses_003', 'present', '2025-06-15T08:53:00.000Z', NULL,               '2025-06-15T09:00:00.000Z', '2025-06-15T09:00:00.000Z'),
  ('att_016', 'stu_004', 'ses_003', 'absent',  NULL,                       'Still unavailable',  '2025-06-15T09:00:00.000Z', '2025-06-15T09:00:00.000Z'),
  ('att_017', 'stu_005', 'ses_003', 'present', '2025-06-15T08:59:00.000Z', NULL,               '2025-06-15T09:00:00.000Z', '2025-06-15T09:00:00.000Z'),
  ('att_018', 'stu_006', 'ses_003', 'present', '2025-06-15T08:47:00.000Z', NULL,               '2025-06-15T09:00:00.000Z', '2025-06-15T09:00:00.000Z');

-- Session 4 (Jun 22): Noah absent (3rd consecutive), Liam absent (1st)
-- After this, Noah has 3 consecutive absences but we need >3 for no-show
-- Let's add one more implicit: Noah also missed the next session to trigger no-show
INSERT INTO attendance_records (id, student_id, session_id, status, check_in_timestamp, notes, created_at, updated_at)
VALUES
  ('att_019', 'stu_001', 'ses_004', 'present', '2025-06-22T08:54:00.000Z', NULL,               '2025-06-22T09:00:00.000Z', '2025-06-22T09:00:00.000Z'),
  ('att_020', 'stu_002', 'ses_004', 'absent',  NULL,                       'Sick',              '2025-06-22T09:00:00.000Z', '2025-06-22T09:00:00.000Z'),
  ('att_021', 'stu_003', 'ses_004', 'present', '2025-06-22T08:51:00.000Z', NULL,               '2025-06-22T09:00:00.000Z', '2025-06-22T09:00:00.000Z'),
  ('att_022', 'stu_004', 'ses_004', 'absent',  NULL,                       'No contact',        '2025-06-22T09:00:00.000Z', '2025-06-22T09:00:00.000Z'),
  ('att_023', 'stu_005', 'ses_004', 'present', '2025-06-22T09:01:00.000Z', NULL,               '2025-06-22T09:01:00.000Z', '2025-06-22T09:01:00.000Z'),
  ('att_024', 'stu_006', 'ses_004', 'present', '2025-06-22T08:48:00.000Z', NULL,               '2025-06-22T09:00:00.000Z', '2025-06-22T09:00:00.000Z');

-- Session 5 (Jun 29): Noah absent (4th consecutive = triggers no-show)
INSERT INTO attendance_records (id, student_id, session_id, status, check_in_timestamp, notes, created_at, updated_at)
VALUES
  ('att_025', 'stu_001', 'ses_005', 'present', '2025-06-29T08:53:00.000Z', NULL,               '2025-06-29T09:00:00.000Z', '2025-06-29T09:00:00.000Z'),
  ('att_026', 'stu_002', 'ses_005', 'present', '2025-06-29T09:03:00.000Z', NULL,               '2025-06-29T09:03:00.000Z', '2025-06-29T09:03:00.000Z'),
  ('att_027', 'stu_003', 'ses_005', 'present', '2025-06-29T08:49:00.000Z', NULL,               '2025-06-29T09:00:00.000Z', '2025-06-29T09:00:00.000Z'),
  ('att_028', 'stu_004', 'ses_005', 'absent',  NULL,                       'Still unreachable', '2025-06-29T09:00:00.000Z', '2025-06-29T09:00:00.000Z'),
  ('att_029', 'stu_005', 'ses_005', 'present', '2025-06-29T08:56:00.000Z', NULL,               '2025-06-29T09:00:00.000Z', '2025-06-29T09:00:00.000Z'),
  ('att_030', 'stu_006', 'ses_005', 'present', '2025-06-29T08:44:00.000Z', NULL,               '2025-06-29T09:00:00.000Z', '2025-06-29T09:00:00.000Z');
