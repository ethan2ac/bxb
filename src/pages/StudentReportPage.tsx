import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import { formatDate, formatTime } from '../utils/dates';
import type { Student, AttendanceRecord, AttendanceSummary } from '../types';
import { BarChart3, UserCheck, Clock, UserX } from 'lucide-react';

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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Student Reports</h1>

      <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Student</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Select a student...</option>
            {students?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {!s.active ? '(Archived)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
          </select>
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
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Attendance Rate" value={`${report.summary.attendance_rate}%`} icon={<UserCheck className="h-5 w-5" />} color="text-green-600" />
            <StatCard label="Present" value={report.summary.present} icon={<BarChart3 className="h-5 w-5" />} color="text-brand-600" />
            <StatCard label="Late" value={report.summary.late} icon={<Clock className="h-5 w-5" />} color="text-yellow-600" />
            <StatCard label="Absent" value={report.summary.absent} icon={<UserX className="h-5 w-5" />} color="text-red-600" />
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-medium text-slate-600">Date</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="hidden px-4 py-3 font-medium text-slate-600 sm:table-cell">Check-in</th>
                  <th className="hidden px-4 py-3 font-medium text-slate-600 md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.records.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      No records found for the selected filters
                    </td>
                  </tr>
                ) : (
                  report.records.map((r) => (
                    <tr key={r.id} className={r.status === 'late' ? 'bg-yellow-50' : ''}>
                      <td className="px-4 py-3 text-slate-700">
                        {r.session_date ? formatDate(r.session_date) : '-'}
                      </td>
                      <td className="px-4 py-3"><Badge variant={r.status}>{r.status}</Badge></td>
                      <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                        {r.check_in_timestamp ? formatTime(r.check_in_timestamp) : '-'}
                      </td>
                      <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{r.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
