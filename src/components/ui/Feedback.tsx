"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { Modal } from "./Modal";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface FeedbackContextValue {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
  /** Substitui o `confirm()` nativo por um diálogo com a identidade visual. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const toastStyles: Record<ToastKind, { box: string; icon: ReactNode }> = {
  success: {
    box: "bg-white border-emerald-200 text-ink",
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
  },
  error: {
    box: "bg-white border-rose-200 text-ink",
    icon: <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />,
  },
  info: {
    box: "bg-white border-brand-blue text-ink",
    icon: <Info className="w-5 h-5 text-brand-blue-ink shrink-0" />,
  },
};

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++nextId.current;
      setToasts((prev) => [...prev.slice(-3), { id, kind, message }]);
      setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3500);
    },
    [dismiss]
  );

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setConfirmState({ ...options, resolve })),
    []
  );

  const closeConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  const value = useMemo<FeedbackContextValue>(
    () => ({
      toast: {
        success: (m) => push("success", m),
        error: (m) => push("error", m),
        info: (m) => push("info", m),
      },
      confirm,
    }),
    [push, confirm]
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      {/* Avisos (toasts) */}
      <div
        aria-live="polite"
        className="fixed z-[60] inset-x-0 bottom-0 sm:bottom-auto sm:top-4 flex flex-col items-center gap-2 p-3 pointer-events-none safe-bottom"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto w-full max-w-sm flex items-start gap-2.5 rounded-2xl border shadow-[0_12px_32px_-12px_rgb(43_42_58/0.35)] px-3.5 py-3 text-sm font-semibold animate-pop-in",
              toastStyles[t.kind].box
            )}
          >
            {toastStyles[t.kind].icon}
            <p className="flex-1 leading-snug">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Fechar aviso"
              className="text-ink-soft hover:text-ink -m-1 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Diálogo de confirmação */}
      <Modal
        open={!!confirmState}
        onClose={() => closeConfirm(false)}
        title={confirmState?.title}
        size="sm"
        icon={
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center",
              confirmState?.danger ? "bg-rose-50 text-rose-700" : "bg-brand-blue-light text-brand-blue-ink"
            )}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => closeConfirm(false)}
              className="btn btn-ghost"
            >
              {confirmState?.cancelLabel || "Cancelar"}
            </button>
            <button
              type="button"
              onClick={() => closeConfirm(true)}
              className={cn("btn", confirmState?.danger ? "btn-danger" : "btn-ink")}
            >
              {confirmState?.confirmLabel || "Confirmar"}
            </button>
          </div>
        }
      >
        {confirmState?.message && (
          <div className="px-4 sm:px-6 py-5 text-sm text-ink-soft leading-relaxed">{confirmState.message}</div>
        )}
      </Modal>
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback deve ser usado dentro de <FeedbackProvider>");
  return ctx;
}
