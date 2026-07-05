-- Promote the earliest-created user account to 'owner'. Everyone else stays
-- 'admin'. This is data-only (no schema change) and safe to re-run since it
-- always targets the single oldest account.
UPDATE users
SET role = 'owner'
WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1);
