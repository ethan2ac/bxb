export function generateId(prefix: string): string {
  const rand = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
  return `${prefix}_${rand}`;
}

export function now(): string {
  return new Date().toISOString();
}

export const DEFAULT_SETTINGS = {
  no_show_threshold: '3',
  default_start_time: '09:00',
  default_late_threshold_minutes: '15',
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

export function computeAttendanceStatus(
  checkInTimestamp: string | null,
  sessionStartTime: string,
  lateThresholdMinutes: number,
): 'present' | 'absent' | 'late' {
  if (!checkInTimestamp) return 'absent';
  const checkIn = new Date(checkInTimestamp);
  const [hours, minutes] = sessionStartTime.split(':').map(Number);
  const sessionDate = checkInTimestamp.split('T')[0];
  const threshold = new Date(`${sessionDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`);
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

export async function calculateNoShows(
  db: D1Database,
  threshold: number = DEFAULT_NO_SHOW_THRESHOLD,
): Promise<NoShowStudent[]> {
  const students = await db
    .prepare('SELECT id, english_name, chinese_name FROM students WHERE active = 1')
    .all<{ id: string; english_name: string; chinese_name: string | null }>();

  const sessions = await db
    .prepare('SELECT id, session_date FROM sessions ORDER BY session_date DESC')
    .all<{ id: string; session_date: string }>();

  if (!students.results || !sessions.results || sessions.results.length === 0) return [];

  const noShows: NoShowStudent[] = [];

  for (const student of students.results) {
    const records = await db
      .prepare(
        `SELECT ar.status, s.session_date
         FROM attendance_records ar
         JOIN sessions s ON s.id = ar.session_id
         WHERE ar.student_id = ?
         ORDER BY s.session_date DESC`,
      )
      .bind(student.id)
      .all<{ status: string; session_date: string }>();

    const recordMap = new Map<string, string>();
    if (records.results) {
      for (const r of records.results) {
        recordMap.set(r.session_date, r.status);
      }
    }

    let consecutiveAbsences = 0;
    let lastAttended: string | null = null;

    for (const session of sessions.results) {
      const status = recordMap.get(session.session_date);
      if (status === 'present' || status === 'late') {
        if (!lastAttended) lastAttended = session.session_date;
        break;
      }
      // Excused absences are skipped entirely: they neither break the streak
      // nor count toward it, since the student had a legitimate reason to miss.
      if (status === 'excused') continue;
      consecutiveAbsences++;
    }

    if (consecutiveAbsences > threshold) {
      if (!lastAttended && records.results) {
        for (const r of records.results) {
          if (r.status === 'present' || r.status === 'late') {
            lastAttended = r.session_date;
            break;
          }
        }
      }
      noShows.push({
        id: student.id,
        name: student.chinese_name
          ? `${student.english_name}/${student.chinese_name}`
          : student.english_name,
        consecutive_absences: consecutiveAbsences,
        last_attended_date: lastAttended,
      });
    }
  }

  return noShows;
}
