import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  BarChart3,
  Calendar,
  UserX,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { ToastContainer } from './Toast';
import { useAuthStore } from '../store/auth';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/attendance', label: 'Attendance', icon: ClipboardCheck },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/reports/student', label: 'Reports', icon: BarChart3 },
  { to: '/reports/weekly', label: 'Weekly', icon: Calendar },
  { to: '/no-shows', label: 'No Shows', icon: UserX },
];

export function Layout() {
  const { user, logout } = useAuthStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-shell-bg p-3 md:p-6 lg:p-8">
      <div className="relative mx-auto max-w-[1520px] overflow-hidden rounded-shell bg-shell-surface shadow-shell">
        {/* Warm yellow glow */}
        <div className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-accent-yellow/8 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-1/3 h-[400px] w-[400px] rounded-full bg-accent-yellow/5 blur-3xl" />

        {/* Top navigation */}
        <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10 md:py-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-charcoal text-sm font-bold text-white shadow-pill">
              P
            </div>
            <span className="text-base font-semibold text-ink-800">PYB</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 rounded-pill bg-ink-100/60 p-1.5 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-pill px-4 py-2 text-[13px] font-medium transition-all ${
                    isActive
                      ? 'bg-accent-charcoal text-white shadow-pill'
                      : 'text-ink-500 hover:text-ink-700'
                  }`
                }
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `hidden h-9 w-9 items-center justify-center rounded-full transition-colors md:flex ${
                  isActive ? 'bg-ink-200 text-ink-700' : 'text-ink-400 hover:bg-ink-100 hover:text-ink-600'
                }`
              }
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </NavLink>
            <div className="hidden h-5 w-px bg-ink-200 md:block" />
            <span className="hidden text-sm text-ink-400 md:block">{user?.name}</span>
            <button
              onClick={logout}
              className="hidden h-9 w-9 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600 md:flex"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>

            {/* Mobile menu */}
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 md:hidden"
              aria-label="Menu"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* Mobile nav dropdown */}
        {mobileNavOpen && (
          <div className="relative z-20 border-b border-ink-100 bg-shell-surface px-6 pb-4 md:hidden">
            <nav className="flex flex-col gap-1">
              {[...navItems, { to: '/settings', label: 'Settings', icon: Settings }].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={'end' in item ? item.end : false}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-card-sm px-4 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-accent-charcoal text-white'
                        : 'text-ink-500 hover:bg-ink-100 hover:text-ink-700'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
              <button
                onClick={() => { setMobileNavOpen(false); logout(); }}
                className="flex items-center gap-2.5 rounded-card-sm px-4 py-2.5 text-sm font-medium text-ink-500 hover:bg-ink-100"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </nav>
          </div>
        )}

        {/* Main content */}
        <main className="relative z-0 px-6 pb-10 pt-2 md:px-10 md:pb-14 md:pt-4">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
