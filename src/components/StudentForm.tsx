import { useState } from 'react';
import type { StudentFormData } from '../types';

interface StudentFormProps {
  initial?: Partial<StudentFormData>;
  onSubmit: (data: StudentFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

const inputClass =
  'mt-1.5 block w-full rounded-card-sm border border-ink-200 bg-ink-50/50 px-4 py-2.5 text-sm text-ink-800 shadow-sm placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400 transition-colors';

export function StudentForm({ initial, onSubmit, onCancel, submitLabel = 'Save' }: StudentFormProps) {
  const [form, setForm] = useState<StudentFormData>({
    english_name: initial?.english_name || '',
    chinese_name: initial?.chinese_name || '',
    age: initial?.age || 10,
    gender: initial?.gender || '',
    birthday: initial?.birthday || '',
    phone: initial?.phone || '',
    description: initial?.description || '',
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="english_name" className="block text-sm font-medium text-ink-600">
            English Name
          </label>
          <input
            id="english_name"
            type="text"
            required
            value={form.english_name}
            onChange={(e) => setForm({ ...form, english_name: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="chinese_name" className="block text-sm font-medium text-ink-600">
            Chinese Name
          </label>
          <input
            id="chinese_name"
            type="text"
            value={form.chinese_name}
            onChange={(e) => setForm({ ...form, chinese_name: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="age" className="block text-sm font-medium text-ink-600">
            Age
          </label>
          <input
            id="age"
            type="number"
            required
            min={1}
            value={form.age}
            onChange={(e) => setForm({ ...form, age: parseInt(e.target.value, 10) || 0 })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-ink-600">
            Gender
          </label>
          <select
            id="gender"
            required
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
            className={inputClass}
          >
            <option value="">Select...</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="birthday" className="block text-sm font-medium text-ink-600">
            Birthday <span className="font-normal text-ink-300">(optional)</span>
          </label>
          <input
            id="birthday"
            type="date"
            value={form.birthday}
            onChange={(e) => setForm({ ...form, birthday: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-ink-600">
            Phone <span className="font-normal text-ink-300">(optional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={inputClass}
            placeholder="+65 9123 4567"
          />
        </div>
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-ink-600">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
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
