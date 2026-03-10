'use client';

/**
 * @layer shared
 * @segment ui
 * @what 統一トースト通知システム
 * @why 操作結果を統一されたフィードバックで即座に表示する
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const AUTO_DISMISS_MS = 5000;
const ANIMATION_DURATION_MS = 300;
const TOAST_Z_INDEX = 'z-[60]';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  removing: boolean;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<
  ToastVariant,
  { container: string; icon: string; iconComponent: typeof CheckCircle }
> = {
  success: {
    container:
      'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300',
    icon: 'text-green-600 dark:text-green-400',
    iconComponent: CheckCircle,
  },
  error: {
    container:
      'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300',
    icon: 'text-red-600 dark:text-red-400',
    iconComponent: XCircle,
  },
  warning: {
    container:
      'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
    icon: 'text-amber-600 dark:text-amber-400',
    iconComponent: AlertTriangle,
  },
  info: {
    container:
      'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    icon: 'text-blue-600 dark:text-blue-400',
    iconComponent: Info,
  },
};

let toastCounter = 0;

function ToastNotification({
  item,
  onRemove,
}: {
  item: ToastItem;
  onRemove: (id: string) => void;
}) {
  const style = VARIANT_STYLES[item.variant];
  const IconComponent = style.iconComponent;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300 ${
        item.removing ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
      } ${style.container}`}
    >
      <IconComponent className={`mt-0.5 h-5 w-5 shrink-0 ${style.icon}`} aria-hidden="true" />
      <p className="flex-1 text-sm font-medium">{item.message}</p>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="shrink-0 rounded-md p-1 transition-colors hover:bg-neutral-900/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 dark:hover:bg-white/10 dark:focus-visible:ring-neutral-400"
        aria-label="通知を閉じる"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
    };
  }, []);

  const startRemoval = useCallback((id: string) => {
    const existingTimer = timersRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      timersRef.current.delete(id);
    }

    const existingAnimation = timersRef.current.get(`${id}-animation`);
    if (existingAnimation) {
      clearTimeout(existingAnimation);
      timersRef.current.delete(`${id}-animation`);
    }

    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, removing: true } : t)));

    const animationTimer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timersRef.current.delete(`${id}-animation`);
    }, ANIMATION_DURATION_MS);

    timersRef.current.set(`${id}-animation`, animationTimer);
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      toastCounter += 1;
      const id = `toast-${toastCounter}`;
      const variant = options.variant ?? 'info';
      const duration = options.duration ?? AUTO_DISMISS_MS;

      const newToast: ToastItem = {
        id,
        message: options.message,
        variant,
        duration,
        removing: false,
      };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        const timer = setTimeout(() => {
          startRemoval(id);
        }, duration);
        timersRef.current.set(id, timer);
      }
    },
    [startRemoval]
  );

  useEffect(() => {
    const currentTimers = timersRef.current;
    return () => {
      currentTimers.forEach((timer) => clearTimeout(timer));
      currentTimers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted &&
        createPortal(
          <div
            className={`pointer-events-none fixed inset-0 ${TOAST_Z_INDEX} flex flex-col items-end justify-start gap-2 p-4`}
            aria-label="通知"
          >
            {toasts.map((item) => (
              <div key={item.id} className="pointer-events-auto">
                <ToastNotification item={item} onRemove={startRemoval} />
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export type { ToastVariant, ToastOptions };
