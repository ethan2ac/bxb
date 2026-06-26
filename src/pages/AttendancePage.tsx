import { useState, useEffect, useCallback } from 'react';
import { Search, Save, Check, X as XIcon, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { useUiStore } from '../store/ui';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';
import { getDefaultSessionDate, formatDate, formatTime } from '../utils/dates';
import type { Student, Session, AttendanceRecord, AttendanceEntry } from '../types';

interface RosterEntry {
  student: Student;
  status: 'present' | 'absent' | 'late';
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
      const students = await api.get<Student[]>('/api/students');

      let currentSession: Session | null = null;
      let records: AttendanceRecord[] = [];

      try {
        const result = await api.post<Session>('/api/sessions', {
          session_date: sessionDate,
          start_time: '09:00',
          late_threshold_minutes: 15,
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

  const togglePresent = (studentId: string) => {
    setRoster((prev) =>
      prev.map((entry) => {
        if (entry.student.id !== studentId) return entry;
        if (entry.status === 'absent') {
          const ts = new Date().toISOString();
          let status: 'present' | 'late' = 'present';
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
    entry.student.name.toLowerCase().includes(search.toLowerCase()),
  );

  const presentCount = roster.filter((e) => e.status === 'present' || e.status === 'late').length;
  const lateCount = roster.filter((e) => e.status === 'late').length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Take Attendance</h1>
          <p className="mt-1 text-sm text-slate-500">{formatDate(sessionDate)}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={sessionDate}
            onChange={handleDateChange}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            onClick={saveAttendance}
            disabled={saving || !session}
            className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-brand-600">{roster.length}</p>
          <p className="text-xs text-slate-500">Enrolled</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-green-600">{presentCount}</p>
          <p className="text-xs text-slate-500">Present</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
          <p className="text-2xl font-bold text-yellow-600">{lateCount}</p>
          <p className="text-xs text-slate-500">Late</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-slate-300 py-2 pl-10 pr-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">
          {filteredRoster.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              {search ? 'No students match your search' : 'No active students found'}
            </div>
          ) : (
            filteredRoster.map((entry) => (
              <div
                key={entry.student.id}
                className={`flex items-center justify-between px-4 py-3 transition-colors ${
                  entry.status === 'late' ? 'bg-yellow-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => togglePresent(entry.student.id)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                      entry.status === 'present'
                        ? 'border-green-500 bg-green-500 text-white'
                        : entry.status === 'late'
                          ? 'border-yellow-500 bg-yellow-500 text-white'
                          : 'border-slate-300 text-slate-300 hover:border-slate-400'
                    }`}
                    aria-label={`Toggle attendance for ${entry.student.name}`}
                  >
                    {entry.status !== 'absent' ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <XIcon className="h-4 w-4" />
                    )}
                  </button>
                  <div>
                    <p className={`text-sm font-medium ${entry.status === 'late' ? 'text-yellow-800' : 'text-slate-800'}`}>
                      {entry.student.name}
                    </p>
                    {entry.check_in_timestamp && (
                      <p className="text-xs text-slate-500">
                        Checked in: {formatTime(entry.check_in_timestamp)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {entry.status === 'late' && (
                    <Badge variant="late">
                      <Clock className="mr-1 h-3 w-3" />
                      Late
                    </Badge>
                  )}
                  {entry.status === 'present' && <Badge variant="present">Present</Badge>}
                  {entry.status === 'absent' && <Badge variant="absent">Absent</Badge>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
