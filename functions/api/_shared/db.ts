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

// Singapore doesn't observe DST, so +08:00 is always correct — this is a
// fixed-timezone app, not a per-user-timezone one. Building the threshold
// with an explicit offset (rather than a bare "Z", which silently treats a
// wall-clock "09:00" as 09:00 UTC = 5pm SGT) is what makes "late" match what
// the admin actually typed into the start-time field.
const ORG_UTC_OFFSET = '+08:00';

export function computeAttendanceStatus(
  checkInTimestamp: string | null,
  sessionStartTime: string,
  sessionDate: string,
  lateThresholdMinutes: number,
): 'present' | 'absent' | 'late' {
  if (!checkInTimestamp) return 'absent';
  const checkIn = new Date(checkInTimestamp);
  const [hours, minutes] = sessionStartTime.split(':').map(Number);
  // sessionDate must be the occurrence's own date (event_date/session_date),
  // never derived from checkInTimestamp — during the SGT midnight-8am window
  // a check-in's own UTC date lags a full calendar day behind the true SGT
  // date, which previously misdated the threshold and made genuinely early
  // check-ins compute as late.
  const threshold = new Date(
    `${sessionDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000${ORG_UTC_OFFSET}`,
  );
  threshold.setUTCMinutes(threshold.getUTCMinutes() + lateThresholdMinutes);
  return checkIn > threshold ? 'late' : 'present';
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
      if (status === 'present' || status === 'late') {
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
          if (r.status === 'present' || r.status === 'late') {
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
