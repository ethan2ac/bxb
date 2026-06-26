import { Link } from 'react-router-dom';
import { Users, ClipboardCheck, UserX, Clock, CalendarDays, Plus, ArrowRight } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { StatCard } from '../components/StatCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';
import { formatDate } from '../utils/dates';
import type { Student, WeeklyReport, NoShowStudent } from '../types';

export function DashboardPage() {
  const { data: students, loading: loadingStudents } = useApi<Student[]>('/api/students');
  const { data: weeks, loading: loadingWeeks } = useApi<WeeklyReport[]>('/api/reports/weekly?limit=4');
  const { data: noShows, loading: loadingNoShows } = useApi<NoShowStudent[]>('/api/no-shows');

  if (loadingStudents || loadingWeeks || loadingNoShows) return <LoadingSpinner />;

  const activeStudents = students?.length || 0;
  const latestWeek = weeks?.[0];
  const attendanceRate = latestWeek?.attendance_rate ?? 0;
  const lateCount = latestWeek?.late ?? 0;
  const noShowCount = noShows?.length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Overview of your Sunday attendance program</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Students"
          value={activeStudents}
          icon={<Users className="h-6 w-6" />}
          color="text-brand-600"
        />
        <StatCard
          label="Attendance Rate"
          value={`${attendanceRate}%`}
          icon={<ClipboardCheck className="h-6 w-6" />}
          color="text-green-600"
        />
        <StatCard
          label="Late Arrivals"
          value={lateCount}
          icon={<Clock className="h-6 w-6" />}
          color="text-yellow-600"
        />
        <StatCard
          label="No Shows"
          value={noShowCount}
          icon={<UserX className="h-6 w-6" />}
          color="text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Link
          to="/attendance"
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-slate-800">Take Attendance</p>
            <p className="text-sm text-slate-500">Record today's attendance</p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400" />
        </Link>

        <Link
          to="/students"
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
            <Plus className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-slate-800">Add Student</p>
            <p className="text-sm text-slate-500">Enroll a new student</p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400" />
        </Link>

        <Link
          to="/no-shows"
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
            <UserX className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-slate-800">View No Shows</p>
            <p className="text-sm text-slate-500">{noShowCount} students flagged</p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400" />
        </Link>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-800">Recent Sessions</h2>
          <Link
            to="/reports/weekly"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {weeks && weeks.length > 0 ? (
            weeks.map((week) => (
              <div
                key={week.session.id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {formatDate(week.session.session_date)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {week.present + week.late}/{week.enrolled} attended
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {week.late > 0 && <Badge variant="late">{week.late} late</Badge>}
                  {week.absent > 0 && <Badge variant="absent">{week.absent} absent</Badge>}
                  <span className="text-sm font-medium text-slate-600">{week.attendance_rate}%</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-5 text-center text-sm text-slate-500">No sessions recorded yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
