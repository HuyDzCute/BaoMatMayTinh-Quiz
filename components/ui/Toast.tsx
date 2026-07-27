"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastInput = {
  message: string;
  variant?: ToastVariant;
  duration?: number;
  action?: { label: string; onClick: () => void };
};

type ToastItem = ToastInput & { id: string; createdAt: number };

type ToastContextValue = {
  toast: (input: ToastInput | string) => void;
  success: (message: string, opts?: Partial<ToastInput>) => void;
  error: (message: string, opts?: Partial<ToastInput>) => void;
  info: (message: string, opts?: Partial<ToastInput>) => void;
  warning: (message: string, opts?: Partial<ToastInput>) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 4;
const DEFAULT_DURATION = 3500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const item: ToastItem = { ...input, id, createdAt: Date.now() };
      setItems((prev) => {
        const next = [...prev, item];
        // Giữ tối đa MAX_VISIBLE toast trên màn hình
        return next.slice(-MAX_VISIBLE);
      });
      const duration = input.duration ?? DEFAULT_DURATION;
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
      return id;
    },
    [dismiss],
  );

  const api = useMemo<ToastContextValue>(() => {
    const toast = (input: ToastInput | string) => {
      if (typeof input === "string") {
        push({ message: input });
      } else {
        push(input);
      }
    };
    return {
      toast,
      success: (message, opts) => push({ variant: "success", message, ...opts }),
      error: (message, opts) => push({ variant: "error", message, duration: 5000, ...opts }),
      info: (message, opts) => push({ variant: "info", message, ...opts }),
      warning: (message, opts) => push({ variant: "warning", message, ...opts }),
      dismiss,
    };
  }, [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Viewport
 * ────────────────────────────────────────────────────────────────────────── */

const VARIANT_META: Record<ToastVariant, { icon: React.ReactNode; tone: string; iconBg: string }> =
  {
    success: {
      icon: <CheckCircle2 size={18} />,
      tone: "toast--success",
      iconBg: "linear-gradient(135deg,#10b981,#34d399)",
    },
    error: {
      icon: <XCircle size={18} />,
      tone: "toast--error",
      iconBg: "linear-gradient(135deg,#ef4444,#f87171)",
    },
    info: {
      icon: <Info size={18} />,
      tone: "toast--info",
      iconBg: "linear-gradient(135deg,#3b82f6,#60a5fa)",
    },
    warning: {
      icon: <AlertTriangle size={18} />,
      tone: "toast--warning",
      iconBg: "linear-gradient(135deg,#f59e0b,#fbbf24)",
    },
  };

function ToastViewport({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="toast-viewport" role="region" aria-label="Thông báo">
      {items.map((t) => (
        <ToastCard key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const variant = item.variant ?? "info";
  const meta = VARIANT_META[variant];
  return (
    <div className={`toast-card ${meta.tone}`} role="status" aria-live="polite">
      <div className="toast-icon" style={{ background: meta.iconBg }} aria-hidden="true">
        {meta.icon}
      </div>
      <div className="toast-body">
        <div className="toast-message">{item.message}</div>
        {item.action && (
          <button
            type="button"
            className="toast-action"
            onClick={() => {
              item.action!.onClick();
              onDismiss(item.id);
            }}
          >
            {item.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        className="toast-close"
        onClick={() => onDismiss(item.id)}
        aria-label="Đóng thông báo"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/* Hook tự ẩn khi route thay đổi (optional - dùng trong layout effect) */
export function useAutoDismissOnRouteChange() {
  const { dismiss } = useToast();
  useEffect(() => {
    const handler = () => {
      // No-op: navigation events handled by Next.js, but reserve for future
    };
    return () => handler();
  }, [dismiss]);
}
