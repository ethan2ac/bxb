import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, UserCheck, UserX, CalendarClock, History as HistoryIcon } from 'lucide-react';
import { api } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';
import { formatDate, formatTime } from '../utils/dates';
import { displayName, initials, groupLabel } from '../utils/students';
import type { Student, AttendanceRecord, AttendanceSummary } from '../types';

const inputClass =
  'mt-1.5 block w-full rounded-card-sm border border-ink-200 bg-ink-50/50 px-4 py-2.5 text-sm text-ink-800 shadow-sm focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400 transition-colors';

export function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { data, loading } = useApi<{
    student: Student;
    records: AttendanceRecord[];
    summary: AttendanceSummary;
  }>(studentId ? `/api/reports/student/${studentId}` : null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[] | null>(null);
  const [filtering, setFiltering] = useState(false);

  const hasFilters = !!(from || to || statusFilter);

  const applyFilters = async () => {
    if (!studentId) return;
    if (!hasFilters) {
      setFilteredRecords(null);
      return;
    }
    setFiltering(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (statusFilter) params.set('status', statusFilter);
      const result = await api.get<{ records: AttendanceRecord[] }>(
        `/api/reports/student/${studentId}?${params.toString()}`,
      );
      setFilteredRecords(result.records);
    } finally {
      setFiltering(false);
    }
  };

  const toggleHistory = () => {
    setHistoryOpen((open) => !open);
  };

  const clearFilters = () => {
    setFrom('');
    setTo('');
    setStatusFilter('');
    setFilteredRecords(null);
  };

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className="p-12 text-center text-ink-400">Student not found</div>;

  const { student, records, summary } = data;
  const lastAttended = records.find((r) => r.status === 'present' || r.status === 'late');
  const pctRate = summary.attendance_rate;
  const displayedRecords = filteredRecords ?? records;

  return (
    <div className="space-y-8">
      <Link
        to="/students"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-400 transition-colors hover:text-ink-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Students
      </Link>

      {/* Profile hero */}
      <div className="flex flex-col gap-6 rounded-card border border-ink-100 bg-white p-8 shadow-card md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-100 text-xl font-bold text-ink-500">
            {initials(student)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight-lg text-ink-900">{displayName(student)}</h1>
              <Badge variant={groupLabel(student) === 'JDY' ? 'JDY' : 'BY'}>{groupLabel(student)}</Badge>
              <Badge variant={student.active ? 'active' : 'archived'}>
                {student.active ? 'Active' : 'Archived'}
              </Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-4 text-sm text-ink-400">
              <span>{student.level}</span>
              {!!student.age && <span>Age {student.age}</span>}
              <span>{student.gender}</span>
              <span>Birthday: {student.birthday ? formatDate(student.birthday) : 'Not set'}</span>
              {student.phone && <span>Phone: {student.phone}</span>}
            </div>
            {student.description && (
              <p className="mt-3 text-sm text-ink-500">{student.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Last attended</p>
            <p className="mt-0.5 text-sm font-semibold text-ink-700">
              {lastAttended?.session_date ? formatDate(lastAttended.session_date) : 'Never'}
            </p>
          </div>
          <button
            onClick={toggleHistory}
            className={`flex items-center gap-2 rounded-pill px-5 py-2.5 text-sm font-medium shadow-pill transition-all ${
              historyOpen
                ? 'bg-accent-charcoal text-white'
                : 'border border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
            }`}
          >
            <HistoryIcon className="h-4 w-4" />
            History
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Attendance Rate</p>
              <p className="mt-2 text-3xl font-bold tracking-tight-lg text-status-success">{pctRate}%</p>
            </div>
            <UserCheck className="h-5 w-5 text-ink-300" />
          </div>
        </div>
        <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Present</p>
              <p className="mt-2 text-3xl font-bold tracking-tight-lg text-ink-900">{summary.present}</p>
            </div>
            <Calendar className="h-5 w-5 text-ink-300" />
          </div>
        </div>
        <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Late</p>
              <p className="mt-2 text-3xl font-bold tracking-tight-lg text-accent-yellow-text">{summary.late}</p>
            </div>
            <Clock className="h-5 w-5 text-ink-300" />
          </div>
        </div>
        <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Excused</p>
              <p className="mt-2 text-3xl font-bold tracking-tight-lg text-status-info">{summary.excused}</p>
            </div>
            <CalendarClock className="h-5 w-5 text-ink-300" />
          </div>
        </div>
        <div className="rounded-card bg-accent-charcoal p-6 shadow-dark-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Absent</p>
              <p className="mt-2 text-3xl font-bold tracking-tight-lg text-white">{summary.absent}</p>
            </div>
            <UserX className="h-5 w-5 text-ink-500" />
          </div>
        </div>
      </div>

      {/* Attendance history (behind the History button) */}
      {historyOpen && (
        <div className="space-y-5">
          <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
            <h3 className="text-sm font-semibold text-ink-700">Filter History</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                  <option value="excused">Excused</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={applyFilters}
                  disabled={filtering}
                  className="flex-1 rounded-pill bg-accent-charcoal px-4 py-2.5 text-sm font-medium text-white shadow-pill transition-all hover:bg-accent-dark disabled:opacity-50"
                >
                  {filtering ? 'Applying...' : 'Apply'}
                </button>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="rounded-pill border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-500 transition-colors hover:bg-ink-50"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-ink-100 px-7 py-5">
              <h2 className="text-base font-semibold text-ink-800">Attendance History</h2>
              <span className="text-xs text-ink-400">{displayedRecords.length} records</span>
            </div>
            {filtering ? (
              <LoadingSpinner className="py-10" />
            ) : displayedRecords.length === 0 ? (
              <div className="p-12 text-center text-sm text-ink-400">
                {hasFilters ? 'No records found for the selected filters' : 'No attendance records yet'}
              </div>
            ) : (
              <div className="divide-y divide-ink-100">
                {displayedRecords.map((record) => (
                  <div
                    key={record.id}
                    className={`flex items-center justify-between px-7 py-4 transition-colors ${
                      record.status === 'late' ? 'bg-accent-yellow-soft' : 'hover:bg-ink-50/50'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-ink-700">
                        {record.session_date ? formatDate(record.session_date) : '-'}
                      </p>
                      {record.check_in_timestamp && (
                        <p className="mt-0.5 text-xs text-ink-400">
                          Check-in: {formatTime(record.check_in_timestamp)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {record.notes && <span className="text-xs text-ink-400">{record.notes}</span>}
                      <Badge variant={record.status}>{record.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
