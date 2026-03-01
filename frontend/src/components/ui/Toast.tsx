import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

const variantStyles: Record<ToastVariant, { border: string; icon: string; bg: string }> = {
  success: {
    border: 'border-l-emerald-500',
    icon: 'text-emerald-500',
    bg: 'bg-white',
  },
  error: {
    border: 'border-l-red-500',
    icon: 'text-red-500',
    bg: 'bg-white',
  },
  warning: {
    border: 'border-l-amber-500',
    icon: 'text-amber-500',
    bg: 'bg-white',
  },
  info: {
    border: 'border-l-blue-500',
    icon: 'text-blue-500',
    bg: 'bg-white',
  },
};

const variantIcons: Record<ToastVariant, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false);
  const style = variantStyles[toast.variant];
  const Icon = variantIcons[toast.variant];

  useEffect(() => {
    const duration = toast.duration ?? 4000;
    const exitTimer = setTimeout(() => setIsExiting(true), duration - 300);
    const removeTimer = setTimeout(() => onDismiss(toast.id), duration);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      className={clsx(
        'flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border border-slate-200 border-l-4 min-w-[320px] max-w-[420px]',
        style.bg,
        style.border,
        'transition-all duration-300',
        isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      )}
      role="alert"
    >
      <Icon size={18} className={clsx('mt-0.5 flex-shrink-0', style.icon)} />
      <p className="text-sm text-slate-700 flex-1">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastData[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col-reverse gap-2" aria-live="polite">
      {toasts.slice(0, 5).map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
