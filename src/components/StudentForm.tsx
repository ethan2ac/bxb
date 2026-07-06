import { useState } from 'react';
import { BY_LEVELS, JDY_LEVEL } from '../types';
import type { StudentFormData, GroupName } from '../types';

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
    group_name: initial?.group_name || 'BY',
    level: initial?.level || (initial?.group_name === 'JDY' ? JDY_LEVEL : ''),
    age: initial?.age ?? '',
    gender: initial?.gender || '',
    birthday: initial?.birthday || '',
    phone: initial?.phone || '',
    description: initial?.description || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleGroupChange = (group_name: GroupName) => {
    setForm({
      ...form,
      group_name,
      level: group_name === 'JDY' ? JDY_LEVEL : '',
      age: group_name === 'JDY' ? '' : form.age,
    });
  };

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="group_name" className="block text-sm font-medium text-ink-600">
            Group
          </label>
          <select
            id="group_name"
            required
            value={form.group_name}
            onChange={(e) => handleGroupChange(e.target.value as GroupName)}
            className={inputClass}
          >
            <option value="BY">BY</option>
            <option value="JDY">JDY</option>
          </select>
        </div>
        {form.group_name === 'BY' && (
          <div>
            <label htmlFor="level" className="block text-sm font-medium text-ink-600">
              Level
            </label>
            <select
              id="level"
              required
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
              className={inputClass}
            >
              <option value="">Select...</option>
              {BY_LEVELS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="english_name" className="block text-sm font-medium text-ink-600">
            English Name {form.group_name === 'JDY' && <span className="font-normal text-ink-300">(optional)</span>}
          </label>
          <input
            id="english_name"
            type="text"
            required={form.group_name === 'BY'}
            value={form.english_name}
            onChange={(e) => setForm({ ...form, english_name: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="chinese_name" className="block text-sm font-medium text-ink-600">
            Chinese Name {form.group_name === 'BY' && <span className="font-normal text-ink-300">(optional)</span>}
          </label>
          <input
            id="chinese_name"
            type="text"
            required={form.group_name === 'JDY'}
            value={form.chinese_name}
            onChange={(e) => setForm({ ...form, chinese_name: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {form.group_name === 'BY' && (
          <div>
            <label htmlFor="age" className="block text-sm font-medium text-ink-600">
              Age
            </label>
            <input
              id="age"
              type="number"
              min={1}
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value ? parseInt(e.target.value, 10) : '' })}
              className={inputClass}
            />
          </div>
        )}
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
