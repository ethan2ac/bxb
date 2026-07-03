import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { formatDate, formatTime } from '../utils/dates';
import { displayName } from '../utils/students';
import type { Student, AttendanceRecord, AttendanceSummary } from '../types';
import { BarChart3 } from 'lucide-react';

const inputClass =
  'mt-1.5 block w-full rounded-card-sm border border-ink-200 bg-ink-50/50 px-4 py-2.5 text-sm text-ink-800 shadow-sm focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400 transition-colors';

export function StudentReportPage() {
  const { data: students, loading: loadingStudents } = useApi<Student[]>('/api/students?includeArchived=true');
  const [selectedId, setSelectedId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [report, setReport] = useState<{
    student: Student;
    records: AttendanceRecord[];
    summary: AttendanceSummary;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedId) {
      setReport(null);
      return;
    }
    const fetchReport = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        if (statusFilter) params.set('status', statusFilter);
        const qs = params.toString();
        const data = await api.get<{
          student: Student;
          records: AttendanceRecord[];
          summary: AttendanceSummary;
        }>(`/api/reports/student/${selectedId}${qs ? `?${qs}` : ''}`);
        setReport(data);
      } catch {
        setReport(null);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [selectedId, from, to, statusFilter]);

  if (loadingStudents) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight-lg text-ink-900 md:text-5xl">Reports</h1>
        <p className="mt-2 text-base text-ink-400">Individual student attendance analysis</p>
      </div>

      {/* Filters */}
      <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-ink-400">Student</label>
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className={inputClass}>
              <option value="">Select a student...</option>
              {students?.map((s) => (
                <option key={s.id} value={s.id}>
                  {displayName(s)} {!s.active ? '(Archived)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-ink-400">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-ink-400">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-ink-400">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
              <option value="">All</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="excused">Excused</option>
            </select>
          </div>
        </div>
      </div>

      {!selectedId && (
        <EmptyState
          icon={<BarChart3 className="h-10 w-10" />}
          title="Select a student"
          description="Choose a student above to view their attendance report"
        />
      )}

      {loading && <LoadingSpinner />}

      {report && !loading && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Attendance Rate</p>
              <p className="mt-2 text-3xl font-bold tracking-tight-lg text-status-success">{report.summary.attendance_rate}%</p>
            </div>
            <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Present</p>
              <p className="mt-2 text-3xl font-bold tracking-tight-lg text-ink-900">{report.summary.present}</p>
            </div>
            <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Late</p>
              <p className="mt-2 text-3xl font-bold tracking-tight-lg text-accent-yellow-text">{report.summary.late}</p>
            </div>
            <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Excused</p>
              <p className="mt-2 text-3xl font-bold tracking-tight-lg text-status-info">{report.summary.excused}</p>
            </div>
            <div className="rounded-card bg-accent-charcoal p-6 shadow-dark-card">
              <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Absent</p>
              <p className="mt-2 text-3xl font-bold tracking-tight-lg text-white">{report.summary.absent}</p>
            </div>
          </div>

          {/* Records */}
          <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
            <div className="border-b border-ink-100 px-7 py-5">
              <h2 className="text-base font-semibold text-ink-800">Records</h2>
            </div>
            {report.records.length === 0 ? (
              <div className="p-12 text-center text-sm text-ink-400">No records found for the selected filters</div>
            ) : (
              <div className="divide-y divide-ink-100">
                {report.records.map((r) => (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between px-7 py-4 transition-colors ${
                      r.status === 'late' ? 'bg-accent-yellow-soft' : 'hover:bg-ink-50/50'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-ink-700">
                        {r.session_date ? formatDate(r.session_date) : '-'}
                      </p>
                      {r.check_in_timestamp && (
                        <p className="mt-0.5 text-xs text-ink-400">
                          Check-in: {formatTime(r.check_in_timestamp)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {r.notes && <span className="text-xs text-ink-400">{r.notes}</span>}
                      <Badge variant={r.status}>{r.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
