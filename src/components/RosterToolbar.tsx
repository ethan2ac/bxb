import { Search, X } from 'lucide-react';

export type SortBy = 'name' | 'level';

export interface StatusChip<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface RosterToolbarProps<T extends string> {
  search: string;
  onSearchChange: (value: string) => void;
  sortBy: SortBy;
  onSortByChange: (value: SortBy) => void;
  statusFilter: T;
  onStatusFilterChange: (value: T) => void;
  statusOptions: StatusChip<T>[];
  progress?: { value: number; total: number; label: string };
}

// Sticky control bar for roster screens (Attendance, Forecast). Replaces a
// tall "Filters" card that pushed the first student ~1.5 screens down on a
// phone: search, sort and status now share two compact rows and stay pinned
// while scrolling, with a live progress line so the headline number is
// always visible mid-session.
export function RosterToolbar<T extends string>({
  search,
  onSearchChange,
  sortBy,
  onSortByChange,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  progress,
}: RosterToolbarProps<T>) {
  const pct = progress && progress.total > 0 ? Math.round((progress.value / progress.total) * 100) : 0;

  return (
    <div className="sticky top-14 z-20 -mx-4 space-y-3 border-b border-ink-200/70 bg-shell-surface/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:top-0 lg:mx-0 lg:rounded-card-sm lg:border lg:bg-white/95 lg:px-4 lg:shadow-card">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <input
            type="search"
            placeholder="Search students"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-10 pr-9 text-sm text-ink-700 placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-400 [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-300 hover:bg-ink-100 hover:text-ink-600"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex h-10 flex-none items-center rounded-lg border border-ink-200 bg-white p-0.5" role="group" aria-label="Sort by">
          {(['level', 'name'] as SortBy[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onSortByChange(option)}
              aria-pressed={sortBy === option}
              className={`h-full rounded-md px-3 text-xs font-medium capitalize transition-colors ${
                sortBy === option ? 'bg-ink-100 text-ink-900' : 'text-ink-400 hover:text-ink-700'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        {statusOptions.map((opt) => {
          const active = statusFilter === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onStatusFilterChange(opt.value)}
              aria-pressed={active}
              className={`flex flex-none items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-medium transition-colors ${
                active ? 'bg-accent-charcoal text-white' : 'border border-ink-200 bg-white text-ink-500 hover:bg-ink-50'
              }`}
            >
              {opt.label}
              {opt.count !== undefined && (
                <span className={`tabular-nums ${active ? 'text-white/70' : 'text-ink-300'}`}>{opt.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {progress && (
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full rounded-full bg-status-success transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
          <span className="flex-none font-mono text-[11px] font-medium uppercase tracking-wider text-ink-500">
            <span className="text-ink-900">{progress.value}</span>/{progress.total} {progress.label}
          </span>
        </div>
      )}
    </div>
  );
}
