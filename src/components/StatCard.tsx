import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  dark?: boolean;
}

export function StatCard({ label, value, icon, dark = false }: StatCardProps) {
  if (dark) {
    return (
      <div className="rounded-card bg-accent-charcoal p-6 shadow-dark-card">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight-lg text-white">{value}</p>
          </div>
          {icon && <div className="text-ink-500">{icon}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-ink-100 bg-white p-6 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-400">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight-lg text-ink-900">{value}</p>
        </div>
        {icon && <div className="text-ink-300">{icon}</div>}
      </div>
    </div>
  );
}
