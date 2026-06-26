import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, UserCheck, UserX } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';
import { StatCard } from '../components/StatCard';
import { formatDate, formatTime } from '../utils/dates';
import type { Student, AttendanceRecord, AttendanceSummary } from '../types';

export function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { data, loading } = useApi<{
    student: Student;
    records: AttendanceRecord[];
    summary: AttendanceSummary;
  }>(studentId ? `/api/attendance/student/${studentId}` : null);

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className="p-8 text-center text-slate-500">Student not found</div>;

  const { student, records, summary } = data;
  const lastAttended = records.find((r) => r.status === 'present' || r.status === 'late');

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/students"
          className="mb-3 inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Students
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-800">{student.name}</h1>
          <Badge variant={student.active ? 'active' : 'archived'}>
            {student.active ? 'Active' : 'Archived'}
          </Badge>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-700">Profile</h2>
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <span className="text-slate-500">Age</span>
            <p className="font-medium text-slate-800">{student.age}</p>
          </div>
          <div>
            <span className="text-slate-500">Gender</span>
            <p className="font-medium text-slate-800">{student.gender}</p>
          </div>
          <div>
            <span className="text-slate-500">Birthday</span>
            <p className="font-medium text-slate-800">{formatDate(student.birthday)}</p>
          </div>
          <div>
            <span className="text-slate-500">Last Attended</span>
            <p className="font-medium text-slate-800">
              {lastAttended?.session_date ? formatDate(lastAttended.session_date) : 'Never'}
            </p>
          </div>
        </div>
        {student.description && (
          <p className="mt-3 text-sm text-slate-600">{student.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Attendance Rate"
          value={`${summary.attendance_rate}%`}
          icon={<UserCheck className="h-5 w-5" />}
          color="text-green-600"
        />
        <StatCard
          label="Present"
          value={summary.present}
          icon={<Calendar className="h-5 w-5" />}
          color="text-brand-600"
        />
        <StatCard
          label="Late"
          value={summary.late}
          icon={<Clock className="h-5 w-5" />}
          color="text-yellow-600"
        />
        <StatCard
          label="Absent"
          value={summary.absent}
          icon={<UserX className="h-5 w-5" />}
          color="text-red-600"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-700">Attendance History</h2>
        </div>
        {records.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No attendance records yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-medium text-slate-600">Date</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="hidden px-4 py-3 font-medium text-slate-600 sm:table-cell">
                    Check-in
                  </th>
                  <th className="hidden px-4 py-3 font-medium text-slate-600 md:table-cell">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record) => (
                  <tr
                    key={record.id}
                    className={record.status === 'late' ? 'bg-yellow-50' : ''}
                  >
                    <td className="px-4 py-3 text-slate-700">
                      {record.session_date ? formatDate(record.session_date) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={record.status}>{record.status}</Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                      {record.check_in_timestamp ? formatTime(record.check_in_timestamp) : '-'}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                      {record.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
