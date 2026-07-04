export type GroupToggleValue = 'ALL' | 'BY' | 'JDY';

interface GroupToggleProps {
  value: GroupToggleValue;
  onChange: (value: GroupToggleValue) => void;
}

export function GroupToggle({ value, onChange }: GroupToggleProps) {
  return (
    <div className="flex items-center gap-2">
      {(['ALL', 'BY', 'JDY'] as GroupToggleValue[]).map((g) => (
        <button
          key={g}
          onClick={() => onChange(g)}
          className={`rounded-pill border px-4 py-2 text-sm font-medium transition-colors ${
            value === g
              ? 'border-accent-charcoal bg-accent-charcoal text-white'
              : 'border-ink-200 bg-white text-ink-500 hover:bg-ink-50'
          }`}
        >
          {g === 'ALL' ? 'All Groups' : g}
        </button>
      ))}
    </div>
  );
}
