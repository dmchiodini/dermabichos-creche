"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** Impede fechar por Esc/clique fora (ex.: durante um salvamento). */
  locked?: boolean;
}

const sizes = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-xl" };

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo acessível: role="dialog", foco preso dentro do modal e devolvido ao
 * fechar, Esc para fechar, rolagem da página travada. No celular abre como
 * "bottom sheet" para ficar ao alcance do polegar.
 */
export function Modal({ open, onClose, title, subtitle, icon, children, footer, size = "lg", locked }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const lockedRef = useRef(locked);

  useEffect(() => {
    onCloseRef.current = onClose;
    lockedRef.current = locked;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    // Foca o primeiro campo do formulário (ou o painel) ao abrir.
    const panel = panelRef.current;
    const firstField = panel?.querySelector<HTMLElement>("input:not([type=hidden]), textarea, select");
    (firstField || panel)?.focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !lockedRef.current) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-ink/60 backdrop-blur-[2px] animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !locked) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "bg-white w-full max-h-[94dvh] sm:max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden outline-none",
          "rounded-t-3xl sm:rounded-3xl animate-slide-up sm:animate-pop-in",
          sizes[size]
        )}
      >
        {/* Alça visual do bottom sheet no celular */}
        <div className="sm:hidden flex justify-center pt-2 pb-1" aria-hidden>
          <span className="w-10 h-1.5 rounded-full bg-line" />
        </div>

        <header className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-line flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <div className="shrink-0">{icon}</div>}
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg sm:text-xl font-bold text-ink leading-tight truncate">
                {title}
              </h2>
              {subtitle && <p className="text-xs sm:text-sm text-ink-soft mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={locked}
            aria-label="Fechar"
            className="icon-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="overflow-y-auto overscroll-contain flex-1">{children}</div>

        {footer && (
          <footer className="px-4 sm:px-6 py-3 bg-paper border-t border-line shrink-0 safe-bottom sm:pb-3">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}
