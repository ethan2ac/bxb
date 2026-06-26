import { useState } from 'react';
import type { StudentFormData } from '../types';

interface StudentFormProps {
  initial?: Partial<StudentFormData>;
  onSubmit: (data: StudentFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export function StudentForm({ initial, onSubmit, onCancel, submitLabel = 'Save' }: StudentFormProps) {
  const [form, setForm] = useState<StudentFormData>({
    name: initial?.name || '',
    age: initial?.age || 10,
    gender: initial?.gender || '',
    birthday: initial?.birthday || '',
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">
          Name *
        </label>
        <input
          id="name"
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="age" className="block text-sm font-medium text-slate-700">
            Age *
          </label>
          <input
            id="age"
            type="number"
            required
            min={1}
            value={form.age}
            onChange={(e) => setForm({ ...form, age: parseInt(e.target.value, 10) || 0 })}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-slate-700">
            Gender *
          </label>
          <select
            id="gender"
            required
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Select...</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="birthday" className="block text-sm font-medium text-slate-700">
          Birthday *
        </label>
        <input
          id="birthday"
          type="date"
          required
          value={form.birthday}
          onChange={(e) => setForm({ ...form, birthday: e.target.value })}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
