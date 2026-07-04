import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Search, Save, Check, X as XIcon, Clock, CalendarOff } from 'lucide-react';
import { api } from '../lib/api';
import { useUiStore } from '../store/ui';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';
import { formatDate, formatTime } from '../utils/dates';
import { displayName } from '../utils/students';
import type { Student, CalendarEvent, EventAttendanceRecord, EventAttendanceEntry, AttendanceStatus } from '../types';

interface RosterEntry {
  student: Student;
  status: AttendanceStatus;
  check_in_timestamp: string | null;
  notes: string;
}

export function EventAttendancePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { addToast } = useUiStore();
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const eventData = await api.get<CalendarEvent>(`/api/events/${eventId}`);
      setEvent(eventData);

      const studentsUrl =
        eventData.group_scope === 'BOTH' ? '/api/students' : `/api/students?group=${eventData.group_scope}`;
      const [students, attendanceData] = await Promise.all([
        api.get<Student[]>(studentsUrl),
        api.get<{ event: CalendarEvent; records: EventAttendanceRecord[] }>(`/api/event-attendance?eventId=${eventId}`),
      ]);

      const recordMap = new Map<string, EventAttendanceRecord>();
      for (const r of attendanceData.records || []) {
        recordMap.set(r.student_id, r);
      }

      setRoster(
        students.map((student) => {
          const existing = recordMap.get(student.id);
          return {
            student,
            status: existing?.status || 'absent',
            check_in_timestamp: existing?.check_in_timestamp || null,
            notes: existing?.notes || '',
          };
        }),
      );
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load event', 'error');
    } finally {
      setLoading(false);
    }
  }, [eventId, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const cycleStatus = (studentId: string) => {
    setRoster((prev) =>
      prev.map((entry) => {
        if (entry.student.id !== studentId) return entry;

        if (entry.status === 'absent') {
          const ts = new Date().toISOString();
          let status: AttendanceStatus = 'present';
          if (event) {
            const [h, m] = event.start_time.split(':').map(Number);
            const threshold = new Date(
              `${event.event_date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`,
            );
            threshold.setUTCMinutes(threshold.getUTCMinutes() + event.late_threshold_minutes);
            if (new Date(ts) > threshold) status = 'late';
          }
          return { ...entry, status, check_in_timestamp: ts };
        }

        if (entry.status === 'present' || entry.status === 'late') {
          return { ...entry, status: 'excused', check_in_timestamp: null };
        }

        return { ...entry, status: 'absent', check_in_timestamp: null };
      }),
    );
  };

  const saveAttendance = async () => {
    if (!event) return;
    setSaving(true);
    try {
      const records: EventAttendanceEntry[] = roster.map((entry) => ({
        student_id: entry.student.id,
        status: entry.status,
        check_in_timestamp: entry.check_in_timestamp,
        notes: entry.notes || null,
      }));
      await api.post('/api/event-attendance/save', { event_id: event.id, records });
      addToast('Attendance saved successfully', 'success');
      await load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredRoster = roster.filter((entry) =>
    displayName(entry.student).toLowerCase().includes(search.toLowerCase()),
  );

  if (loading || !event) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <Link
        to="/schedule"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-400 transition-colors hover:text-ink-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Schedule
      </Link>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight-lg text-ink-900 md:text-5xl">{event.name}</h1>
          <p className="mt-2 text-base text-ink-400">{formatDate(event.event_date)}</p>
        </div>
        <button
          onClick={saveAttendance}
          disabled={saving}
          className="flex items-center gap-2 rounded-pill bg-accent-charcoal px-6 py-2.5 text-sm font-medium text-white shadow-pill transition-all hover:bg-accent-dark disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-card-sm border border-ink-200 bg-white py-3 pl-11 pr-4 text-sm text-ink-700 shadow-card placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400"
        />
      </div>
      <p className="text-xs text-ink-400">
        Tap the circle to cycle: absent &rarr; present &rarr; excused &rarr; absent.
      </p>

      <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
        {filteredRoster.length === 0 ? (
          <div className="p-12 text-center text-sm text-ink-400">
            {search ? 'No students match your search' : 'No students in this event\'s group'}
          </div>
        ) : (
          <div className="divide-y divide-ink-100">
            {filteredRoster.map((entry) => (
              <div
                key={entry.student.id}
                className={`flex items-center justify-between px-6 py-4 transition-colors ${
                  entry.status === 'late' ? 'bg-accent-yellow-soft' : 'hover:bg-ink-50/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => cycleStatus(entry.student.id)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                      entry.status === 'present'
                        ? 'bg-status-success text-white shadow-sm'
                        : entry.status === 'late'
                          ? 'bg-accent-yellow text-white shadow-sm'
                          : entry.status === 'excused'
                            ? 'bg-status-info text-white shadow-sm'
                            : 'border-2 border-ink-200 text-ink-300 hover:border-ink-300'
                    }`}
                    aria-label={`Toggle attendance for ${displayName(entry.student)}`}
                  >
                    {entry.status === 'excused' ? (
                      <CalendarOff className="h-4 w-4" />
                    ) : entry.status !== 'absent' ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <XIcon className="h-4 w-4" />
                    )}
                  </button>
                  <div>
                    <p className={`text-sm font-medium ${entry.status === 'late' ? 'text-accent-yellow-text' : 'text-ink-800'}`}>
                      {displayName(entry.student)}
                    </p>
                    {entry.check_in_timestamp && (
                      <p className="text-xs text-ink-400">Checked in {formatTime(entry.check_in_timestamp)}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {entry.status === 'late' && (
                    <Badge variant="late">
                      <Clock className="mr-0.5 h-3 w-3" />
                      Late
                    </Badge>
                  )}
                  {entry.status === 'present' && <Badge variant="present">Present</Badge>}
                  {entry.status === 'absent' && <Badge variant="absent">Absent</Badge>}
                  {entry.status === 'excused' && <Badge variant="excused">Excused</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
