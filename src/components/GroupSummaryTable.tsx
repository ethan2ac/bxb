export interface GroupSummaryRow {
  key: string;
  label: string;
  dotClassName?: string;
  values: number[];
  emphasize?: boolean;
}

interface GroupSummaryTableProps {
  groupLabels: string[];
  rows: GroupSummaryRow[];
}

export function GroupSummaryTable({ groupLabels, rows }: GroupSummaryTableProps) {
  const showTotal = groupLabels.length > 1;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-ink-400"></th>
            {groupLabels.map((g) => (
              <th key={g} className="pb-2 pl-3 text-right text-xs font-medium uppercase tracking-wider text-ink-400">
                {g}
              </th>
            ))}
            {showTotal && (
              <th className="pb-2 pl-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-500">
                Total
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const total = row.values.reduce((a, b) => a + b, 0);
            return (
              <tr key={row.key} className="border-t border-ink-100">
                <td className="py-2">
                  <span className="inline-flex items-center gap-1.5 text-ink-500">
                    {row.dotClassName && <span className={`h-2 w-2 rounded-full ${row.dotClassName}`} />}
                    {row.label}
                  </span>
                </td>
                {row.values.map((v, i) => (
                  <td
                    key={i}
                    className={`py-2 pl-3 text-right font-semibold ${row.emphasize ? 'text-status-success' : 'text-ink-700'}`}
                  >
                    {v}
                  </td>
                ))}
                {showTotal && (
                  <td className={`py-2 pl-3 text-right font-bold ${row.emphasize ? 'text-status-success' : 'text-ink-900'}`}>
                    {total}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
