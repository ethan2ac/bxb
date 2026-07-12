import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Lock, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { useUiStore } from '../store/ui';
import { LoadingSpinner } from './LoadingSpinner';
import { RosterPanel } from './RosterPanel';
import { GroupSummaryTable } from './GroupSummaryTable';
import { FilterPanel, type SortBy } from './FilterPanel';
import { formatDate, getTodayDateString } from '../utils/dates';
import { displayName, levelSortIndex } from '../utils/students';
import type {
  Student,
  CalendarEvent,
  EventAttendanceRecord,
  AttendanceStatus,
  Forecast,
} from '../types';

interface RosterEntry {
  student: Student;
  status: AttendanceStatus;
  check_in_timestamp: string | null;
  notes: string;
}

const STATUS_OPTIONS: { value: AttendanceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'excused', label: 'Excused' },
  { value: 'absent', label: 'Absent' },
];

// Singapore doesn't observe DST, so +08:00 is always correct — matches
// computeAttendanceStatus server-side. A bare "Z" here would treat the
// admin's wall-clock start time as UTC (5pm instead of 9am), making the
// live preview disagree with what gets saved.
function computeLiveStatus(checkInIso: string, event: CalendarEvent): 'present' | 'late' {
  const [h, m] = event.start_time.split(':').map(Number);
  const threshold = new Date(
    `${event.event_date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000+08:00`,
  );
  threshold.setUTCMinutes(threshold.getUTCMinutes() + event.late_threshold_minutes);
  return new Date(checkInIso) > threshold ? 'late' : 'present';
}

// A "said yes but not here" flag is only meaningful once the class has
// actually begun — before start time, no-show is just wrong.
function hasEventStarted(event: CalendarEvent, atTime: number): boolean {
  const [h, m] = event.start_time.split(':').map(Number);
  const start = new Date(
    `${event.event_date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000+08:00`,
  );
  return atTime >= start.getTime();
}

