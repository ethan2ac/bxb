import { useState } from 'react';
import { Save } from 'lucide-react';
import { useUiStore } from '../store/ui';

const inputClass =
  'mt-1.5 block w-full rounded-card-sm border border-ink-200 bg-ink-50/50 px-4 py-2.5 text-sm text-ink-800 shadow-sm focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400 transition-colors';

export function SettingsPage() {
  const { addToast } = useUiStore();
  const [startTime, setStartTime] = useState('09:00');
  const [threshold, setThreshold] = useState(15);
  const [timezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  const handleSave = () => {
    addToast('Settings are applied per-session when creating attendance records', 'info');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight-lg text-ink-900 md:text-5xl">Settings</h1>
        <p className="mt-2 text-base text-ink-400">Configure your attendance program</p>
      </div>

      <div className="max-w-xl space-y-6">
        <div className="rounded-card border border-ink-100 bg-white p-8 shadow-card">
          <h2 className="text-base font-semibold text-ink-800">Class Configuration</h2>
          <div className="mt-6 space-y-5">
            <div>
              <label htmlFor="startTime" className="block text-xs font-medium uppercase tracking-wider text-ink-400">
                Default Class Start Time
              </label>
              <input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1.5 text-xs text-ink-400">
                Students checking in after this time + threshold are marked late
              </p>
            </div>

            <div>
              <label htmlFor="threshold" className="block text-xs font-medium uppercase tracking-wider text-ink-400">
                Late Threshold (minutes)
              </label>
              <input
                id="threshold"
                type="number"
                min={1}
                max={60}
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value, 10) || 15)}
                className={inputClass}
              />
              <p className="mt-1.5 text-xs text-ink-400">
                Minutes after start time before a student is considered late
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-ink-400">Your Timezone</label>
              <p className="mt-1.5 text-sm font-medium text-ink-700">{timezone}</p>
              <p className="mt-1 text-xs text-ink-400">
                Detected from your browser. Timestamps are stored in UTC.
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-ink-100 pt-6">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-pill bg-accent-charcoal px-6 py-2.5 text-sm font-medium text-white shadow-pill transition-all hover:bg-accent-dark"
            >
              <Save className="h-4 w-4" />
              Save Settings
            </button>
          </div>
        </div>

        <div className="rounded-card border border-ink-100 bg-white p-8 shadow-card">
          <h2 className="text-base font-semibold text-ink-800">About</h2>
          <div className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-400">App</span>
              <span className="font-medium text-ink-700">PYB Attendance</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-400">Version</span>
              <span className="font-medium text-ink-700">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-400">Platform</span>
              <span className="font-medium text-ink-700">Cloudflare Pages + D1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
