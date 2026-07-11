import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { formatDate } from '../utils/dates';
import type { WeeklyReport, UpcomingForecast } from '../types';

type ViewMode = 'attendance' | 'forecast';

function scopeLabel(scope: string): string {
  if (scope === 'BOTH') return 'BY & JDY';
  return scope;
}

export function WeeklyReportPage() {
  const [view, setView] = useState<ViewMode>('attendance');
  const { data: weeks, loading: loadingWeeks } = useApi<WeeklyReport[]>(
    view === 'attendance' ? '/api/reports/weekly?limit=20' : null,
  );
  const { data: upcoming, loading: loadingUpcoming } = useApi<UpcomingForecast[]>(
    view === 'forecast' ? '/api/reports/upcoming?limit=20' : null,
  );
  const loading = view === 'attendance' ? loadingWeeks : loadingUpcoming;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight-lg text-ink-900 md:text-5xl">History</h1>
        <p className="mt-2 text-base text-ink-400">
          {view === 'attendance'
            ? 'Past events and their recorded attendance'
            : 'Upcoming events and expected attendance'}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => setView('attendance')}
            className={`rounded-pill border px-4 py-2 text-sm font-medium transition-colors ${
              view === 'attendance'
                ? 'border-accent-charcoal bg-accent-charcoal text-white'
                : 'border-ink-200 bg-white text-ink-500 hover:bg-ink-50'
            }`}
          >
            Attendance &middot; Past
          </button>
          <button
            onClick={() => setView('forecast')}
            className={`rounded-pill border px-4 py-2 text-sm font-medium transition-colors ${
              view === 'forecast'
                ? 'border-accent-charcoal bg-accent-charcoal text-white'
                : 'border-ink-200 bg-white text-ink-500 hover:bg-ink-50'
            }`}
          >
            Forecast &middot; Upcoming
          </button>
        </div>
      </div>

      {loading && <LoadingSpinner />}

      {!loading && view === 'attendance' && (
        <>
          {!weeks || weeks.length === 0 ? (
            <EmptyState title="No past events" description="Take attendance on an event to see it here" />
          ) : (
            <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
              <div className="divide-y divide-ink-100">
                {weeks.map((week) => (
                  <Link
                    key={week.occurrence_id}
                    to={`/reports/occurrence/${week.occurrence_type}/${week.occurrence_id}`}
                    className="flex items-center justify-between px-7 py-5 transition-colors hover:bg-ink-50/50"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink-800">
                        {formatDate(week.occurrence_date)}
                        {week.occurrence_name && (
                          <span className="ml-2 text-xs font-normal text-ink-400">{week.occurrence_name}</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        {week.present + week.late}/{week.enrolled} attended
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden items-center gap-4 text-sm sm:flex">
                        <span className="w-24 whitespace-nowrap text-status-success font-medium">
                          {week.present} present
                        </span>
                        <span className="w-20 whitespace-nowrap text-accent-yellow-text font-medium">
                          {week.late} late
                        </span>
                        <span
                          className={`w-24 whitespace-nowrap font-medium ${week.excused > 0 ? 'text-status-info' : 'text-ink-300'}`}
                        >
                          {week.excused} excused
                        </span>
                        <span className="w-24 whitespace-nowrap text-status-danger font-medium">
                          {week.absent} absent
                        </span>
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
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-ink-300" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!loading && view === 'forecast' && (
        <>
          {!upcoming || upcoming.length === 0 ? (
            <EmptyState
              title="No upcoming events"
              description="Schedule an event to start forecasting expected attendance"
            />
          ) : (
            <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
              <div className="divide-y divide-ink-100">
                {upcoming.map((event) => (
                  <Link
                    key={event.id}
                    to={`/forecast/${event.id}`}
                    className="flex items-center justify-between px-7 py-5 transition-colors hover:bg-ink-50/50"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink-800">
                        {formatDate(event.event_date)}
                        <span className="ml-2 text-xs font-normal text-ink-400">{event.name}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400">{scopeLabel(event.group_scope)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {event.excused > 0 && (
                        <span className="hidden text-sm font-medium text-status-info sm:inline">
                          {event.excused} excused
                        </span>
                      )}
                      <span className="min-w-[6rem] text-right text-sm font-bold text-status-success">
                        Expected {event.expected}/{event.enrolled}
                      </span>
                      <ChevronRight className="h-4 w-4 flex-shrink-0 text-ink-300" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
