import { useState, useEffect, useCallback } from 'react';
import { CalendarOff } from 'lucide-react';
import { api } from '../lib/api';
import { useUiStore } from '../store/ui';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { EventAttendanceView } from '../components/EventAttendanceView';
import { getDefaultSessionDate, formatDate } from '../utils/dates';
import type { CalendarEvent } from '../types';

export function AttendancePage() {
  const { addToast } = useUiStore();
  const [sessionDate, setSessionDate] = useState(getDefaultSessionDate);
  const [dayEvents, setDayEvents] = useState<CalendarEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDayEvents = useCallback(async () => {
    setLoading(true);
    try {
      const events = await api.get<CalendarEvent[]>(`/api/events?date=${sessionDate}`);
      setDayEvents(events);
      // Default to the earliest-starting event whenever the date (and so the
      // set of events) changes — each event's attendance is independent, so
      // switching dates always lands on a fresh, deliberate selection.
      const earliest = [...events].sort((a, b) => a.start_time.localeCompare(b.start_time))[0];
      setSelectedEventId(earliest ? earliest.id : null);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load events for this date', 'error');
    } finally {
      setLoading(false);
    }
  }, [sessionDate, addToast]);

  useEffect(() => {
    loadDayEvents();
  }, [loadDayEvents]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSessionDate(e.target.value);
  };

  if (loading) return <LoadingSpinner />;

  const hasEvents = dayEvents.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight-lg text-ink-900 md:text-5xl">Attendance</h1>
          <p className="mt-2 text-base text-ink-400">{formatDate(sessionDate)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={sessionDate}
            onChange={handleDateChange}
            className="rounded-card-sm border border-ink-200 bg-ink-50/50 px-4 py-2.5 text-sm text-ink-700 shadow-sm focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400"
          />
          {dayEvents.length > 1 && (
            <select
              value={selectedEventId ?? ''}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="rounded-card-sm border border-ink-200 bg-ink-50/50 px-4 py-2.5 text-sm text-ink-700 shadow-sm focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400"
            >
              {dayEvents.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} ({event.group_scope === 'BOTH' ? 'BY & JDY' : event.group_scope})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {!hasEvents ? (
        <EmptyState
          icon={<CalendarOff className="h-10 w-10" />}
          title="No event scheduled"
          description={`There's nothing on the schedule for ${formatDate(sessionDate)}. Add an event on the Schedule page to take attendance for this date.`}
        />
      ) : (
        selectedEventId && <EventAttendanceView eventId={selectedEventId} />
      )}
    </div>
  );
}
