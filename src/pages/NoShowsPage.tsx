import { Link } from 'react-router-dom';
import { UserX, ChevronRight } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { formatDate } from '../utils/dates';
import type { NoShowStudent } from '../types';

export function NoShowsPage() {
  const { data: noShows, loading } = useApi<NoShowStudent[]>('/api/no-shows');

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">No Shows</h1>
        <p className="mt-1 text-sm text-slate-500">
          Students with more than 3 consecutive absences
        </p>
      </div>

      {!noShows || noShows.length === 0 ? (
        <EmptyState
          icon={<UserX className="h-10 w-10" />}
          title="No flagged students"
          description="All active students have attended within the last 3 sessions"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {noShows.map((student) => (
            <div
              key={student.id}
              className="rounded-lg border border-red-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">{student.name}</h3>
                  <p className="mt-1 text-sm text-red-600 font-medium">
                    {student.consecutive_absences} consecutive absences
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Last attended:{' '}
                    {student.last_attended_date
                      ? formatDate(student.last_attended_date)
                      : 'Never'}
                  </p>
                </div>
                <Link
                  to={`/students/${student.id}`}
                  className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
                >
                  Details
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
