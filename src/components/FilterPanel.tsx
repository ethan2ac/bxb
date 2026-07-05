export type SortBy = 'name' | 'level';

interface StatusOption<T extends string> {
  value: T;
  label: string;
}

interface FilterPanelProps<T extends string> {
  sortBy: SortBy;
  onSortByChange: (value: SortBy) => void;
  levelSortLabel?: string;
  statusFilter: T;
  onStatusFilterChange: (value: T) => void;
  statusOptions: StatusOption<T>[];
}

function pillClass(active: boolean): string {
  return `rounded-pill px-3 py-1.5 text-xs font-medium transition-colors ${
    active ? 'bg-accent-charcoal text-white' : 'border border-ink-200 text-ink-500 hover:bg-ink-50'
  }`;
}

export function FilterPanel<T extends string>({
  sortBy,
  onSortByChange,
  levelSortLabel = 'Level',
  statusFilter,
  onStatusFilterChange,
  statusOptions,
}: FilterPanelProps<T>) {
  return (
    <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card">
      <h3 className="text-sm font-semibold text-ink-700">Filters</h3>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Sort by</p>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => onSortByChange('name')} className={pillClass(sortBy === 'name')}>
            Name
          </button>
          <button type="button" onClick={() => onSortByChange('level')} className={pillClass(sortBy === 'level')}>
            {levelSortLabel}
          </button>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Status</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onStatusFilterChange(opt.value)}
              className={pillClass(statusFilter === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
