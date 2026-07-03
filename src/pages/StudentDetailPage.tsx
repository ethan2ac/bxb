import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, UserCheck, UserX, CalendarClock } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';
import { formatDate, formatTime } from '../utils/dates';
import { displayName, initials } from '../utils/students';
import type { Student, AttendanceRecord, AttendanceSummary } from '../types';

export function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { data, loading } = useApi<{
    student: Student;
    records: AttendanceRecord[];
    summary: AttendanceSummary;
  }>(studentId ? `/api/attendance/student/${studentId}` : null);

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className="p-12 text-center text-ink-400">Student not found</div>;

  const { student, records, summary } = data;
  const lastAttended = records.find((r) => r.status === 'present' || r.status === 'late');
  const pctRate = summary.attendance_rate;

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
              <Badge variant={student.active ? 'active' : 'archived'}>
                {student.active ? 'Active' : 'Archived'}
              </Badge>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-4 text-sm text-ink-400">
              <span>Age {student.age}</span>
              <span>{student.gender}</span>
              <span>Birthday: {student.birthday ? formatDate(student.birthday) : 'Not set'}</span>
              {student.phone && <span>Phone: {student.phone}</span>}
            </div>
            {student.description && (
              <p className="mt-3 text-sm text-ink-500">{student.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Last attended</p>
            <p className="mt-0.5 text-sm font-semibold text-ink-700">
              {lastAttended?.session_date ? formatDate(lastAttended.session_date) : 'Never'}
            </p>
          </div>
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

      {/* Attendance history */}
      <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
        <div className="border-b border-ink-100 px-7 py-5">
          <h2 className="text-base font-semibold text-ink-800">Attendance History</h2>
        </div>
        {records.length === 0 ? (
          <div className="p-12 text-center text-sm text-ink-400">No attendance records yet</div>
        ) : (
          <div className="divide-y divide-ink-100">
            {records.map((record) => (
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
  );
}
