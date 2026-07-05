import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Search, Save } from 'lucide-react';
import { api } from '../lib/api';
import { useUiStore } from '../store/ui';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { RosterPanel } from '../components/RosterPanel';
import { GroupSummaryTable } from '../components/GroupSummaryTable';
import { formatDate } from '../utils/dates';
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
  const isBoth = event?.group_scope === 'BOTH';
  const byRoster = filteredRoster.filter((e) => e.student.group_name === 'BY');
  const jdyRoster = filteredRoster.filter((e) => e.student.group_name === 'JDY');

  const groupStats = (entries: RosterEntry[]) => {
    const late = entries.filter((e) => e.status === 'late').length;
    const attended = entries.filter((e) => e.status === 'present' || e.status === 'late').length;
    const excused = entries.filter((e) => e.status === 'excused').length;
    const absent = entries.filter((e) => e.status === 'absent').length;
    return { present: attended - late, late, excused, absent, total: entries.length };
  };
  const byStats = groupStats(roster.filter((e) => e.student.group_name === 'BY'));
  const jdyStats = groupStats(roster.filter((e) => e.student.group_name === 'JDY'));
  const groupLabels = isBoth ? ['BY', 'JDY'] : [event?.group_scope === 'JDY' ? 'JDY' : 'BY'];
  const summaryStats = isBoth ? [byStats, jdyStats] : event?.group_scope === 'JDY' ? [jdyStats] : [byStats];

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

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 space-y-5">
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

          {isBoth ? (
            <div className="flex flex-col gap-5 md:flex-row">
              <RosterPanel
                title="BY"
                rows={byRoster}
                onCycle={cycleStatus}
                emptyMessage={search ? 'No BY students match your search' : 'No BY students in this event'}
              />
              <RosterPanel
                title="JDY"
                rows={jdyRoster}
                onCycle={cycleStatus}
                emptyMessage={search ? 'No JDY students match your search' : 'No JDY students in this event'}
              />
            </div>
          ) : (
            <RosterPanel
              rows={filteredRoster}
              onCycle={cycleStatus}
              emptyMessage={search ? 'No students match your search' : "No students in this event's group"}
            />
          )}
        </div>

        <div className="w-full space-y-5 lg:w-72">
          <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
            <h3 className="text-sm font-semibold text-ink-700">Attendance Summary</h3>
            <div className="mt-4">
              <GroupSummaryTable
                groupLabels={groupLabels}
                rows={[
                  { key: 'enrolled', label: 'Enrolled', values: summaryStats.map((s) => s.total) },
                  {
                    key: 'present',
                    label: 'Present',
                    dotClassName: 'bg-status-success',
                    values: summaryStats.map((s) => s.present),
                  },
                  {
                    key: 'late',
                    label: 'Late',
                    dotClassName: 'bg-accent-yellow',
                    values: summaryStats.map((s) => s.late),
                  },
                  {
                    key: 'excused',
                    label: 'Excused',
                    dotClassName: 'bg-status-info',
                    values: summaryStats.map((s) => s.excused),
                  },
                  {
                    key: 'absent',
                    label: 'Absent',
                    dotClassName: 'bg-status-danger/60',
                    values: summaryStats.map((s) => s.absent),
                  },
                ]}
              />
            </div>
          </div>

          <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
            <h3 className="text-sm font-semibold text-ink-700">Event Details</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-400">Start time</span>
                <span className="font-medium text-ink-700">{event.start_time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-400">Late after</span>
                <span className="font-medium text-ink-700">{event.late_threshold_minutes} min</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
