import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Users, ClipboardCheck, UserX, CalendarDays, ArrowRight, ChevronRight, TrendingUp } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';
import { StatStrip } from '../components/StatStrip';
import { GroupToggle, type GroupToggleValue } from '../components/GroupToggle';
import { formatDate } from '../utils/dates';
import type { Student, WeeklyReport, NoShowStudent, MonthlyTrend } from '../types';

function ProgressBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-xs font-medium text-ink-500">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-semibold text-ink-600">{pct}%</span>
    </div>
  );
}

function monthLabel(month: string): string {
  return format(new Date(`${month}-01T00:00:00Z`), 'MMM yyyy');
}

export function DashboardPage() {
  const [group, setGroup] = useState<GroupToggleValue>('ALL');
  const groupQs = group !== 'ALL' ? `group=${group}&` : '';

  const { data: students, loading: loadingStudents } = useApi<Student[]>('/api/students');
  const { data: weeks, loading: loadingWeeks } = useApi<WeeklyReport[]>(`/api/reports/weekly?${groupQs}limit=4`);
  const { data: noShows, loading: loadingNoShows } = useApi<NoShowStudent[]>(`/api/no-shows?${groupQs}`);
  const { data: trend, loading: loadingTrend } = useApi<MonthlyTrend[]>(`/api/reports/monthly?${groupQs}months=6`);

  if (loadingStudents || loadingWeeks || loadingNoShows || loadingTrend) return <LoadingSpinner />;

  const byCount = students?.filter((s) => s.group_name === 'BY').length || 0;
  const jdyCount = students?.filter((s) => s.group_name === 'JDY').length || 0;
  const allCount = byCount + jdyCount;
  const latestWeek = weeks?.[0];
  const noShowCount = noShows?.length || 0;

  const totalRecorded = latestWeek
    ? latestWeek.present + latestWeek.late + latestWeek.absent + latestWeek.excused
    : 0;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div>
        <span className="eyebrow">01 — Overview</span>
        <h1 className="mt-3 font-display text-5xl leading-[0.95] tracking-tight text-ink-900 md:text-6xl">
          Dashboard
        </h1>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base text-ink-400">
            Sunday attendance overview &mdash; everything at a glance.
          </p>
          <GroupToggle value={group} onChange={setGroup} />
        </div>
      </div>

      <StatStrip
        cells={[
          { key: 'all', label: 'All Groups', value: allCount, accent: true },
          { key: 'by', label: 'BY', value: byCount },
          { key: 'jdy', label: 'JDY', value: jdyCount },
        ]}
      />

      {/* Progress strip */}
      {latestWeek && (
        <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-700">
              Latest Session &mdash; {formatDate(latestWeek.occurrence_date)}
              {latestWeek.occurrence_name && ` · ${latestWeek.occurrence_name}`}
            </h2>
            <span className="rounded-pill bg-ink-100 px-3 py-1 text-xs font-medium text-ink-500">
              {latestWeek.present + latestWeek.late}/{latestWeek.enrolled} attended
            </span>
          </div>
          <div className="space-y-3">
            <ProgressBar label="Present" value={latestWeek.present} total={totalRecorded} color="bg-status-success" />
            <ProgressBar label="Late" value={latestWeek.late} total={totalRecorded} color="bg-accent-yellow" />
            <ProgressBar label="Excused" value={latestWeek.excused} total={totalRecorded} color="bg-status-info" />
            <ProgressBar label="Absent" value={latestWeek.absent} total={totalRecorded} color="bg-status-danger/60" />
          </div>
        </div>
      )}

      {/* Monthly trend */}
      {trend && trend.length > 0 && (
        <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
          <div className="mb-6 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-ink-400" />
            <h2 className="text-sm font-semibold text-ink-700">Attendance Rate Trend</h2>
          </div>
          <div className="flex items-end justify-between gap-3 sm:gap-6">
            {trend.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-semibold text-ink-600">{m.attendance_rate}%</span>
                <div className="flex h-28 w-full items-end overflow-hidden rounded-lg bg-ink-100">
                  <div
                    className="w-full rounded-lg bg-accent-charcoal transition-all"
                    style={{ height: `${m.attendance_rate}%` }}
                  />
                </div>
                <span className="text-xs text-ink-400">{monthLabel(m.month)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions — ordered to match how the week actually flows: forecast
          who's coming, then take attendance live, manage the roster as needed,
          review no-shows after the fact. */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/forecast"
          className="group flex flex-col justify-between rounded-card border border-ink-100 bg-white p-7 shadow-card transition-all hover:shadow-card-hover"
        >
          <div>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-yellow-soft text-accent-yellow-text">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-ink-800">Forecast</h3>
            <p className="mt-1 text-sm text-ink-400">See who's expected this week</p>
          </div>
          <div className="mt-5 flex items-center text-sm font-medium text-ink-400 transition-colors group-hover:text-ink-700">
            Open <ArrowRight className="ml-1 h-4 w-4" />
          </div>
        </Link>

        <Link
          to="/attendance"
          className="group flex flex-col justify-between rounded-card border border-ink-100 bg-white p-7 shadow-card transition-all hover:shadow-card-hover"
        >
          <div>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-charcoal text-white">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-ink-800">Take Attendance</h3>
            <p className="mt-1 text-sm text-ink-400">Record today's Sunday session</p>
          </div>
          <div className="mt-5 flex items-center text-sm font-medium text-ink-400 transition-colors group-hover:text-ink-700">
            Open <ArrowRight className="ml-1 h-4 w-4" />
          </div>
        </Link>

        <Link
          to="/students"
          className="group flex flex-col justify-between rounded-card border border-ink-100 bg-white p-7 shadow-card transition-all hover:shadow-card-hover"
        >
          <div>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-status-info-soft text-status-info">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-ink-800">Manage Students</h3>
            <p className="mt-1 text-sm text-ink-400">Add, edit, or archive students</p>
          </div>
          <div className="mt-5 flex items-center text-sm font-medium text-ink-400 transition-colors group-hover:text-ink-700">
            Open <ArrowRight className="ml-1 h-4 w-4" />
          </div>
        </Link>

        {/* Dark no-shows card */}
        <Link
          to="/no-shows"
          className="group flex flex-col justify-between rounded-card bg-accent-charcoal p-7 shadow-dark-card transition-all hover:bg-accent-dark"
        >
          <div>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
              <UserX className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-white">No Shows</h3>
            <p className="mt-1 text-sm text-ink-400">
              {noShowCount > 0 ? `${noShowCount} student${noShowCount !== 1 ? 's' : ''} flagged` : 'No flagged students'}
            </p>
          </div>
          <div className="mt-5 flex items-center text-sm font-medium text-ink-500 transition-colors group-hover:text-white">
            Review <ArrowRight className="ml-1 h-4 w-4" />
          </div>
        </Link>
      </div>

      {/* Recent sessions */}
      <div className="rounded-card border border-ink-100 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-ink-100 px-7 py-5">
          <h2 className="text-base font-semibold text-ink-800">Recent Sessions</h2>
          <Link
            to="/reports/weekly"
            className="text-sm font-medium text-ink-400 transition-colors hover:text-ink-700"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-ink-100">
          {weeks && weeks.length > 0 ? (
            weeks.map((week) => (
              <Link
                key={week.occurrence_id}
                to={`/reports/occurrence/${week.occurrence_type}/${week.occurrence_id}`}
                className="flex items-center justify-between px-7 py-4 transition-colors hover:bg-ink-50/50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-100 text-ink-500">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink-700">
                      {formatDate(week.occurrence_date)}
                      {week.occurrence_name && (
                        <span className="ml-2 text-xs font-normal text-ink-400">{week.occurrence_name}</span>
                      )}
                    </p>
                    <p className="text-xs text-ink-400">
                      {week.present + week.late}/{week.enrolled} attended
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {week.late > 0 && <Badge variant="late">{week.late} late</Badge>}
                  {week.excused > 0 && <Badge variant="excused">{week.excused} excused</Badge>}
                  {week.absent > 0 && <Badge variant="absent">{week.absent} absent</Badge>}
                  <span className="min-w-[3rem] text-right text-sm font-semibold text-ink-600">
                    {week.attendance_rate}%
                  </span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-ink-300" />
                </div>
              </Link>
            ))
          ) : (
            <div className="p-10 text-center text-sm text-ink-400">No sessions recorded yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
