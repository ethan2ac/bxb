import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { formatDate } from '../utils/dates';
import type { WeeklyReport, AttendanceRecord } from '../types';
import { api } from '../lib/api';

export function WeeklyReportPage() {
  const { data: weeks, loading } = useApi<WeeklyReport[]>('/api/reports/weekly?limit=20');
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
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">Weekly Reports</h1>
        <EmptyState title="No sessions recorded" description="Take attendance on a Sunday to see weekly reports" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Weekly Reports</h1>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="w-8 px-2 py-3" />
              <th className="px-4 py-3 font-medium text-slate-600">Date</th>
              <th className="px-4 py-3 font-medium text-slate-600">Enrolled</th>
              <th className="px-4 py-3 font-medium text-slate-600">Present</th>
              <th className="px-4 py-3 font-medium text-slate-600">Late</th>
              <th className="px-4 py-3 font-medium text-slate-600">Absent</th>
              <th className="px-4 py-3 font-medium text-slate-600">Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {weeks.map((week) => (
              <Fragment key={week.session.id}>
                <tr
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => toggleExpand(week.session.id)}
                >
                  <td className="px-2 py-3 text-slate-400">
                    {expandedId === week.session.id ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {formatDate(week.session.session_date)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{week.enrolled}</td>
                  <td className="px-4 py-3 text-green-600 font-medium">{week.present}</td>
                  <td className="px-4 py-3 text-yellow-600 font-medium">{week.late}</td>
                  <td className="px-4 py-3 text-red-600 font-medium">{week.absent}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-medium ${
                        week.attendance_rate >= 80
                          ? 'text-green-600'
                          : week.attendance_rate >= 60
                            ? 'text-yellow-600'
                            : 'text-red-600'
                      }`}
                    >
                      {week.attendance_rate}%
                    </span>
                  </td>
                </tr>
                {expandedId === week.session.id && (
                  <tr key={`${week.session.id}-detail`}>
                    <td colSpan={7} className="bg-slate-50 px-8 py-4">
                      {loadingDetails === week.session.id ? (
                        <LoadingSpinner className="py-4" />
                      ) : details[week.session.id]?.length ? (
                        <div className="space-y-1">
                          {details[week.session.id].map((r) => (
                            <div
                              key={r.id}
                              className={`flex items-center justify-between rounded px-3 py-1.5 text-sm ${
                                r.status === 'late' ? 'bg-yellow-50' : ''
                              }`}
                            >
                              <span className="text-slate-700">{r.student_name}</span>
                              <Badge variant={r.status}>{r.status}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">No attendance records</p>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
