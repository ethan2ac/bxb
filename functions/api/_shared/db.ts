export function generateId(prefix: string): string {
  const rand = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
  return `${prefix}_${rand}`;
}

export function now(): string {
  return new Date().toISOString();
}

// "Today" in the org's own timezone (Singapore, UTC+8), not the Worker
// runtime's UTC clock — during SGT midnight-8am, raw UTC "today" is still
// yesterday's date, which would otherwise misjudge same-day/past-day
// comparisons for anything gated on "has this occurrence already happened".
export function getOrgTodayDate(): string {
  const sgt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return sgt.toISOString().split('T')[0];
}

export const DEFAULT_SETTINGS = {
  no_show_threshold: '3',
  default_start_time: '09:00',
  default_late_threshold_minutes: '60',
};

export type SettingsMap = typeof DEFAULT_SETTINGS;

export async function getSettings(db: D1Database): Promise<SettingsMap> {
  const result = await db.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>();
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of result.results || []) {
    if (row.key in settings) {
      (settings as Record<string, string>)[row.key] = row.value;
    }
  }
  return settings;
}

// A check-in is simply "present" — the app no longer distinguishes late
// arrivals (in practice "late" mostly reflected when staff entered attendance,
// not when students arrived).
export function computeAttendanceStatus(checkInTimestamp: string | null): 'present' | 'absent' {
  return checkInTimestamp ? 'present' : 'absent';
}

// Brings stored attendance in line with how it should be read. Idempotent and
// cheap once caught up, so report endpoints call it before reading.
//
// 1. Folds any legacy 'late' rows into 'present'.
// 2. Since attendance saves per tap, a student nobody marked has no row at
//    all, which made them vanish from History instead of counting as absent.
//    Once an event's date has passed, every rostered student without a row
//    gets one: 'excused' (with the forecast's note) if their forecast said
//    excused, otherwise 'absent'. Only groups with at least one record at that
//    event are filled in — no records for a group means attendance wasn't
//    taken for it, not that everyone missed. Students created after the event
//    are skipped. INSERT OR IGNORE makes concurrent calls safe.
export async function reconcileAttendance(db: D1Database): Promise<void> {
  const ts = now();
  const today = getOrgTodayDate();
  const [, filled] = await db.batch([
    db.prepare("UPDATE event_attendance_records SET status = 'present', updated_at = ? WHERE status = 'late'").bind(ts),
    db
      .prepare(
        `INSERT OR IGNORE INTO event_attendance_records (id, student_id, event_id, status, check_in_timestamp, notes, created_at, updated_at)
         SELECT 'eatt_' || lower(hex(randomblob(6))), s.id, e.id,
           CASE WHEN f.expected = 'excused' THEN 'excused' ELSE 'absent' END,
           NULL,
           CASE WHEN f.expected = 'excused' THEN COALESCE(NULLIF(f.notes, ''), 'Excused on forecast') ELSE 'Not marked' END,
           ?, ?
         FROM events e
         JOIN students s ON s.active = 1
           AND (e.group_scope = 'BOTH' OR s.group_name = e.group_scope)
           AND substr(s.created_at, 1, 10) <= e.event_date
         LEFT JOIN forecasts f ON f.event_id = e.id AND f.student_id = s.id
         WHERE e.event_date < ?
           AND (e.restricted_roster = 0 OR EXISTS (SELECT 1 FROM event_invitees ei WHERE ei.event_id = e.id AND ei.student_id = s.id))
           AND NOT EXISTS (SELECT 1 FROM event_attendance_records r WHERE r.event_id = e.id AND r.student_id = s.id)
           AND EXISTS (
             SELECT 1 FROM event_attendance_records r2 JOIN students s2 ON s2.id = r2.student_id
             WHERE r2.event_id = e.id AND s2.group_name = s.group_name
           )`,
      )
      .bind(ts, ts, today),
  ]);
  const inserted = filled.meta?.changes ?? 0;
  if (inserted > 0) {
    await db
      .prepare(
        `INSERT INTO audit_logs (id, actor_user_id, entity_type, entity_id, action, metadata, created_at)
         VALUES (?, NULL, 'event', 'auto-absent', 'auto_absent', ?, ?)`,
      )
      .bind(generateId('log'), JSON.stringify({ recordsAdded: inserted, before: today }), ts)
      .run();
  }
}

export interface NoShowStudent {
  id: string;
  name: string;
  consecutive_absences: number;
  last_attended_date: string | null;
}

export const DEFAULT_NO_SHOW_THRESHOLD = 3;

export function studentDisplayName(englishName: string | null, chineseName: string | null): string {
  if (englishName && chineseName) return `${englishName}/${chineseName}`;
  return englishName || chineseName || '';
}

