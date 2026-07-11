import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Search, Check, X as XIcon, CalendarOff, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { useUiStore } from '../store/ui';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { GroupSummaryTable } from '../components/GroupSummaryTable';
import { FilterPanel, type SortBy } from '../components/FilterPanel';
import { formatDate } from '../utils/dates';
import { displayName, levelSortIndex } from '../utils/students';
import type { Student, CalendarEvent, Forecast, ForecastEntry, ForecastExpectation } from '../types';

interface RosterEntry {
  student: Student;
  expected: ForecastExpectation;
  notes: string;
}

const STATUS_OPTIONS: { value: ForecastExpectation | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'yes', label: 'Expected' },
  { value: 'excused', label: 'Excused' },
  { value: 'no', label: 'Not Expected' },
];

function ForecastRosterList({
  title,
  rows,
  onCycle,
  onNotesChange,
  emptyMessage = 'No students match',
}: {
  title?: string;
  rows: RosterEntry[];
  onCycle: (studentId: string) => void;
  onNotesChange: (studentId: string, value: string) => void;
  emptyMessage?: string;
}) {
  return (
    <div className="min-w-0 flex-1 space-y-3">
      {title && (
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-ink-700">{title}</h3>
          <span className="text-xs text-ink-400">{rows.length} students</span>
        </div>
      )}
      <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-400">{emptyMessage}</div>
        ) : (
          <div className="divide-y divide-ink-100">
            {rows.map((entry) => {
              const needsReason = entry.expected === 'no' || entry.expected === 'excused';
              return (
                <div key={entry.student.id} className="px-6 py-4 transition-colors hover:bg-ink-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => onCycle(entry.student.id)}
                        className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                          entry.expected === 'yes'
                            ? 'bg-status-success text-white shadow-sm'
                            : entry.expected === 'excused'
                              ? 'bg-status-info text-white shadow-sm'
                              : 'border-2 border-ink-200 text-ink-300 hover:border-ink-300'
                        }`}
                        aria-label={`Toggle forecast for ${displayName(entry.student)}`}
                      >
                        {entry.expected === 'yes' ? (
                          <Check className="h-5 w-5" />
                        ) : entry.expected === 'excused' ? (
                          <CalendarOff className="h-4 w-4" />
                        ) : (
                          <XIcon className="h-4 w-4" />
                        )}
                      </button>
                      <div>
                        <p className="text-sm font-medium text-ink-800">{displayName(entry.student)}</p>
                        {entry.student.level && <p className="mt-0.5 text-xs text-ink-400">{entry.student.level}</p>}
                      </div>
                    </div>
                  </div>
                  {needsReason && (
                    <input
                      type="text"
                      value={entry.notes}
                      onChange={(e) => onNotesChange(entry.student.id, e.target.value)}
                      placeholder={entry.expected === 'excused' ? 'Reason for excused (optional)' : 'Reason not expected (optional)'}
                      className="mt-3 w-full rounded-card-sm border border-ink-200 bg-ink-50/50 px-3 py-1.5 text-xs text-ink-700 placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function ForecastPage() {
  const { eventId: routeEventId } = useParams<{ eventId?: string }>();
  const { addToast } = useUiStore();
  const { data: events, loading: loadingEvents } = useApi<CalendarEvent[]>('/api/events?limit=100');
  const [eventId, setEventId] = useState(routeEventId || '');
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [statusFilter, setStatusFilter] = useState<ForecastExpectation | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showAllEvents, setShowAllEvents] = useState(false);

  const upcomingEvents = (events || [])
    .filter((e) => e.event_date >= new Date().toISOString().split('T')[0])
    .sort((a, b) => a.event_date.localeCompare(b.event_date) || a.start_time.localeCompare(b.start_time));

  const selectedEvent = events?.find((e) => e.id === eventId) || null;
  const dropdownEvents =
    selectedEvent && !upcomingEvents.some((e) => e.id === selectedEvent.id)
      ? [selectedEvent, ...upcomingEvents]
      : upcomingEvents;
  const EVENT_DROPDOWN_LIMIT = 6;
  const visibleEvents = showAllEvents ? dropdownEvents : dropdownEvents.slice(0, EVENT_DROPDOWN_LIMIT);
  const hasMoreEvents = !showAllEvents && dropdownEvents.length > EVENT_DROPDOWN_LIMIT;

  const handleEventSelect = (value: string) => {
    if (value === '__more__') {
      setShowAllEvents(true);
      return;
    }
    setEventId(value);
  };

  const load = useCallback(async () => {
    if (!eventId || !selectedEvent) return;
    setLoading(true);
    setSaveStatus('idle');
    try {
      const [students, forecastData] = await Promise.all([
        api.get<Student[]>(`/api/events/${eventId}/roster`),
        api.get<{ event: CalendarEvent; records: Forecast[] }>(`/api/forecasts?eventId=${eventId}`),
      ]);

      const recordMap = new Map<string, Forecast>();
      for (const r of forecastData.records || []) {
        recordMap.set(r.student_id, r);
      }

      setRoster(
        students.map((student) => {
          const existing = recordMap.get(student.id);
          return {
            student,
            expected: existing?.expected || 'no',
            notes: existing?.notes || '',
          };
        }),
      );
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load forecast', 'error');
    } finally {
      setLoading(false);
    }
  }, [eventId, selectedEvent, addToast]);

  useEffect(() => {
    load();
    // Switching events should never let a pending debounced save from the
    // previous event's notes field land against the new one.
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
  }, [load]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const persistRoster = useCallback(
    async (entries: RosterEntry[]) => {
      if (!eventId) return;
      setSaveStatus('saving');
      try {
        const records: ForecastEntry[] = entries.map((entry) => ({
          student_id: entry.student.id,
          expected: entry.expected,
          notes: entry.notes || null,
        }));
        await api.post('/api/forecasts/save', { event_id: eventId, records });
        setSaveStatus('saved');
      } catch (e) {
        setSaveStatus('error');
        addToast(e instanceof Error ? e.message : 'Failed to save forecast', 'error');
      }
    },
    [eventId, addToast],
  );

  // Cycles each student through: not expected -> expected -> excused -> not expected,
  // saving immediately since a click is already a deliberate, discrete action.
  const cycleExpected = (studentId: string) => {
    setRoster((prev) => {
      const next = prev.map((entry) => {
        if (entry.student.id !== studentId) return entry;
        const nextExpected: ForecastExpectation =
          entry.expected === 'no' ? 'yes' : entry.expected === 'yes' ? 'excused' : 'no';
        return { ...entry, expected: nextExpected };
      });
      persistRoster(next);
      return next;
    });
  };

  // Notes are free text, so saves are debounced until typing pauses instead
  // of firing on every keystroke.
  const handleNotesChange = (studentId: string, value: string) => {
    setRoster((prev) => {
      const next = prev.map((r) => (r.student.id === studentId ? { ...r, notes: value } : r));
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => persistRoster(next), 600);
      return next;
    });
  };

  const sortRoster = (entries: RosterEntry[]) =>
    [...entries].sort((a, b) =>
      sortBy === 'level'
        ? levelSortIndex(a.student) - levelSortIndex(b.student) || displayName(a.student).localeCompare(displayName(b.student))
        : displayName(a.student).localeCompare(displayName(b.student)),
    );

  const filteredRoster = sortRoster(
    roster.filter(
      (entry) =>
        displayName(entry.student).toLowerCase().includes(search.toLowerCase()) &&
        (statusFilter === 'all' || entry.expected === statusFilter),
    ),
  );
  const isBoth = selectedEvent?.group_scope === 'BOTH';
  const byRoster = filteredRoster.filter((e) => e.student.group_name === 'BY');
  const jdyRoster = filteredRoster.filter((e) => e.student.group_name === 'JDY');

  const groupExpectedStats = (entries: RosterEntry[]) => ({
    expected: entries.filter((e) => e.expected === 'yes').length,
    excused: entries.filter((e) => e.expected === 'excused').length,
    total: entries.length,
  });
  const byStats = groupExpectedStats(roster.filter((e) => e.student.group_name === 'BY'));
  const jdyStats = groupExpectedStats(roster.filter((e) => e.student.group_name === 'JDY'));
  const groupLabels = isBoth ? ['BY', 'JDY'] : [selectedEvent?.group_scope === 'JDY' ? 'JDY' : 'BY'];
  const summaryStats = isBoth ? [byStats, jdyStats] : selectedEvent?.group_scope === 'JDY' ? [jdyStats] : [byStats];
  const expectedCount = roster.filter((e) => e.expected === 'yes').length;

  if (loadingEvents) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight-lg text-ink-900 md:text-5xl">Forecast</h1>
        <p className="mt-2 text-base text-ink-400">Plan expected attendance ahead of an event</p>
      </div>

      <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
        <label className="block text-xs font-medium uppercase tracking-wider text-ink-400">Event</label>
        <select
          value={eventId}
          onChange={(e) => handleEventSelect(e.target.value)}
          className="mt-1.5 block w-full rounded-card-sm border border-ink-200 bg-ink-50/50 px-4 py-2.5 text-sm text-ink-800 shadow-sm focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400"
        >
          <option value="">Select an upcoming event...</option>
          {visibleEvents.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} &mdash; {formatDate(e.event_date)}
            </option>
          ))}
          {hasMoreEvents && <option value="__more__">Show more events&hellip;</option>}
        </select>
      </div>

      {!eventId && (
        <EmptyState
          title="Select an event"
          description="Choose an upcoming event above to forecast expected attendance"
        />
      )}

      {loading && <LoadingSpinner />}

      {eventId && !loading && (
        <>
          <div className="flex flex-col gap-6 lg:flex-row">
            {/* Filter panel — shown above the roster on mobile for easy access,
                hidden here on desktop where it lives in the side column instead. */}
            <div className="lg:hidden">
              <FilterPanel
                sortBy={sortBy}
                onSortByChange={setSortBy}
                levelSortLabel="Level"
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                statusOptions={STATUS_OPTIONS}
              />
            </div>

            <div className="flex-1 space-y-5">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-card-sm border border-ink-200 bg-white py-3 pl-11 pr-4 text-sm text-ink-700 shadow-card placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400"
                />
              </div>
              <p className="text-xs text-ink-400">
                Tap the circle to cycle: not expected &rarr; expected &rarr; excused &rarr; not expected.
              </p>

              {isBoth ? (
                <div className="flex flex-col gap-5 md:flex-row">
                  <ForecastRosterList
                    title="BY"
                    rows={byRoster}
                    onCycle={cycleExpected}
                    onNotesChange={handleNotesChange}
                    emptyMessage={search || statusFilter !== 'all' ? 'No BY students match' : 'No BY students enrolled'}
                  />
                  <ForecastRosterList
                    title="JDY"
                    rows={jdyRoster}
                    onCycle={cycleExpected}
                    onNotesChange={handleNotesChange}
                    emptyMessage={search || statusFilter !== 'all' ? 'No JDY students match' : 'No JDY students enrolled'}
                  />
                </div>
              ) : (
                <ForecastRosterList
                  rows={filteredRoster}
                  onCycle={cycleExpected}
                  onNotesChange={handleNotesChange}
                  emptyMessage={search || statusFilter !== 'all' ? 'No students match' : 'No students enrolled'}
                />
              )}
            </div>

            <div className="w-full space-y-5 lg:w-72">
              <div className="hidden lg:block">
                <FilterPanel
                  sortBy={sortBy}
                  onSortByChange={setSortBy}
                  levelSortLabel="Level"
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  statusOptions={STATUS_OPTIONS}
                />
              </div>
              <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
                <h3 className="text-sm font-semibold text-ink-700">Expected Headcount</h3>
                <p className="mt-4 text-4xl font-bold tracking-tight-lg text-status-success">{expectedCount}</p>
                <p className="mt-1 text-xs text-ink-400">of {roster.length} enrolled</p>
                <div className="mt-5 border-t border-ink-100 pt-5">
                  <GroupSummaryTable
                    groupLabels={groupLabels}
                    rows={[
                      {
                        key: 'expected',
                        label: 'Expected',
                        dotClassName: 'bg-status-success',
                        emphasize: true,
                        values: summaryStats.map((s) => s.expected),
                      },
                      {
                        key: 'excused',
                        label: 'Excused',
                        dotClassName: 'bg-status-info',
                        values: summaryStats.map((s) => s.excused),
                      },
                      { key: 'enrolled', label: 'Enrolled', values: summaryStats.map((s) => s.total) },
                    ]}
                  />
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 rounded-pill border border-ink-100 bg-white px-6 py-3 text-sm font-medium text-ink-400 shadow-card">
                {saveStatus === 'saving' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : saveStatus === 'error' ? (
                  'Failed to save — retry by changing a value'
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-status-success" />
                    {saveStatus === 'saved' ? 'All changes saved' : 'Changes save automatically'}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
