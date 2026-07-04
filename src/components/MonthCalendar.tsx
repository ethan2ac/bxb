import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarEvent } from '../types';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SCOPE_DOT: Record<CalendarEvent['group_scope'], string> = {
  BY: 'bg-ink-500',
  JDY: 'bg-status-info',
  BOTH: 'bg-accent-charcoal',
};

interface MonthCalendarProps {
  month: Date;
  events: CalendarEvent[];
  onMonthChange: (month: Date) => void;
  onDayClick: (dateStr: string) => void;
}

export function MonthCalendar({ month, events, onMonthChange, onDayClick }: MonthCalendarProps) {
  const gridStart = startOfWeek(startOfMonth(month));
  const gridEnd = endOfWeek(endOfMonth(month));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const list = eventsByDate.get(event.event_date) || [];
    list.push(event);
    eventsByDate.set(event.event_date, list);
  }

  return (
    <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight-lg text-ink-900">{format(month, 'MMMM yyyy')}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMonthChange(subMonths(month, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onMonthChange(new Date())}
            className="rounded-pill px-3 py-1.5 text-xs font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700"
          >
            Today
          </button>
          <button
            onClick={() => onMonthChange(addMonths(month, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="pb-1 text-center text-xs font-medium uppercase tracking-wider text-ink-400">
            {label}
          </div>
        ))}
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate.get(dateStr) || [];
          const inMonth = isSameMonth(day, month);
          const today = isToday(day);

          return (
            <button
              key={dateStr}
              onClick={() => onDayClick(dateStr)}
              aria-label={`${dateStr}${dayEvents.length ? ` (${dayEvents.length} event${dayEvents.length > 1 ? 's' : ''})` : ''}`}
              className={`flex min-h-[76px] flex-col items-start gap-1 rounded-card-sm border p-2 text-left transition-colors ${
                inMonth ? 'border-ink-100 bg-white hover:bg-ink-50/70' : 'border-transparent bg-ink-50/30 hover:bg-ink-50'
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  today
                    ? 'bg-accent-charcoal text-white'
                    : inMonth
                      ? 'text-ink-700'
                      : 'text-ink-300'
                }`}
              >
                {format(day, 'd')}
              </span>
              <div className="flex w-full flex-col gap-0.5">
                {dayEvents.slice(0, 2).map((e) => (
                  <span
                    key={e.id}
                    className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] font-medium text-ink-600"
                  >
                    <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${SCOPE_DOT[e.group_scope]}`} />
                    <span className="truncate">{e.name}</span>
                  </span>
                ))}
                {dayEvents.length > 2 && (
                  <span className="px-1 text-[10px] font-medium text-ink-400">+{dayEvents.length - 2} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