// students.english_name/age are NOT NULL at the DB level (D1 enforces foreign keys on
// --remote, which ruled out relaxing these via a table rebuild — see migrations/0002).
// JDY students have no English name and no tracked age, so: store their Chinese name in
// english_name (their only name — chinese_name stays NULL for them), and use age=0 as a
// documented "not tracked" sentinel. This resolves the value actually written to those two
// columns regardless of what the client sent.
export function resolveStudentNameAndAge(body: {
  english_name?: unknown;
  chinese_name?: unknown;
  age?: unknown;
}): { englishName: string; age: number } {
  const englishName = body.english_name
    ? String(body.english_name).trim()
    : body.chinese_name
      ? String(body.chinese_name).trim()
      : '';
  const age = typeof body.age === 'number' && body.age > 0 ? body.age : 0;
  return { englishName, age };
}

// Bulk-attaches each event's restricted-roster invitee ids (empty array when
// not restricted) so list/detail GET responses don't need a per-event query.
export async function attachInviteeIds<T extends { id: string }>(
  db: D1Database,
  events: T[],
): Promise<(T & { invitee_student_ids: string[] })[]> {
  if (events.length === 0) return [];
  const placeholders = events.map(() => '?').join(',');
  const rows = await db
    .prepare(`SELECT event_id, student_id FROM event_invitees WHERE event_id IN (${placeholders})`)
    .bind(...events.map((e) => e.id))
    .all<{ event_id: string; student_id: string }>();
  const byEvent = new Map<string, string[]>();
  for (const row of rows.results || []) {
    if (!byEvent.has(row.event_id)) byEvent.set(row.event_id, []);
    byEvent.get(row.event_id)!.push(row.student_id);
  }
  return events.map((e) => ({ ...e, invitee_student_ids: byEvent.get(e.id) || [] }));
}

interface Occurrence {
  id: string;
  date: string;
  groupScope: string;
}

export async function calculateNoShows(
  db: D1Database,
  threshold: number = DEFAULT_NO_SHOW_THRESHOLD,
  groupName?: string,
): Promise<NoShowStudent[]> {
  let studentQuery = 'SELECT id, english_name, chinese_name, group_name FROM students WHERE active = 1';
  const studentBindings: unknown[] = [];
  if (groupName) {
    studentQuery += ' AND group_name = ?';
    studentBindings.push(groupName);
  }
  const students = await db
    .prepare(studentQuery)
    .bind(...studentBindings)
    .all<{ id: string; english_name: string | null; chinese_name: string | null; group_name: string }>();

  // Events with zero attendance taken are excluded — otherwise every
  // future/untouched event would wrongly count as a missed occurrence for
  // everyone in scope.
  const events = await db
    .prepare(
      `SELECT id, event_date, group_scope FROM events e
       WHERE EXISTS (SELECT 1 FROM event_attendance_records WHERE event_id = e.id)`,
    )
    .all<{ id: string; event_date: string; group_scope: string }>();

  if (!students.results) return [];

  const occurrences: Occurrence[] = (events.results || [])
    .map((e) => ({ id: e.id, date: e.event_date, groupScope: e.group_scope }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  if (occurrences.length === 0) return [];

  const occurrenceAppliesToGroup = (occurrence: Occurrence, group: string): boolean =>
    occurrence.groupScope === 'BOTH' || occurrence.groupScope === group;

  const noShows: NoShowStudent[] = [];

  for (const student of students.results) {
    const eventRecords = await db
      .prepare(
        `SELECT ear.event_id as id, ear.status, e.event_date as date
         FROM event_attendance_records ear
         JOIN events e ON e.id = ear.event_id
         WHERE ear.student_id = ?`,
      )
      .bind(student.id)
      .all<{ id: string; status: string; date: string }>();

    const eventStatusById = new Map<string, string>();
    for (const r of eventRecords.results || []) eventStatusById.set(r.id, r.status);

    // For the "most recent attendance ever" fallback below — sorted DESC the
    // same way as the occurrence walk.
    const allRecords = [...(eventRecords.results || [])].sort((a, b) => b.date.localeCompare(a.date));

    let consecutiveAbsences = 0;
    let lastAttended: string | null = null;

    for (const occurrence of occurrences) {
      if (!occurrenceAppliesToGroup(occurrence, student.group_name)) continue;
      const status = eventStatusById.get(occurrence.id);
      if (status === 'present') {
        if (!lastAttended) lastAttended = occurrence.date;
        break;
      }
      // Excused absences are skipped entirely: they neither break the streak
      // nor count toward it, since the student had a legitimate reason to miss.
      if (status === 'excused') continue;
      consecutiveAbsences++;
    }

    if (consecutiveAbsences > threshold) {
      if (!lastAttended) {
        for (const r of allRecords) {
          if (r.status === 'present') {
            lastAttended = r.date;
            break;
          }
        }
      }
      noShows.push({
        id: student.id,
        name: studentDisplayName(student.english_name, student.chinese_name),
        consecutive_absences: consecutiveAbsences,
        last_attended_date: lastAttended,
      });
    }
  }

  return noShows;
}
