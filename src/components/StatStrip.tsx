export interface StatCell {
  key: string;
  label: string;
  value: string | number;
  accent?: boolean;
}

// Hard-edged, bordered stat row (no rounded corners, no shadow) — a
// deliberate contrast against the app's soft card style, reserved for
// numbers meant to read as a scoreboard rather than a dashboard tile.
export function StatStrip({ cells }: { cells: StatCell[] }) {
  return (
    <div
      className="grid border-y border-ink-200"
      style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
    >
      {cells.map((cell, i) => (
        <div key={cell.key} className={`px-4 py-5 sm:px-6 ${i > 0 ? 'border-l border-ink-200' : ''}`}>
          <span
            className={`block font-display text-3xl leading-none sm:text-4xl ${
              cell.accent ? 'text-accent-charcoal' : 'text-ink-900'
            }`}
          >
            {cell.value}
          </span>
          <span className="eyebrow mt-2">{cell.label}</span>
        </div>
      ))}
    </div>
  );
}
