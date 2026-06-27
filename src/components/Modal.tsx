import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-lg rounded-card bg-white p-8 shadow-shell">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight-lg text-ink-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
