import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-ink-200 bg-white p-16 text-center">
      {icon && <div className="mb-5 text-ink-300">{icon}</div>}
      <h3 className="text-lg font-semibold text-ink-700">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-ink-400">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
