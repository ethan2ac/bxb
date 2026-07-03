import { Link } from 'react-router-dom';
import { UserX, ChevronRight, AlertTriangle } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { formatDate } from '../utils/dates';
import type { NoShowStudent } from '../types';

export function NoShowsPage() {
  const { data: noShows, loading } = useApi<NoShowStudent[]>('/api/no-shows');

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight-lg text-ink-900 md:text-5xl">No Shows</h1>
        <p className="mt-2 text-base text-ink-400">
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
        <>
          {/* Alert banner */}
          <div className="flex items-center gap-4 rounded-card bg-accent-charcoal p-6 shadow-dark-card">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-accent-yellow/20">
              <AlertTriangle className="h-5 w-5 text-accent-yellow" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {noShows.length} student{noShows.length !== 1 ? 's' : ''} require attention
              </p>
              <p className="mt-0.5 text-xs text-ink-400">
                These students have missed more than 3 consecutive Sunday sessions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {noShows.map((student) => (
              <div
                key={student.id}
                className="rounded-card border border-ink-100 bg-white p-6 shadow-card transition-shadow hover:shadow-card-hover"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-status-danger-soft text-sm font-bold text-status-danger">
                      {student.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-ink-800">{student.name}</h3>
                      <p className="mt-1 text-sm font-medium text-status-danger">
                        {student.consecutive_absences} consecutive absences
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        Last attended:{' '}
                        {student.last_attended_date
                          ? formatDate(student.last_attended_date)
                          : 'Never'}
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/students/${student.id}`}
                    className="flex items-center gap-1 rounded-pill border border-ink-200 bg-white px-4 py-2 text-xs font-medium text-ink-600 transition-colors hover:bg-ink-50"
                  >
                    Details
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
