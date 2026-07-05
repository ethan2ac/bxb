import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { GroupToggle, type GroupToggleValue } from '../components/GroupToggle';
import { formatDate } from '../utils/dates';
import type { WeeklyReport, AttendanceRecord } from '../types';
import { api } from '../lib/api';

export function WeeklyReportPage() {
  const [group, setGroup] = useState<GroupToggleValue>('ALL');
  const groupQs = group !== 'ALL' ? `group=${group}&` : '';
  const { data: weeks, loading } = useApi<WeeklyReport[]>(`/api/reports/weekly?${groupQs}limit=20`);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, AttendanceRecord[]>>({});
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);

  const toggleExpand = async (sessionId: string) => {
    if (expandedId === sessionId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(sessionId);
    if (!details[sessionId]) {
      setLoadingDetails(sessionId);
      try {
        const data = await api.get<{ session: unknown; records: AttendanceRecord[] }>(
          `/api/attendance?sessionId=${sessionId}`,
        );
        setDetails((prev) => ({ ...prev, [sessionId]: data.records }));
      } catch {
        // silently fail
      } finally {
        setLoadingDetails(null);
      }
    }
  };

  if (loading) return <LoadingSpinner />;

  if (!weeks || weeks.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight-lg text-ink-900 md:text-5xl">History</h1>
          <p className="mt-2 text-base text-ink-400">Session-by-session breakdown</p>
          <div className="mt-4">
            <GroupToggle value={group} onChange={setGroup} />
          </div>
        </div>
        <EmptyState title="No sessions recorded" description="Take attendance on a Sunday to see weekly reports" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight-lg text-ink-900 md:text-5xl">History</h1>
        <p className="mt-2 text-base text-ink-400">Session-by-session breakdown</p>
        <div className="mt-4">
          <GroupToggle value={group} onChange={setGroup} />
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
        <div className="divide-y divide-ink-100">
          {weeks.map((week) => (
            <Fragment key={week.session.id}>
              <div
                className="flex cursor-pointer items-center justify-between px-7 py-5 transition-colors hover:bg-ink-50/50"
                onClick={() => toggleExpand(week.session.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="text-ink-300">
                    {expandedId === week.session.id ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink-800">
                      {formatDate(week.session.session_date)}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {week.present + week.late}/{week.enrolled} attended
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden items-center gap-5 text-sm sm:flex">
                    <span className="text-status-success font-medium">{week.present} present</span>
                    <span className="text-accent-yellow-text font-medium">{week.late} late</span>
                    {week.excused > 0 && (
                      <span className="text-status-info font-medium">{week.excused} excused</span>
                    )}
                    <span className="text-status-danger font-medium">{week.absent} absent</span>
                  </div>
                  <span
                    className={`min-w-[3rem] text-right text-sm font-bold ${
                      week.attendance_rate >= 80
                        ? 'text-status-success'
                        : week.attendance_rate >= 60
                          ? 'text-accent-yellow-text'
                          : 'text-status-danger'
                    }`}
                  >
                    {week.attendance_rate}%
                  </span>
                </div>
              </div>
              {expandedId === week.session.id && (
                <div className="border-t border-ink-100 bg-ink-50/50 px-5 py-5 sm:px-12">
                  {loadingDetails === week.session.id ? (
                    <LoadingSpinner className="py-4" />
                  ) : details[week.session.id]?.length ? (
                    <div className="space-y-1.5">
                      {details[week.session.id].map((r) => (
                        <div
                          key={r.id}
                          className={`flex items-center justify-between rounded-card-sm px-4 py-2.5 text-sm ${
                            r.status === 'late' ? 'bg-accent-yellow-soft' : 'bg-white'
                          }`}
                        >
                          <span className="font-medium text-ink-700">{r.student_name}</span>
                          <Badge variant={r.status}>{r.status}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-ink-400">No attendance records</p>
                  )}
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