// Per-event attendance-taking UI, shared between the main Attendance nav page
// (which picks an event via date + dropdown) and the Schedule-page deep link
// into a specific event — each renders attendance independently, never
// merged across events even when they share a date.
export function EventAttendanceView({ eventId }: { eventId: string }) {
  const { addToast } = useUiStore();
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('level');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [lateThresholdDraft, setLateThresholdDraft] = useState('');
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const notesSaveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Ticks the clock so the no-show flag can turn itself on the moment the
  // event's start time passes, without needing a tap or a page reload.
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const eventData = await api.get<CalendarEvent>(`/api/events/${eventId}`);
      setEvent(eventData);
      setLateThresholdDraft(String(eventData.late_threshold_minutes));

      const [students, attendanceData, forecastData] = await Promise.all([
        api.get<Student[]>(`/api/events/${eventId}/roster`),
        api.get<{ event: CalendarEvent; records: EventAttendanceRecord[] }>(`/api/event-attendance?eventId=${eventId}`),
        api.get<{ event: CalendarEvent; records: Forecast[] }>(`/api/forecasts?eventId=${eventId}`),
      ]);

      const recordMap = new Map<string, EventAttendanceRecord>();
      for (const r of attendanceData.records || []) {
        recordMap.set(r.student_id, r);
      }

      setRoster(
        students.map((student) => {
          const existing = recordMap.get(student.id);
          return {
            student,
            status: existing?.status || 'absent',
            check_in_timestamp: existing?.check_in_timestamp || null,
            notes: existing?.notes || '',
          };
        }),
      );
      setForecasts(forecastData.records || []);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to load event', 'error');
    } finally {
      setLoading(false);
    }
  }, [eventId, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  // Unmount cleanup only — in-flight debounced notes saves are intentionally
  // left to fire even after navigating away, since the timeout closure holds
  // its own entry snapshot and the request is harmless once it lands.
  useEffect(() => {
    const timers = notesSaveTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  // Persists a single student's record immediately, independent of every
  // other row. This is what makes concurrent edits from different admins
  // safe: each save only touches the one record being changed rather than
  // re-upserting a full, possibly-stale roster snapshot over everyone else's
  // in-flight updates.
  const persistEntry = useCallback(
    async (entry: RosterEntry) => {
      if (!event) return;
      try {
        await api.post('/api/event-attendance/save', {
          event_id: event.id,
          records: [
            {
              student_id: entry.student.id,
              status: entry.status,
              check_in_timestamp: entry.check_in_timestamp,
              notes: entry.notes || null,
            },
          ],
        });
      } catch (e) {
        addToast(e instanceof Error ? e.message : `Failed to save attendance for ${displayName(entry.student)}`, 'error');
      }
    },
    [event, addToast],
  );

  const cycleStatus = (studentId: string) => {
    setRoster((prev) => {
      const next = prev.map((entry): RosterEntry => {
        if (entry.student.id !== studentId) return entry;

        if (entry.status === 'absent') {
          const ts = new Date().toISOString();
          const status: AttendanceStatus = event ? computeLiveStatus(ts, event) : 'present';
          return { ...entry, status, check_in_timestamp: ts };
        }

        if (entry.status === 'present' || entry.status === 'late') {
          return { ...entry, status: 'excused', check_in_timestamp: null };
        }

        return { ...entry, status: 'absent', check_in_timestamp: null };
      });

      const updated = next.find((entry) => entry.student.id === studentId);
      if (updated) persistEntry(updated);
      return next;
    });
  };

  const saveLateThreshold = async () => {
    if (!event) return;
    const minutes = parseInt(lateThresholdDraft, 10);
    if (!Number.isInteger(minutes) || minutes < 1) {
      addToast('Late threshold must be a positive number of minutes', 'error');
      return;
    }
    setSavingThreshold(true);
    try {
      const updated = await api.put<CalendarEvent>(`/api/events/${event.id}`, {
        name: event.name,
        event_date: event.event_date,
        group_scope: event.group_scope,
        start_time: event.start_time,
        late_threshold_minutes: minutes,
        notes: event.notes,
        restricted_roster: event.restricted_roster === 1,
        invitee_student_ids: event.invitee_student_ids,
      });
      setEvent(updated);
      // Re-evaluate everyone already checked in against the new threshold
      // immediately, rather than leaving badges showing a stale present/late
      // split until the next tap or page reload.
      setRoster((prev) =>
        prev.map((entry) =>
          entry.check_in_timestamp
            ? { ...entry, status: computeLiveStatus(entry.check_in_timestamp, updated) }
            : entry,
        ),
      );
      addToast('Late threshold updated', 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to update late threshold', 'error');
    } finally {
      setSavingThreshold(false);
    }
  };

  const handleNotesChange = (studentId: string, value: string) => {
    setRoster((prev) => {
      const next = prev.map((r) => (r.student.id === studentId ? { ...r, notes: value } : r));

      // Debounced so we don't fire a request per keystroke — resets on every
      // change and only saves once typing pauses.
      const timers = notesSaveTimers.current;
      const existingTimer = timers.get(studentId);
      if (existingTimer) clearTimeout(existingTimer);
      timers.set(
        studentId,
        setTimeout(() => {
          timers.delete(studentId);
          const updated = next.find((entry) => entry.student.id === studentId);
          if (updated) persistEntry(updated);
        }, 600),
      );

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
        (statusFilter === 'all' || entry.status === statusFilter),
    ),
  );
  const isBoth = event?.group_scope === 'BOTH';
  const byRoster = filteredRoster.filter((e) => e.student.group_name === 'BY');
  const jdyRoster = filteredRoster.filter((e) => e.student.group_name === 'JDY');

  const groupStats = (entries: RosterEntry[]) => {
    const here = entries.filter((e) => e.status === 'present' || e.status === 'late').length;
    return { here, notHere: entries.length - here, total: entries.length };
  };
  const byStats = groupStats(roster.filter((e) => e.student.group_name === 'BY'));
  const jdyStats = groupStats(roster.filter((e) => e.student.group_name === 'JDY'));
  const groupLabels = isBoth ? ['BY', 'JDY'] : [event?.group_scope === 'JDY' ? 'JDY' : 'BY'];
  const summaryStats = isBoth ? [byStats, jdyStats] : event?.group_scope === 'JDY' ? [jdyStats] : [byStats];

  const forecastByStudent = new Map(forecasts.map((f) => [f.student_id, f.expected]));

  // Students who told us on the Forecast page they were coming ("yes") but
  // aren't showing as here — the mismatch this view is meant to surface at a
  // glance, distinct from a plain unexplained absence. Held back until the
  // event's start time actually passes (checking in early doesn't make
  // everyone else a no-show yet), and clears the instant a tap marks someone
  // present/late since noShowIds is recomputed from live roster state.
  const noShowIds =
    event && hasEventStarted(event, nowMs)
      ? new Set(
          roster
            .filter((entry) => forecastByStudent.get(entry.student.id) === 'yes' && entry.status !== 'present' && entry.status !== 'late')
            .map((entry) => entry.student.id),
        )
      : new Set<string>();

  const groupForecastStats = (entries: RosterEntry[]) => {
    let expected = 0;
    let notExpected = 0;
    let excused = 0;
    for (const entry of entries) {
      const value = forecastByStudent.get(entry.student.id) || 'no';
      if (value === 'yes') expected++;
      else if (value === 'excused') excused++;
      else notExpected++;
    }
    return { expected, notExpected, excused, total: entries.length };
  };
  const byForecastStats = groupForecastStats(roster.filter((e) => e.student.group_name === 'BY'));
  const jdyForecastStats = groupForecastStats(roster.filter((e) => e.student.group_name === 'JDY'));
  const forecastSummaryStats = isBoth
    ? [byForecastStats, jdyForecastStats]
    : event?.group_scope === 'JDY'
      ? [jdyForecastStats]
      : [byForecastStats];

  if (loading || !event) return <LoadingSpinner />;

  // Once an event's date has passed, this view becomes read-only — corrections
  // go through the Amend action on the event's History page instead, which
  // requires a reason and keeps an audit trail rather than a silent re-save.
  const isPast = event.event_date < getTodayDateString();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight-lg text-ink-900">{event.name}</h2>
          <p className="mt-1 text-sm text-ink-400">{formatDate(event.event_date)}</p>
        </div>
      </div>

      {isPast && (
        <div className="flex items-center gap-3 rounded-card border border-ink-100 bg-ink-50 px-5 py-4 text-sm text-ink-600">
          <Lock className="h-4 w-4 flex-shrink-0 text-ink-400" />
          <span>
            This event has already happened, so attendance here is locked.{' '}
            <Link to={`/reports/occurrence/event/${event.id}`} className="font-medium text-ink-800 underline underline-offset-2">
              Go to its History page
            </Link>{' '}
            to amend a student's record — amendments require a reason.
          </span>
        </div>
      )}

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
          {!isPast && (
            <p className="text-xs text-ink-400">
              Tap the circle to cycle: absent &rarr; present &rarr; excused &rarr; absent. Changes save automatically.
            </p>
          )}
          {noShowIds.size > 0 && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-status-danger">
              <AlertTriangle className="h-3.5 w-3.5" />
              {noShowIds.size} {noShowIds.size === 1 ? 'student' : 'students'} said yes on the Forecast but{' '}
              {noShowIds.size === 1 ? "hasn't" : "haven't"} shown up — highlighted in red below.
            </p>
          )}

          {isBoth ? (
            <div className="flex flex-col gap-5 md:flex-row">
              <RosterPanel
                title="BY"
                rows={byRoster}
                onCycle={cycleStatus}
                onNotesChange={handleNotesChange}
                locked={isPast}
                flaggedIds={noShowIds}
                emptyMessage={search || statusFilter !== 'all' ? 'No BY students match' : 'No BY students in this event'}
              />
              <RosterPanel
                title="JDY"
                rows={jdyRoster}
                onCycle={cycleStatus}
                onNotesChange={handleNotesChange}
                locked={isPast}
                flaggedIds={noShowIds}
                emptyMessage={search || statusFilter !== 'all' ? 'No JDY students match' : 'No JDY students in this event'}
              />
            </div>
          ) : (
            <RosterPanel
              rows={filteredRoster}
              onCycle={cycleStatus}
              onNotesChange={handleNotesChange}
              locked={isPast}
              flaggedIds={noShowIds}
              emptyMessage={search || statusFilter !== 'all' ? 'No students match' : "No students in this event's group"}
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
            <h3 className="text-sm font-semibold text-ink-700">Forecast Summary</h3>
            <p className="mt-0.5 text-xs text-ink-400">Who was expected, from the Forecast page</p>
            <div className="mt-4">
              <GroupSummaryTable
                groupLabels={groupLabels}
                rows={[
                  { key: 'enrolled', label: 'Enrolled', values: forecastSummaryStats.map((s) => s.total) },
                  {
                    key: 'expected',
                    label: 'Expected',
                    dotClassName: 'bg-status-success',
                    values: forecastSummaryStats.map((s) => s.expected),
                  },
                  {
                    key: 'excused',
                    label: 'Excused',
                    dotClassName: 'bg-status-info',
                    values: forecastSummaryStats.map((s) => s.excused),
                  },
                  {
                    key: 'not-expected',
                    label: 'Not Expected',
                    dotClassName: 'bg-status-danger/60',
                    values: forecastSummaryStats.map((s) => s.notExpected),
                  },
                ]}
              />
            </div>
          </div>

          <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
            <h3 className="text-sm font-semibold text-ink-700">Actual Attendance Summary</h3>
            <p className="mt-0.5 text-xs text-ink-400">Live, as attendance is taken below</p>
            <div className="mt-4">
              <GroupSummaryTable
                groupLabels={groupLabels}
                rows={[
                  { key: 'total', label: 'Total Students', values: summaryStats.map((s) => s.total) },
                  {
                    key: 'here',
                    label: 'Here',
                    dotClassName: 'bg-status-success',
                    emphasize: true,
                    values: summaryStats.map((s) => s.here),
                  },
                  {
                    key: 'not-here',
                    label: 'Not Here',
                    dotClassName: 'bg-status-danger/60',
                    values: summaryStats.map((s) => s.notHere),
                  },
                ]}
              />
            </div>
          </div>

          <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
            <h3 className="text-sm font-semibold text-ink-700">Event Details</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-400">Start time</span>
                <span className="font-medium text-ink-700">{event.start_time}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex-shrink-0 text-ink-400">Late after</span>
                {isPast ? (
                  <span className="font-medium text-ink-700">{event.late_threshold_minutes} min</span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      value={lateThresholdDraft}
                      onChange={(e) => setLateThresholdDraft(e.target.value)}
                      className="w-16 rounded-card-sm border border-ink-200 bg-ink-50/50 px-2 py-1 text-right text-sm text-ink-700 focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400"
                    />
                    <span className="text-ink-400">min</span>
                    {lateThresholdDraft !== String(event.late_threshold_minutes) && (
                      <button
                        onClick={saveLateThreshold}
                        disabled={savingThreshold}
                        className="rounded-pill bg-accent-charcoal px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
                      >
                        {savingThreshold ? '...' : 'Update'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
