import { formatDate } from '../utils/dates';
import type { CalendarEvent } from '../types';

interface EventPickerProps {
  events: CalendarEvent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// Shared "which upcoming event" picker — used identically on Attendance and
// Forecast, which both operate over the exact same range (today or later).
// Previously each page solved this with a different control (a date input
// plus a conditional <select> on one, a bare <select> with a "show more"
// sentinel on the other) for what is the same underlying task.
export function EventPicker({ events, selectedId, onSelect }: EventPickerProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {events.map((event) => {
        const active = event.id === selectedId;
        return (
          <button
            key={event.id}
            onClick={() => onSelect(event.id)}
            className={`flex-none rounded-card-sm border px-4 py-2.5 text-left transition-colors ${
              active
                ? 'border-accent-charcoal bg-accent-charcoal text-white'
                : 'border-ink-200 bg-ink-50/50 text-ink-700 hover:border-ink-300'
            }`}
          >
            <span
              className={`block font-mono text-[10px] font-medium uppercase tracking-wider ${
                active ? 'text-white/70' : 'text-ink-400'
              }`}
            >
              {formatDate(event.event_date)}
            </span>
            <span className="mt-0.5 block whitespace-nowrap text-sm font-medium">
              {event.name}
              {event.group_scope !== 'BOTH' && <span className="ml-1.5 opacity-70">&middot; {event.group_scope}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
