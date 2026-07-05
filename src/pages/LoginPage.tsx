import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export function LoginPage() {
  const { user, login, register, loading } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');

  if (user) return <Navigate to="/" replace />;

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setInviteCode('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        await register(email, password, inviteCode);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const inputClass =
    'mt-1.5 block w-full rounded-card-sm border border-ink-200 bg-ink-50/50 px-4 py-3 text-sm text-ink-800 shadow-sm placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400 transition-colors';

  return (
    <div className="flex min-h-screen items-center justify-center bg-shell-bg p-4">
      <div className="relative w-full max-w-md">
        <div className="pointer-events-none absolute -right-20 -top-20 h-[300px] w-[300px] rounded-full bg-accent-yellow/10 blur-3xl" />
        <div className="relative rounded-shell bg-shell-surface p-10 shadow-shell">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-charcoal text-lg font-bold text-white shadow-pill">
              P
            </div>
            <h1 className="text-2xl font-bold tracking-tight-lg text-ink-900">PYB Attendance</h1>
            <p className="mt-1.5 text-sm text-ink-400">
              {mode === 'register' ? 'Create your account' : 'Sign in to manage your program'}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-card-sm bg-status-danger-soft px-4 py-3 text-sm text-status-danger">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink-600">
                Username
              </label>
              <input
                id="email"
                type="text"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="admin"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink-600">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={mode === 'register' ? 6 : undefined}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            {mode === 'register' && (
              <>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-600">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="inviteCode" className="block text-sm font-medium text-ink-600">
                    Invite Code
                  </label>
                  <input
                    id="inviteCode"
                    type="text"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className={inputClass}
                    placeholder="Ask the site owner for this"
                  />
                </div>
              </>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-pill bg-accent-charcoal px-6 py-3 text-sm font-medium text-white shadow-pill transition-all hover:bg-accent-dark disabled:opacity-50"
            >
              {loading ? 'Please wait...' : mode === 'register' ? 'Create Account' : 'Sign In'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-ink-400">
            {mode === 'register' ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-medium text-ink-700 hover:underline"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Need an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="font-medium text-ink-700 hover:underline"
                >
                  Register
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
