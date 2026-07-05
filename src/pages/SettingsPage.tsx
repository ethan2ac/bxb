import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useUiStore } from '../store/ui';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { formatDateTime } from '../utils/dates';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { AppSettings, AuditLog } from '../types';

const inputClass =
  'mt-1.5 block w-full rounded-card-sm border border-ink-200 bg-ink-50/50 px-4 py-2.5 text-sm text-ink-800 shadow-sm focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400 transition-colors';

const ACTION_LABELS: Record<string, string> = {
  create: 'created',
  update: 'updated',
  archive: 'archived',
  restore: 'restored',
  delete: 'deleted',
  attendance_save: 'saved attendance for',
  forecast_save: 'saved a forecast for',
  register: 'registered as a new',
  reset_password: 'reset the password for',
};

export function SettingsPage() {
  const { addToast } = useUiStore();
  const { data: settings, loading: loadingSettings, refetch } = useApi<AppSettings>('/api/settings');
  const { data: logs, loading: loadingLogs, refetch: refetchLogs } = useApi<AuditLog[]>('/api/audit-logs?limit=15');

  const [startTime, setStartTime] = useState('09:00');
  const [threshold, setThreshold] = useState(15);
  const [noShowThreshold, setNoShowThreshold] = useState(3);
  const [saving, setSaving] = useState(false);
  const [timezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  useEffect(() => {
    if (settings) {
      setStartTime(settings.default_start_time);
      setThreshold(parseInt(settings.default_late_threshold_minutes, 10));
      setNoShowThreshold(parseInt(settings.no_show_threshold, 10));
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/settings', {
        default_start_time: startTime,
        default_late_threshold_minutes: threshold,
        no_show_threshold: noShowThreshold,
      });
      addToast('Settings saved', 'success');
      await Promise.all([refetch(), refetchLogs()]);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loadingSettings) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight-lg text-ink-900 md:text-5xl">Settings</h1>
        <p className="mt-2 text-base text-ink-400">Configure your attendance program</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-card border border-ink-100 bg-white p-5 shadow-card sm:p-8">
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
                  New sessions default to this start time. Students checking in after this time + threshold are marked late.
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
                <label htmlFor="noShowThreshold" className="block text-xs font-medium uppercase tracking-wider text-ink-400">
                  No-Show Threshold (sessions)
                </label>
                <input
                  id="noShowThreshold"
                  type="number"
                  min={1}
                  max={20}
                  value={noShowThreshold}
                  onChange={(e) => setNoShowThreshold(parseInt(e.target.value, 10) || 3)}
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs text-ink-400">
                  A student is flagged after this many consecutive absences (excused absences don't count)
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
                disabled={saving}
                className="flex items-center gap-2 rounded-pill bg-accent-charcoal px-6 py-2.5 text-sm font-medium text-white shadow-pill transition-all hover:bg-accent-dark disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>

          <div className="rounded-card border border-ink-100 bg-white p-5 shadow-card sm:p-8">
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

        {/* Activity log */}
        <div className="rounded-card border border-ink-100 bg-white shadow-card">
          <div className="border-b border-ink-100 px-5 py-5 sm:px-7">
            <h2 className="text-base font-semibold text-ink-800">Recent Activity</h2>
          </div>
          {loadingLogs ? (
            <LoadingSpinner className="py-8" />
          ) : !logs || logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-400">No activity recorded yet</div>
          ) : (
            <div className="max-h-[560px] divide-y divide-ink-100 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="px-5 py-3.5 text-sm sm:px-7">
                  <p className="text-ink-700">
                    <span className="font-medium">{log.actor_name || 'System'}</span>{' '}
                    {ACTION_LABELS[log.action] || log.action}{' '}
                    <span className="font-medium">{log.entity_type}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-ink-400">{formatDateTime(log.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
