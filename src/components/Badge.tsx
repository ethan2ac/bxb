const variants = {
  present: 'bg-status-success-soft text-status-success',
  late: 'bg-accent-yellow-soft text-accent-yellow-text',
  absent: 'bg-status-danger-soft text-status-danger',
  excused: 'bg-status-info-soft text-status-info',
  active: 'bg-status-info-soft text-status-info',
  archived: 'bg-ink-100 text-ink-500',
  BY: 'bg-accent-charcoal/10 text-ink-700',
  JDY: 'bg-status-info-soft text-status-info',
} as const;

interface BadgeProps {
  variant: keyof typeof variants;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
