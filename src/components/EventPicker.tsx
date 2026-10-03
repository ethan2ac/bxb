import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { differenceInCalendarDays, format, parse } from 'date-fns';
import { getTodayDateString } from '../utils/dates';
import type { CalendarEvent } from '../types';

interface EventPickerProps {
  events: CalendarEvent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const toDate = (d: string) => parse(d, 'yyyy-MM-dd', new Date());

function relativeDay(dateStr: string): string {
  const diff = differenceInCalendarDays(toDate(dateStr), toDate(getTodayDateString()));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return format(toDate(dateStr), 'EEEE');
  if (diff >= 7) return `In ${diff} days`;
  return `${-diff} days ago`;
}

function formatStartTime(t: string): string {
  return format(parse(t, 'HH:mm', new Date()), 'h:mm a');
}

const scopeLabel = (scope: string) => (scope === 'BOTH' ? 'BY & JDY' : scope);

// Calendar-icon style date tile (Apple Calendar / Luma) — the date is the
// primary way people identify a session, so it gets the visual weight.
function DateTile({ date, size = 'lg', highlight = false }: { date: string; size?: 'lg' | 'sm'; highlight?: boolean }) {
  const d = toDate(date);
  const lg = size === 'lg';
  return (
    <div
      className={`flex flex-none flex-col items-center justify-center overflow-hidden border text-center ${
        lg ? 'h-14 w-14 rounded-card-sm' : 'h-10 w-10 rounded-xl'
      } ${highlight ? 'border-accent-charcoal bg-accent-charcoal text-white' : 'border-ink-200 bg-white text-ink-900'}`}
    >
      <span
        className={`font-mono font-medium uppercase leading-none tracking-wider ${lg ? 'text-[10px]' : 'text-[8px]'} ${
          highlight ? 'text-accent-yellow' : 'text-status-danger'
        }`}
      >
        {format(d, 'MMM')}
      </span>
      <span className={`font-display leading-none ${lg ? 'mt-1 text-2xl' : 'mt-0.5 text-base'}`}>{format(d, 'd')}</span>
    </div>
  );
}

// Shared "which event" switcher for Attendance and Forecast. Shows the
// selected event as a single context card (what / when / who) with
// prev/next stepping, and a full list in a popover — a horizontal chip strip
// stopped scaling once every Sunday of the year was on the schedule.
export function EventPicker({ events, selectedId, onSelect }: EventPickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  const index = events.findIndex((e) => e.id === selectedId);
  const selected = index >= 0 ? events[index] : null;
  const prev = index > 0 ? events[index - 1] : null;
  const next = index >= 0 && index < events.length - 1 ? events[index + 1] : null;
  const canChoose = events.length > 1;

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const place = () => {
      const r = triggerRef.current!.getBoundingClientRect();
      setAnchor({ top: r.bottom + 8, left: r.left, width: r.width });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    selectedRef.current?.scrollIntoView({ block: 'center' });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!selected) return null;

  const choose = (id: string) => {
    onSelect(id);
    setOpen(false);
  };

  // Group the list by month so a long schedule stays scannable.
  const months: { label: string; items: CalendarEvent[] }[] = [];
  for (const e of events) {
    const label = format(toDate(e.event_date), 'MMMM yyyy');
    const last = months[months.length - 1];
    if (last?.label === label) last.items.push(e);
    else months.push({ label, items: [e] });
  }
  const today = getTodayDateString();

  const stepClass =
    'flex h-10 w-10 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800 disabled:pointer-events-none disabled:opacity-30';

  return (
    <div className="flex items-center gap-2 rounded-card border border-ink-100 bg-white p-2 shadow-card">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => canChoose && setOpen((o) => !o)}
        disabled={!canChoose}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex min-w-0 flex-1 items-center gap-3.5 rounded-card-sm p-1.5 text-left transition-colors enabled:hover:bg-ink-50"
      >
        <DateTile date={selected.event_date} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-base font-semibold text-ink-900">{selected.name}</span>
            {canChoose && <ChevronDown className={`h-4 w-4 flex-none text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`} />}
          </div>
          <p className="mt-0.5 truncate text-sm text-ink-400">
            <span className={selected.event_date === today ? 'font-medium text-status-success' : 'font-medium text-ink-600'}>
              {relativeDay(selected.event_date)}
            </span>
            {' · '}
            {formatStartTime(selected.start_time)}
            <span className="hidden sm:inline">
              {' · '}
              {format(toDate(selected.event_date), 'EEE, d MMM')}
            </span>
            {' · '}
            {scopeLabel(selected.group_scope)}
          </p>
        </div>
      </button>

      {canChoose && (
        <div className="flex flex-none items-center border-l border-ink-100 pl-1">
          <button type="button" onClick={() => prev && onSelect(prev.id)} disabled={!prev} className={stepClass} aria-label="Previous event">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => next && onSelect(next.id)} disabled={!next} className={stepClass} aria-label="Next event">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {open &&
        createPortal(
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-ink-900/30 sm:bg-transparent" onClick={() => setOpen(false)} aria-hidden="true" />
            {/* Bottom sheet on phones, anchored dropdown from sm up. */}
            <div
              role="listbox"
              aria-label="Choose event"
              style={anchor ? ({ '--top': `${anchor.top}px`, '--left': `${anchor.left}px`, '--width': `${anchor.width}px` } as React.CSSProperties) : undefined}
              className="absolute inset-x-0 bottom-0 flex max-h-[75vh] flex-col rounded-t-card bg-white pb-[env(safe-area-inset-bottom)] shadow-shell sm:inset-x-auto sm:bottom-auto sm:left-[var(--left)] sm:top-[var(--top)] sm:max-h-[min(28rem,calc(100vh-var(--top)-1rem))] sm:w-[max(22rem,var(--width))] sm:rounded-card sm:border sm:border-ink-100 sm:pb-0"
            >
              <div className="flex items-center justify-between px-5 pb-2 pt-4 sm:hidden">
                <span className="text-base font-semibold text-ink-900">Choose event</span>
                <button onClick={() => setOpen(false)} className="rounded-full p-2 text-ink-400 hover:bg-ink-100" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto px-2 pb-2 sm:pt-2">
                {months.map((m) => (
                  <div key={m.label}>
                    <div className="eyebrow sticky top-0 z-10 bg-white px-3 pb-1.5 pt-3">{m.label}</div>
                    {m.items.map((e) => {
                      const active = e.id === selectedId;
                      return (
                        <button
                          key={e.id}
                          ref={active ? selectedRef : undefined}
                          role="option"
                          aria-selected={active}
                          onClick={() => choose(e.id)}
                          className={`flex w-full items-center gap-3 rounded-card-sm px-3 py-2.5 text-left transition-colors ${
                            active ? 'bg-ink-100' : 'hover:bg-ink-50'
                          }`}
                        >
                          <DateTile date={e.event_date} size="sm" highlight={e.event_date === today} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink-800">{e.name}</p>
                            <p className="mt-0.5 truncate text-xs text-ink-400">
                              {relativeDay(e.event_date)} · {formatStartTime(e.start_time)} · {scopeLabel(e.group_scope)}
                            </p>
                          </div>
                          {active && <Check className="h-4 w-4 flex-none text-ink-700" />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
