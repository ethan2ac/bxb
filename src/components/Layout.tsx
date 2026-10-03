import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Search, LogOut, MoreHorizontal, X } from 'lucide-react';
import { ToastContainer } from './Toast';
import { CommandPalette } from './CommandPalette';
import { useAuthStore } from '../store/auth';
import { navSections, mobileTabs, settingsEntry, adminEntry, allPages, type NavEntry } from './navigation';

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

function initials(name: string | undefined): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function SidebarLink({ item }: { item: NavEntry }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors ${
          isActive ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:bg-ink-100 hover:text-ink-800'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <item.icon className={`h-4 w-4 flex-none ${isActive ? 'text-ink-900' : 'text-ink-400 group-hover:text-ink-600'}`} />
          {item.label}
        </>
      )}
    </NavLink>
  );
}

export function Layout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const isOwner = user?.role === 'owner';
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Any navigation (tab tap, palette jump, in-page link) dismisses overlays.
  useEffect(() => {
    setMoreOpen(false);
    setPaletteOpen(false);
  }, [location.pathname]);

  const tabPaths = new Set(mobileTabs.map((t) => t.to));
  const moreItems = [
    ...navSections.flatMap((s) => s.items).filter((i) => !tabPaths.has(i.to)),
    settingsEntry,
    ...(isOwner ? [adminEntry] : []),
  ];
  const moreActive = moreItems.some((i) => location.pathname.startsWith(i.to));

  return (
    <div className="min-h-screen bg-shell-surface">
      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-ink-200/70 bg-shell-surface lg:flex">
        <div className="flex h-16 items-center gap-2 px-6">
          <span className="h-2.5 w-2.5 flex-none bg-accent-charcoal" />
          <span className="font-display text-xl tracking-tight text-ink-900">PYB</span>
          <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400">Attendance</span>
        </div>

        <div className="px-4">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex w-full items-center gap-2.5 rounded-lg border border-ink-200 bg-white px-3 py-2 text-left text-[13px] text-ink-400 shadow-card transition-colors hover:border-ink-300"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1">Search…</span>
            <kbd className="rounded border border-ink-200 px-1.5 font-mono text-[10px] text-ink-400">
              {IS_MAC ? '⌘' : 'Ctrl'} K
            </kbd>
          </button>
        </div>

        <nav className="mt-4 flex-1 space-y-6 overflow-y-auto px-4 pb-4" aria-label="Main">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 pb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-ink-400">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <SidebarLink key={item.to} item={item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="space-y-0.5 border-t border-ink-200/70 px-4 py-4">
          {isOwner && <SidebarLink item={adminEntry} />}
          <SidebarLink item={settingsEntry} />
          <div className="mt-3 flex items-center gap-3 rounded-lg px-3 py-2">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent-charcoal text-xs font-semibold text-white">
              {initials(user?.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink-800">{user?.name}</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-ink-400">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile top bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ink-200/70 bg-shell-surface/90 px-4 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 bg-accent-charcoal" />
          <span className="font-display text-lg tracking-tight text-ink-900">PYB</span>
        </div>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100"
          aria-label="Search"
        >
          <Search className="h-[18px] w-[18px]" />
        </button>
      </header>

      {/* ── Page content ──────────────────────────────────────────────── */}
      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-14 lg:pt-10">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile bottom tab bar ─────────────────────────────────────── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200/70 bg-white/95 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Main"
      >
        <div className="grid h-16 grid-cols-5">
          {mobileTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors ${
                  isActive ? 'text-ink-900' : 'text-ink-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                      isActive ? 'bg-ink-100' : ''
                    }`}
                  >
                    <tab.icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2.25 : 1.75} />
                  </span>
                  {tab.label}
                </>
              )}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-1 text-[10.5px] font-medium ${
              moreActive ? 'text-ink-900' : 'text-ink-400'
            }`}
          >
            <span className={`flex h-7 w-12 items-center justify-center rounded-full ${moreActive ? 'bg-ink-100' : ''}`}>
              <MoreHorizontal className="h-[19px] w-[19px]" />
            </span>
            More
          </button>
        </div>
      </nav>

      {/* ── Mobile "More" sheet ───────────────────────────────────────── */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/30" onClick={() => setMoreOpen(false)} aria-hidden="true" />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-card bg-white px-4 pt-3 shadow-shell"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
            role="dialog"
            aria-label="More"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink-200" />
            <div className="mb-2 flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-charcoal text-xs font-semibold text-white">
                  {initials(user?.name)}
                </span>
                <div>
                  <p className="text-sm font-medium text-ink-800">{user?.name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-ink-400">{user?.role}</p>
                </div>
              </div>
              <button
                onClick={() => setMoreOpen(false)}
                className="rounded-full p-2 text-ink-400 hover:bg-ink-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="divide-y divide-ink-100 border-y border-ink-100">
              {moreItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-2 py-3.5 text-[15px] font-medium ${isActive ? 'text-ink-900' : 'text-ink-600'}`
                  }
                >
                  <item.icon className="h-[18px] w-[18px] text-ink-400" />
                  {item.label}
                </NavLink>
              ))}
            </div>
            <button
              onClick={logout}
              className="mt-2 flex w-full items-center gap-3 px-2 py-3.5 text-[15px] font-medium text-status-danger"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Log out
            </button>
          </div>
        </div>
      )}

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} pages={allPages(isOwner)} />
      <ToastContainer />
    </div>
  );
}
