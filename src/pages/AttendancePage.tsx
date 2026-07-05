import { useState, useEffect, useCallback } from 'react';
import { Search, Save, CalendarOff } from 'lucide-react';
import { api } from '../lib/api';
import { useUiStore } from '../store/ui';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { RosterPanel } from '../components/RosterPanel';
import { GroupSummaryTable } from '../components/GroupSummaryTable';
import { EmptyState } from '../components/EmptyState';
import { getDefaultSessionDate, formatDate } from '../utils/dates';
import { displayName } from '../utils/students';
import type {
  Student,
  Session,
  AttendanceRecord,
  AttendanceEntry,
  AttendanceStatus,
  AppSettings,
  CalendarEvent,
  GroupName,
} from '../types';

interface RosterEntry {
  student: Student;
  status: AttendanceStatus;
  check_in_timestamp: string | null;
  notes: string;
  existingRecordId: string | null;
}

export function AttendancePage() {
  const { addToast } = useUiStore();
  const [sessionDate, setSessionDate] = useState(getDefaultSessionDate);
  const [session, setSession] = useState<Session | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [todaysEvents, setTodaysEvents] = useState<CalendarEvent[]>([]);
  const [activeGroups, setActiveGroups] = useState<GroupName[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const dayEvents = await api.get<CalendarEvent[]>(`/api/events?date=${sessionDate}`);
      setTodaysEvents(dayEvents);

      if (dayEvents.length === 0) {
        setSession(null);
        setRoster([]);
        setActiveGroups([]);
        return;
      }

      const scopes = new Set(dayEvents.map((e) => e.group_scope));
      const groups: GroupName[] =
        scopes.has('BOTH') || (scopes.has('BY') && scopes.has('JDY'))
          ? ['BY', 'JDY']
          : scopes.has('JDY')
            ? ['JDY']
            : ['BY'];
      setActiveGroups(groups);

      const [allStudents, settings] = await Promise.all([
        api.get<Student[]>('/api/students'),
        api.get<AppSettings>('/api/settings'),
      ]);
      const students = allStudents.filter((s) => groups.includes(s.group_name));

      let currentSession: Session | null = null;
      let records: AttendanceRecord[] = [];

      try {
        const result = await api.post<Session>('/api/sessions', {
          session_date: sessionDate,
          start_time: settings.default_start_time,
          late_threshold_minutes: parseInt(settings.default_late_threshold_minutes, 10),
        });
        currentSession = result;
      } catch {
        currentSession = null;
      }

      if (currentSession) {
        const attendanceData = await api.get<{
          session: Session;
          records: AttendanceRecord[];
        }>(`/api/attendance?sessionId=${currentSession.id}`);
        records = attendanceData.records || [];
        setSession(attendanceData.session || currentSession);
      }

      const recordMap = new Map<string, AttendanceRecord>();
      for (const r of records) {
        recordMap.set(r.student_id, r);
      }

      const rosterEntries: RosterEntry[] = students.map((student) => {
        const existing = recordMap.get(student.id);
        return {
          student,
          status: existing?.status || 'absent',
          check_in_timestamp: existing?.check_in_timestamp || null,
          notes: existing?.notes || '',
          existingRecordId: existing?.id || null,
        };
      });

      setRoster(rosterEntries);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [sessionDate, addToast]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // Cycles each student through: absent -> present/late (auto-detected) -> excused -> absent
  const cycleStatus = (studentId: string) => {
    setRoster((prev) =>
      prev.map((entry) => {
        if (entry.student.id !== studentId) return entry;

        if (entry.status === 'absent') {
          const ts = new Date().toISOString();
          let status: AttendanceStatus = 'present';
          if (session) {
            const [h, m] = session.start_time.split(':').map(Number);
            const threshold = new Date(
              `${sessionDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`,
            );
            threshold.setUTCMinutes(threshold.getUTCMinutes() + session.late_threshold_minutes);
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
    if (!session) return;
    setSaving(true);
    try {
      const records: AttendanceEntry[] = roster.map((entry) => ({
        student_id: entry.student.id,
        status: entry.status,
        check_in_timestamp: entry.check_in_timestamp,
        notes: entry.notes || null,
      }));
      await api.post('/api/attendance/save', {
        session_id: session.id,
        records,
      });
      addToast('Attendance saved successfully', 'success');
      await loadAttendance();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSessionDate(e.target.value);
  };

  const filteredRoster = roster.filter((entry) =>
    displayName(entry.student).toLowerCase().includes(search.toLowerCase()),
  );
  const byRoster = filteredRoster.filter((e) => e.student.group_name === 'BY');
  const jdyRoster = filteredRoster.filter((e) => e.student.group_name === 'JDY');
  const showBY = activeGroups.includes('BY');
  const showJDY = activeGroups.includes('JDY');
  const isBoth = showBY && showJDY;

  const groupStats = (entries: RosterEntry[]) => {
    const late = entries.filter((e) => e.status === 'late').length;
    const attended = entries.filter((e) => e.status === 'present' || e.status === 'late').length;
    const excused = entries.filter((e) => e.status === 'excused').length;
    const absent = entries.filter((e) => e.status === 'absent').length;
    return { present: attended - late, late, excused, absent, total: entries.length };
  };
  const byStats = groupStats(roster.filter((e) => e.student.group_name === 'BY'));
  const jdyStats = groupStats(roster.filter((e) => e.student.group_name === 'JDY'));
  const groupLabels = isBoth ? ['BY', 'JDY'] : showJDY ? ['JDY'] : ['BY'];
  const summaryStats = isBoth ? [byStats, jdyStats] : showJDY ? [jdyStats] : [byStats];

  const attendedCount = roster.filter((e) => e.status === 'present' || e.status === 'late').length;
  const excusedCount = roster.filter((e) => e.status === 'excused').length;
  const countable = roster.length - excusedCount;
  const pctPresent = countable > 0 ? Math.round((attendedCount / countable) * 100) : 0;

  if (loading) return <LoadingSpinner />;

  const hasEvent = todaysEvents.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight-lg text-ink-900 md:text-5xl">
            Attendance
          </h1>
          <p className="mt-2 text-base text-ink-400">
            {formatDate(sessionDate)}
            {hasEvent && ` · ${todaysEvents.map((e) => e.name).join(', ')}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={sessionDate}
            onChange={handleDateChange}
            className="rounded-card-sm border border-ink-200 bg-ink-50/50 px-4 py-2.5 text-sm text-ink-700 shadow-sm focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400"
          />
          {hasEvent && (
            <button
              onClick={saveAttendance}
              disabled={saving || !session}
              className="flex items-center gap-2 rounded-pill bg-accent-charcoal px-6 py-2.5 text-sm font-medium text-white shadow-pill transition-all hover:bg-accent-dark disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {!hasEvent ? (
        <EmptyState
          icon={<CalendarOff className="h-10 w-10" />}
          title="No event scheduled"
          description={`There's nothing on the schedule for ${formatDate(sessionDate)}. Add an event on the Schedule page to take attendance for this date.`}
        />
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Main roster */}
          <div className="flex-1 space-y-5">
            {/* Search */}
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
                  emptyMessage={search ? 'No BY students match your search' : 'No active BY students found'}
                />
                <RosterPanel
                  title="JDY"
                  rows={jdyRoster}
                  onCycle={cycleStatus}
                  emptyMessage={search ? 'No JDY students match your search' : 'No active JDY students found'}
                />
              </div>
            ) : (
              <RosterPanel
                rows={filteredRoster}
                onCycle={cycleStatus}
                emptyMessage={search ? 'No students match your search' : 'No active students found'}
              />
            )}
          </div>

          {/* Side summary */}
          <div className="w-full space-y-5 lg:w-72">
            <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
              <h3 className="text-sm font-semibold text-ink-700">Session Summary</h3>
              <div className="mt-5 flex items-center justify-center">
                <div className="relative flex h-28 w-28 items-center justify-center">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f0eeeb" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.5" fill="none"
                      stroke="#5a9a6b" strokeWidth="3"
                      strokeDasharray={`${pctPresent} ${100 - pctPresent}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-xl font-bold text-ink-800">{pctPresent}%</span>
                </div>
              </div>
              <div className="mt-6">
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

            {session && (
              <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
                <h3 className="text-sm font-semibold text-ink-700">Session Details</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-400">Start time</span>
                    <span className="font-medium text-ink-700">{session.start_time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-400">Late after</span>
                    <span className="font-medium text-ink-700">{session.late_threshold_minutes} min</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
