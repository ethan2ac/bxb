import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { KeyRound, Trash2, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { useUiStore } from '../store/ui';
import { useAuthStore } from '../store/auth';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';
import { formatDateTime } from '../utils/dates';
import type { TeamUser } from '../types';

const inputClass =
  'mt-1.5 block w-full rounded-card-sm border border-ink-200 bg-ink-50/50 px-4 py-2.5 text-sm text-ink-800 shadow-sm focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400 transition-colors';

export function AdminUsersPage() {
  const { addToast } = useUiStore();
  const { user: currentUser } = useAuthStore();
  const { data: users, loading, refetch } = useApi<TeamUser[]>('/api/users');

  const [resettingUser, setResettingUser] = useState<TeamUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const [removingUser, setRemovingUser] = useState<TeamUser | null>(null);
  const [removing, setRemoving] = useState(false);

  const handleResetPassword = async () => {
    if (!resettingUser || newPassword.length < 6) return;
    setResetting(true);
    try {
      await api.put(`/api/users/${resettingUser.id}/password`, { password: newPassword });
      addToast(`Password reset for ${resettingUser.name}`, 'success');
      setResettingUser(null);
      setNewPassword('');
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to reset password', 'error');
    } finally {
      setResetting(false);
    }
  };

  const handleRemove = async () => {
    if (!removingUser) return;
    setRemoving(true);
    try {
      await api.delete(`/api/users/${removingUser.id}`);
      addToast(`${removingUser.name} removed`, 'success');
      setRemovingUser(null);
      await refetch();
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Failed to remove user', 'error');
    } finally {
      setRemoving(false);
    }
  };

  if (currentUser?.role !== 'owner') return <Navigate to="/" replace />;
  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight-lg text-ink-900 md:text-5xl">Manage Users</h1>
        <p className="mt-2 text-base text-ink-400">
          Only your account can see this page. Teammates create their own login from the Login screen's
          Register link using the invite code you share with them.
        </p>
      </div>

      <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
        <div className="divide-y divide-ink-100">
          {users?.map((u) => (
            <div
              key={u.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink-800">{u.name}</span>
                  {u.role === 'owner' && (
                    <span className="flex items-center gap-1 rounded-pill bg-accent-yellow-soft px-2.5 py-0.5 text-xs font-medium text-accent-yellow-text">
                      <ShieldCheck className="h-3 w-3" />
                      Owner
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-ink-400">
                  Joined {formatDateTime(u.created_at)}
                </p>
              </div>
              {u.role !== 'owner' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setResettingUser(u); setNewPassword(''); }}
                    className="flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700"
                  >
                    <KeyRound className="h-3 w-3" />
                    Reset Password
                  </button>
                  <button
                    onClick={() => setRemovingUser(u)}
                    className="flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium text-status-danger transition-colors hover:bg-status-danger-soft"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Modal
        open={!!resettingUser}
        onClose={() => { setResettingUser(null); setNewPassword(''); }}
        title="Reset Password"
      >
        {resettingUser && (
          <div className="space-y-5">
            <p className="text-sm text-ink-600">
              Set a new password for <span className="font-semibold">{resettingUser.name}</span>. They'll need
              to use it the next time they sign in.
            </p>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-ink-400">
                New Password
              </label>
              <input
                type="password"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setResettingUser(null); setNewPassword(''); }}
                className="rounded-pill border border-ink-200 bg-white px-5 py-2.5 text-sm font-medium text-ink-500 transition-colors hover:bg-ink-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetting || newPassword.length < 6}
                className="rounded-pill bg-accent-charcoal px-5 py-2.5 text-sm font-medium text-white shadow-pill transition-all hover:bg-accent-dark disabled:opacity-40"
              >
                {resetting ? 'Saving...' : 'Set Password'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!removingUser}
        onClose={() => setRemovingUser(null)}
        title="Remove User"
      >
        {removingUser && (
          <div className="space-y-5">
            <p className="text-sm text-ink-600">
              <span className="font-semibold">{removingUser.name}</span> will lose access immediately. They
              can register again later with the invite code if needed.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRemovingUser(null)}
                className="rounded-pill border border-ink-200 bg-white px-5 py-2.5 text-sm font-medium text-ink-500 transition-colors hover:bg-ink-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                disabled={removing}
                className="rounded-pill bg-status-danger px-5 py-2.5 text-sm font-medium text-white shadow-pill transition-all hover:opacity-90 disabled:opacity-40"
              >
                {removing ? 'Removing...' : 'Remove User'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
