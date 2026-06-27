import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center p-12 ${className}`}>
      <Loader2 className="h-7 w-7 animate-spin text-ink-300" />
    </div>
  );
}
