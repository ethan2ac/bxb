import { useState, useEffect, useCallback } from 'react';
import { Search, Save, Check, X as XIcon, Clock, CalendarOff } from 'lucide-react';
import { api } from '../lib/api';
import { useUiStore } from '../store/ui';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';
import { getDefaultSessionDate, formatDate, formatTime } from '../utils/dates';
import { displayName } from '../utils/students';
import type { Student, Session, AttendanceRecord, AttendanceEntry, AttendanceStatus, AppSettings } from '../types';

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
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const [students, settings] = await Promise.all([
        api.get<Student[]>('/api/students'),
        api.get<AppSettings>('/api/settings'),
      ]);

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
    const date = e.target.value;
    const d = new Date(date + 'T00:00:00Z');
    if (d.getUTCDay() !== 0) {
      addToast('Please select a Sunday', 'error');
      return;
    }
    setSessionDate(date);
  };

  const filteredRoster = roster.filter((entry) =>
    displayName(entry.student).toLowerCase().includes(search.toLowerCase()),
  );

  const lateCount = roster.filter((e) => e.status === 'late').length;
  const attendedCount = roster.filter((e) => e.status === 'present' || e.status === 'late').length;
  const excusedCount = roster.filter((e) => e.status === 'excused').length;
  const absentCount = roster.filter((e) => e.status === 'absent').length;
  const countable = roster.length - excusedCount;
  const pctPresent = countable > 0 ? Math.round((attendedCount / countable) * 100) : 0;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight-lg text-ink-900 md:text-5xl">
            Attendance
          </h1>
          <p className="mt-2 text-base text-ink-400">{formatDate(sessionDate)}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={sessionDate}
            onChange={handleDateChange}
            className="rounded-card-sm border border-ink-200 bg-ink-50/50 px-4 py-2.5 text-sm text-ink-700 shadow-sm focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400"
          />
          <button
            onClick={saveAttendance}
            disabled={saving || !session}
            className="flex items-center gap-2 rounded-pill bg-accent-charcoal px-6 py-2.5 text-sm font-medium text-white shadow-pill transition-all hover:bg-accent-dark disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

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

          {/* Roster card */}
          <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
            {filteredRoster.length === 0 ? (
              <div className="p-12 text-center text-sm text-ink-400">
                {search ? 'No students match your search' : 'No active students found'}
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
                          <p className="text-xs text-ink-400">
                            Checked in {formatTime(entry.check_in_timestamp)}
                          </p>
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
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-500">Enrolled</span>
                <span className="text-sm font-semibold text-ink-700">{roster.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm text-ink-500">
                  <span className="h-2 w-2 rounded-full bg-status-success" /> Present
                </span>
                <span className="text-sm font-semibold text-ink-700">{attendedCount - lateCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm text-ink-500">
                  <span className="h-2 w-2 rounded-full bg-accent-yellow" /> Late
                </span>
                <span className="text-sm font-semibold text-ink-700">{lateCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm text-ink-500">
                  <span className="h-2 w-2 rounded-full bg-status-info" /> Excused
                </span>
                <span className="text-sm font-semibold text-ink-700">{excusedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm text-ink-500">
                  <span className="h-2 w-2 rounded-full bg-status-danger/60" /> Absent
                </span>
                <span className="text-sm font-semibold text-ink-700">{absentCount}</span>
              </div>
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
    </div>
  );
}
