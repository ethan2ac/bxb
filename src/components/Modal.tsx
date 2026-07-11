import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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

  // Portalled to document.body: Layout's <main> wraps page content in its own
  // stacking context (position + z-index), which caps this modal's z-index no
  // matter how high it's set, letting the header/mobile-nav render on top of
  // it on mobile. Escaping to body sidesteps that entirely.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-4 max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-card bg-white p-5 shadow-shell sm:p-8">
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
    </div>,
    document.body,
  );
}
