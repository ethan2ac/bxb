import { useState, useMemo, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { displayName } from '../utils/students';
import type { CalendarEvent, GroupScope, Student } from '../types';

export interface EventFormData {
  name: string;
  event_date: string;
  group_scope: GroupScope;
  start_time: string;
  late_threshold_minutes: number;
  notes: string;
  restricted_roster: boolean;
  invitee_student_ids: string[];
}

interface EventFormProps {
  initial?: Partial<EventFormData>;
  onSubmit: (data: EventFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

const inputClass =
  'mt-1.5 block w-full rounded-card-sm border border-ink-200 bg-ink-50/50 px-4 py-2.5 text-sm text-ink-800 shadow-sm placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400 transition-colors';

export function eventFormDataFrom(event: CalendarEvent): EventFormData {
  return {
    name: event.name,
    event_date: event.event_date,
    group_scope: event.group_scope,
    start_time: event.start_time,
    late_threshold_minutes: event.late_threshold_minutes,
    notes: event.notes ?? '',
    restricted_roster: !!event.restricted_roster,
    invitee_student_ids: event.invitee_student_ids ?? [],
  };
}

function studentsInScope(students: Student[], scope: GroupScope): Student[] {
  return scope === 'BOTH' ? students : students.filter((s) => s.group_name === scope);
}

function StudentPicker({
  scope,
  selectedIds,
  onChange,
}: {
  scope: GroupScope;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const { data: students, loading } = useApi<Student[]>('/api/students');
  const [search, setSearch] = useState('');

  const inScope = useMemo(() => studentsInScope(students || [], scope), [students, scope]);
  const filtered = inScope.filter((s) => displayName(s).toLowerCase().includes(search.toLowerCase()));

  // Dropping to a narrower scope (or students finishing their first load)
  // must drop any selections that no longer belong to it.
  useEffect(() => {
    if (!students) return;
    const inScopeIds = new Set(inScope.map((s) => s.id));
    const pruned = selectedIds.filter((id) => inScopeIds.has(id));
    if (pruned.length !== selectedIds.length) onChange(pruned);
  }, [scope, students]);
  const sections: { label: string; rows: Student[] }[] =
    scope === 'BOTH'
      ? [
          { label: 'BY', rows: filtered.filter((s) => s.group_name === 'BY') },
          { label: 'JDY', rows: filtered.filter((s) => s.group_name === 'JDY') },
        ]
      : [{ label: scope, rows: filtered }];

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id]);
  };

  const selectAll = (rows: Student[]) => {
    const ids = new Set(selectedIds);
    rows.forEach((s) => ids.add(s.id));
    onChange([...ids]);
  };

  const clearAll = (rows: Student[]) => {
    const rowIds = new Set(rows.map((s) => s.id));
    onChange(selectedIds.filter((id) => !rowIds.has(id)));
  };

  if (loading) return <p className="text-xs text-ink-400">Loading students...</p>;

  return (
    <div className="space-y-3 rounded-card-sm border border-ink-200 bg-white p-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-300" />
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-card-sm border border-ink-200 bg-ink-50/50 py-2 pl-9 pr-3 text-xs text-ink-700 placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400"
        />
      </div>
      <p className="text-xs text-ink-400">{selectedIds.length} selected</p>
      <div className="max-h-64 space-y-4 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label}>
            {scope === 'BOTH' && (
              <div className="mb-1.5 flex items-center justify-between px-0.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                  {section.label}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => selectAll(section.rows)}
                    className="text-xs font-medium text-ink-500 hover:text-ink-700"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => clearAll(section.rows)}
                    className="text-xs font-medium text-ink-500 hover:text-ink-700"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
            {section.rows.length === 0 ? (
              <p className="px-0.5 text-xs text-ink-300">No students match</p>
            ) : (
              <div className="space-y-0.5">
                {section.rows.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-card-sm px-2 py-1.5 text-sm text-ink-700 hover:bg-ink-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(s.id)}
                      onChange={() => toggle(s.id)}
                      className="h-4 w-4 rounded border-ink-300 text-accent-charcoal focus:ring-ink-400"
                    />
                    {displayName(s)}
                    {s.level && <span className="text-xs text-ink-400">{s.level}</span>}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {scope !== 'BOTH' && (
        <div className="flex gap-3 border-t border-ink-100 pt-2">
          <button
            type="button"
            onClick={() => selectAll(inScope)}
            className="text-xs font-medium text-ink-500 hover:text-ink-700"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => clearAll(inScope)}
            className="text-xs font-medium text-ink-500 hover:text-ink-700"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

export function EventForm({ initial, onSubmit, onCancel, submitLabel = 'Save' }: EventFormProps) {
  const [form, setForm] = useState<EventFormData>({
    name: initial?.name || '',
    event_date: initial?.event_date || '',
    group_scope: initial?.group_scope || 'BOTH',
    start_time: initial?.start_time || '09:00',
    late_threshold_minutes: initial?.late_threshold_minutes ?? 15,
    notes: initial?.notes || '',
    restricted_roster: initial?.restricted_roster ?? false,
    invitee_student_ids: initial?.invitee_student_ids ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.restricted_roster && form.invitee_student_ids.length === 0) {
      setError('Select at least one student who is attending');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-card-sm bg-status-danger-soft px-4 py-3 text-sm text-status-danger">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-ink-600">
          Event Name
        </label>
        <input
          id="name"
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={inputClass}
          placeholder="e.g. Games (Outdoor)"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="event_date" className="block text-sm font-medium text-ink-600">
            Date
          </label>
          <input
            id="event_date"
            type="date"
            required
            value={form.event_date}
            onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="group_scope" className="block text-sm font-medium text-ink-600">
            Applies To
          </label>
          <select
            id="group_scope"
            required
            value={form.group_scope}
            onChange={(e) => setForm({ ...form, group_scope: e.target.value as GroupScope })}
            className={inputClass}
          >
            <option value="BOTH">Both BY &amp; JDY</option>
            <option value="BY">BY only</option>
            <option value="JDY">JDY only</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="start_time" className="block text-sm font-medium text-ink-600">
            Start Time
          </label>
          <input
            id="start_time"
            type="time"
            required
            value={form.start_time}
            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="late_threshold_minutes" className="block text-sm font-medium text-ink-600">
            Late Threshold (min)
          </label>
          <input
            id="late_threshold_minutes"
            type="number"
            min={1}
            required
            value={form.late_threshold_minutes}
            onChange={(e) => setForm({ ...form, late_threshold_minutes: parseInt(e.target.value, 10) || 15 })}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-ink-600">
          Notes <span className="font-normal text-ink-300">(optional)</span>
        </label>
        <textarea
          id="notes"
          rows={2}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className="rounded-card-sm border border-ink-100 bg-ink-50/50 p-4">
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={form.restricted_roster}
            onChange={(e) =>
              setForm({
                ...form,
                restricted_roster: e.target.checked,
                invitee_student_ids: e.target.checked ? form.invitee_student_ids : [],
              })
            }
            className="mt-0.5 h-4 w-4 rounded border-ink-300 text-accent-charcoal focus:ring-ink-400"
          />
          <span>
            <span className="font-medium">Not all students are attending</span>
            <span className="block text-xs font-normal text-ink-400">
              Pick which students to expect instead of the whole group
            </span>
          </span>
        </label>
        {form.restricted_roster && (
          <div className="mt-3">
            <StudentPicker
              scope={form.group_scope}
              selectedIds={form.invitee_student_ids}
              onChange={(ids) => setForm({ ...form, invitee_student_ids: ids })}
            />
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3 pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-pill border border-ink-200 bg-white px-5 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-pill bg-accent-charcoal px-6 py-2.5 text-sm font-medium text-white shadow-pill transition-all hover:bg-accent-dark disabled:opacity-50"
        >
          {saving ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
