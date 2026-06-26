import { useState } from 'react';
import { Save } from 'lucide-react';
import { useUiStore } from '../store/ui';

export function SettingsPage() {
  const { addToast } = useUiStore();
  const [startTime, setStartTime] = useState('09:00');
  const [threshold, setThreshold] = useState(15);
  const [timezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  const handleSave = () => {
    addToast('Settings are applied per-session when creating attendance records', 'info');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Settings</h1>

      <div className="max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-700">Class Configuration</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-slate-700">
              Default Class Start Time
            </label>
            <input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              Students checking in after this time + threshold are marked late
            </p>
          </div>

          <div>
            <label htmlFor="threshold" className="block text-sm font-medium text-slate-700">
              Late Threshold (minutes)
            </label>
            <input
              id="threshold"
              type="number"
              min={1}
              max={60}
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value, 10) || 15)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <p className="mt-1 text-xs text-slate-500">
              Minutes after start time before a student is considered late
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Your Timezone</label>
            <p className="mt-1 text-sm text-slate-600">{timezone}</p>
            <p className="mt-1 text-xs text-slate-500">
              Detected from your browser. Timestamps are stored in UTC.
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-4">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Save className="h-4 w-4" />
            Save Settings
          </button>
        </div>
      </div>

      <div className="max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 font-semibold text-slate-700">About</h2>
        <div className="space-y-1 text-sm text-slate-600">
          <p><span className="font-medium">App:</span> PYB Attendance</p>
          <p><span className="font-medium">Version:</span> 1.0.0</p>
          <p><span className="font-medium">Platform:</span> Cloudflare Pages + D1</p>
        </div>
      </div>
    </div>
  );
}
