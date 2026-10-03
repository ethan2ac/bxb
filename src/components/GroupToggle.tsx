export type GroupToggleValue = 'ALL' | 'BY' | 'JDY';

interface GroupToggleProps {
  value: GroupToggleValue;
  onChange: (value: GroupToggleValue) => void;
}

// Segmented control — one bordered track with the active segment filled,
// the same shape as the roster toolbar's sort switch, so "pick one of a few
// views" looks the same everywhere it appears.
export function GroupToggle({ value, onChange }: GroupToggleProps) {
  return (
    <div className="inline-flex h-10 items-center rounded-lg border border-ink-200 bg-white p-0.5" role="group" aria-label="Group">
      {(['ALL', 'BY', 'JDY'] as GroupToggleValue[]).map((g) => (
        <button
          key={g}
          type="button"
          onClick={() => onChange(g)}
          aria-pressed={value === g}
          className={`h-full rounded-md px-3.5 text-[13px] font-medium transition-colors ${
            value === g ? 'bg-accent-charcoal text-white shadow-sm' : 'text-ink-500 hover:text-ink-800'
          }`}
        >
          {g === 'ALL' ? 'All' : g}
        </button>
      ))}
    </div>
  );
}
