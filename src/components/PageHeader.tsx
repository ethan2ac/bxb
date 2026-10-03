import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

// One header for every page so title size, spacing and action placement
// don't drift page to page. The eyebrow reuses the sidebar's section name
// ("Session", "People", …) as a lightweight breadcrumb.
export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="mt-2 font-display text-[2.5rem] leading-[0.95] tracking-tight text-ink-900 sm:text-5xl">
          {title}
        </h1>
        {description && <div className="mt-2 text-sm text-ink-400 sm:text-[15px]">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
