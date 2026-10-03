import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useUiStore } from '../store/ui';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const styles = {
  success: 'bg-white text-status-success border-status-success/20',
  error: 'bg-white text-status-danger border-status-danger/20',
  info: 'bg-white text-ink-700 border-ink-200',
};

export function ToastContainer() {
  const { toasts, removeToast } = useUiStore();

  if (toasts.length === 0) return null;

  return (
    // Above the phone tab bar on mobile (centered, like iOS/Android
    // snackbars); bottom-right on desktop.
    <div className="fixed inset-x-4 bottom-24 z-[70] flex flex-col items-center gap-2 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:items-end">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            role="status"
            className={`flex w-full max-w-sm items-center gap-3 rounded-card-sm border px-5 py-3.5 shadow-shell ${styles[toast.type]}`}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 rounded-full p-1 hover:bg-ink-100"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
