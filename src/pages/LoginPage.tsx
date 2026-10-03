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
    <div className="flex min-h-screen items-center justify-center bg-shell-surface p-4">
      <div className="relative w-full max-w-md">
        <div className="relative rounded-card border border-ink-200/70 bg-white p-8 shadow-shell sm:p-10">
          <div className="mb-8">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 bg-accent-charcoal" />
              <span className="font-display text-2xl tracking-tight text-ink-900">PYB</span>
              <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400">Attendance</span>
            </div>
            <h1 className="mt-6 font-display text-4xl leading-[0.95] tracking-tight text-ink-900">
              {mode === 'register' ? 'Create account' : 'Welcome back'}
            </h1>
            <p className="mt-2 text-sm text-ink-400">
              {mode === 'register' ? 'Use the invite code from your team owner.' : 'Sign in to manage your program.'}
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
