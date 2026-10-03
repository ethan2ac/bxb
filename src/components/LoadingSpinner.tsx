import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center p-12 ${className}`}>
      <Loader2 className="h-7 w-7 animate-spin text-ink-300" />
    </div>
  );
}

function Bone({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-ink-200/60 ${className}`} />;
}

// Page-level loading placeholder shaped like a header plus a list — the
// page reads as "almost there" instead of a lone spinner on a blank screen.
export function PageSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading">
      <div>
        <Bone className="h-3 w-20" />
        <Bone className="mt-3 h-10 w-56" />
        <Bone className="mt-3 h-4 w-72 max-w-full" />
      </div>
      <div className="overflow-hidden rounded-card border border-ink-100 bg-white">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-ink-100 px-6 py-4 last:border-0">
            <Bone className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Bone className="h-3.5 w-1/3" />
              <Bone className="h-3 w-1/5" />
            </div>
            <Bone className="h-6 w-16 rounded-pill" />
          </div>
        ))}
      </div>
    </div>
  );
}
