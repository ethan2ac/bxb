import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarOff, ArrowRight } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { EventPicker } from '../components/EventPicker';
import { EventAttendanceView } from '../components/EventAttendanceView';
import { getTodayDateString, formatDate } from '../utils/dates';
import type { CalendarEvent } from '../types';

export function AttendancePage() {
  const { data: events, loading } = useApi<CalendarEvent[]>('/api/events?limit=100');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const upcomingEvents = useMemo(() => {
    const today = getTodayDateString();
    return (events || [])
      .filter((e) => e.event_date >= today)
      .sort((a, b) => a.event_date.localeCompare(b.event_date) || a.start_time.localeCompare(b.start_time));
  }, [events]);

  // Defaults to the soonest upcoming event — almost always today's — so
  // opening Attendance lands straight on a roster instead of an empty picker.
  // Falls back the same way if the previously selected event drops out of
  // range (e.g. its date passed while this page was open).
  const activeEventId =
    selectedEventId && upcomingEvents.some((e) => e.id === selectedEventId)
      ? selectedEventId
      : (upcomingEvents[0]?.id ?? null);
  const activeEvent = upcomingEvents.find((e) => e.id === activeEventId) ?? null;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight-lg text-ink-900 md:text-5xl">Attendance</h1>
        <p className="mt-2 text-base text-ink-400">
          {activeEvent ? formatDate(activeEvent.event_date) : 'No upcoming events yet'}
        </p>
      </div>

      {upcomingEvents.length > 0 && (
        <EventPicker events={upcomingEvents} selectedId={activeEventId} onSelect={setSelectedEventId} />
      )}

      {upcomingEvents.length === 0 ? (
        <EmptyState
          icon={<CalendarOff className="h-10 w-10" />}
          title="No event scheduled"
          description="There's nothing upcoming on the schedule yet."
          action={
            <Link
              to="/schedule"
              className="flex items-center gap-2 rounded-pill bg-accent-charcoal px-5 py-2.5 text-sm font-medium text-white shadow-pill transition-colors hover:bg-accent-dark"
            >
              Create an event <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      ) : (
        activeEventId && <EventAttendanceView eventId={activeEventId} />
      )}
    </div>
  );
}
