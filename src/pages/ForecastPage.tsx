import { useState, useEffect, useCallback } from 'react';
import { Save, Search, Check, X as XIcon } from 'lucide-react';
import { api } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { useUiStore } from '../store/ui';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { formatDate } from '../utils/dates';
import { displayName } from '../utils/students';
import type { Student, CalendarEvent, Forecast, ForecastEntry, ForecastExpectation } from '../types';

interface RosterEntry {
  student: Student;
  expected: ForecastExpectation;
  notes: string;
}

export function ForecastPage() {
  const { addToast } = useUiStore();
  const { data: events, loading: loadingEvents } = useApi<CalendarEvent[]>('/api/events?limit=100');
  const [eventId, setEventId] = useState('');
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const upcomingEvents = (events || [])
    .filter((e) => e.event_date >= new Date().toISOString().split('T')[0])
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  const selectedEvent = events?.find((e) => e.id === eventId) || null;

  const load = useCallback(async () => {
    if (!eventId || !selectedEvent) return;
    setLoading(true);
    try {
      const studentsUrl =
        selectedEvent.group_scope === 'BOTH' ? '/api/students' : `/api/students?group=${selectedEvent.group_scope}`;
      const [students, forecastData] = await Promise.all([
        api.get<Student[]>(studentsUrl),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleExpected = (studentId: string) => {
    setRoster((prev) =>
      prev.map((entry) =>
        entry.student.id === studentId
          ? { ...entry, expected: entry.expected === 'yes' ? 'no' : 'yes' }
          : entry,
      ),
    );
  };

  const saveForecast = async () => {
    if (!eventId) return;
    setSaving(true);
    try {
      const records: ForecastEntry[] = roster.map((entry) => ({
        student_id: entry.student.id,
        expected: entry.expected,
        notes: entry.notes || null,
      }));
      await api.post('/api/forecasts/save', { event_id: eventId, records });
      addToast('Forecast saved successfully', 'success');
      await load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredRoster = roster.filter((entry) =>
    displayName(entry.student).toLowerCase().includes(search.toLowerCase()),
  );
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
          onChange={(e) => setEventId(e.target.value)}
          className="mt-1.5 block w-full rounded-card-sm border border-ink-200 bg-ink-50/50 px-4 py-2.5 text-sm text-ink-800 shadow-sm focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400"
        >
          <option value="">Select an upcoming event...</option>
          {upcomingEvents.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} &mdash; {formatDate(e.event_date)}
            </option>
          ))}
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

              <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
                {filteredRoster.length === 0 ? (
                  <div className="p-12 text-center text-sm text-ink-400">No students match</div>
                ) : (
                  <div className="divide-y divide-ink-100">
                    {filteredRoster.map((entry) => (
                      <div
                        key={entry.student.id}
                        className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-ink-50/50"
                      >
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => toggleExpected(entry.student.id)}
                            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                              entry.expected === 'yes'
                                ? 'bg-status-success text-white shadow-sm'
                                : 'border-2 border-ink-200 text-ink-300 hover:border-ink-300'
                            }`}
                            aria-label={`Toggle forecast for ${displayName(entry.student)}`}
                          >
                            {entry.expected === 'yes' ? <Check className="h-5 w-5" /> : <XIcon className="h-4 w-4" />}
                          </button>
                          <p className="text-sm font-medium text-ink-800">{displayName(entry.student)}</p>
                        </div>
                        <input
                          type="text"
                          value={entry.notes}
                          onChange={(e) =>
                            setRoster((prev) =>
                              prev.map((r) =>
                                r.student.id === entry.student.id ? { ...r, notes: e.target.value } : r,
                              ),
                            )
                          }
                          placeholder="Note (optional)"
                          className="w-40 rounded-card-sm border border-ink-200 bg-ink-50/50 px-3 py-1.5 text-xs text-ink-700 placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="w-full space-y-5 lg:w-72">
              <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
                <h3 className="text-sm font-semibold text-ink-700">Expected Headcount</h3>
                <p className="mt-4 text-4xl font-bold tracking-tight-lg text-status-success">{expectedCount}</p>
                <p className="mt-1 text-xs text-ink-400">of {roster.length} enrolled</p>
              </div>
              <button
                onClick={saveForecast}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-pill bg-accent-charcoal px-6 py-3 text-sm font-medium text-white shadow-pill transition-all hover:bg-accent-dark disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Forecast'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
