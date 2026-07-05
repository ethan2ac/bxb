import { useState } from 'react';
import type { CalendarEvent, GroupScope } from '../types';

export interface EventFormData {
  name: string;
  event_date: string;
  group_scope: GroupScope;
  start_time: string;
  late_threshold_minutes: number;
  notes: string;
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
  };
}

export function EventForm({ initial, onSubmit, onCancel, submitLabel = 'Save' }: EventFormProps) {
  const [form, setForm] = useState<EventFormData>({
    name: initial?.name || '',
    event_date: initial?.event_date || '',
    group_scope: initial?.group_scope || 'BOTH',
    start_time: initial?.start_time || '09:00',
    late_threshold_minutes: initial?.late_threshold_minutes ?? 15,
    notes: initial?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
