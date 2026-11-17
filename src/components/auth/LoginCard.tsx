"use client";

import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";

const noopSubscribe = () => () => {};
import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { cn } from "@/lib/utils";

interface LoginCardProps {
  title: string;
  subtitle: string;
  background: string;
  submitLabel: string;
  submitClassName: string;
  onSubmit: (secret: string) => Promise<string | null>;
  secretLabel: string;
  secretPlaceholder: string;
  secretInputMode?: "text" | "numeric";
  /** Campos extras acima da senha (e-mail, seleção de monitora...). */
  children?: ReactNode;
  demoHint?: ReactNode;
}

/** Card de login reutilizado pela administração e pela área da monitora. */
export function LoginCard({
  title,
  subtitle,
  background,
  submitLabel,
  submitClassName,
  onSubmit,
  secretLabel,
  secretPlaceholder,
  secretInputMode = "text",
  children,
  demoHint,
}: LoginCardProps) {
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [submitError, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const sessionExpired = useSyncExternalStore(
    noopSubscribe,
    () => new URLSearchParams(window.location.search).has("expired"),
    () => false
  );
  const error = submitError || (sessionExpired && !loading ? "Sua sessão expirou. Entre novamente para continuar." : "");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    const failure = await onSubmit(secret);
    if (failure) {
      setError(failure);
      setLoading(false);
    }
    // Em caso de sucesso a página navega; o botão permanece em "carregando".
  };

  return (
    <div className={cn("min-h-dvh flex flex-col justify-center items-center p-4", background)}>
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6 animate-pop-in">
        <div className="text-center space-y-2">
          <BrandLogo size="lg" className="mx-auto" />
          <h1 className="text-2xl font-black text-ink">{title}</h1>
          <p className="text-xs text-ink-soft">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {children}

          <div className="space-y-1">
            <label htmlFor="login-secret" className="text-xs font-bold text-ink">
              {secretLabel}
            </label>
            <div className="relative">
              <input
                id="login-secret"
                type={showSecret ? "text" : "password"}
                inputMode={secretInputMode}
                autoComplete="current-password"
                required
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder={secretPlaceholder}
                aria-invalid={!!error}
                aria-describedby={error ? "login-error" : undefined}
                className="w-full text-sm pl-3 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-brand-blue"
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                aria-label={showSecret ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-ink cursor-pointer"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p
              id="login-error"
              role="alert"
              className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-lg font-semibold"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full py-3.5 rounded-xl font-bold text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-70",
              submitClassName
            )}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>{loading ? "Entrando..." : submitLabel}</span>
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="pt-3 border-t border-slate-100 flex flex-col items-center gap-2 text-center">
          {demoHint && <p className="text-[11px] text-slate-500">{demoHint}</p>}
          <Link href="/" className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-soft hover:text-ink">
            <ArrowLeft className="w-3 h-3" /> Voltar para a escolha de acesso
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Aceita apenas destinos internos da própria área (evita open redirect via `?next=`). */
export function safeNextPath(allowedPrefix: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith(allowedPrefix) && !next.startsWith("//") && !next.includes("\\") ? next : fallback;
}
