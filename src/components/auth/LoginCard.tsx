"use client";

import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthShell, AuthBrand } from "@/components/auth/AuthShell";

const noopSubscribe = () => () => {};

interface LoginCardProps {
  /** Nome da área (ex.: "Administração"). */
  area: string;
  title: string;
  subtitle: string;
  submitLabel: string;
  onSubmit: (secret: string) => Promise<string | null>;
  secretLabel: string;
  secretPlaceholder: string;
  secretInputMode?: "text" | "numeric";
  /** Campos extras acima da senha (e-mail, seleção de monitora...). */
  children?: ReactNode;
  demoHint?: ReactNode;
}

/** Tela de login reutilizada pela administração e pela área da monitora. */
export function LoginCard({
  area,
  title,
  subtitle,
  submitLabel,
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
    <AuthShell
      top={
        <Link
          href="/equipe"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink rounded-lg px-2 py-1.5 -ml-2"
        >
          <ArrowLeft className="w-4 h-4" /> Acesso da equipe
        </Link>
      }
    >
          <AuthBrand caption={area} />

          <h1 className="mt-6 text-center text-[1.75rem] sm:text-3xl font-extrabold text-ink leading-tight">{title}</h1>
          <p className="mt-2 text-center text-sm text-ink-soft">{subtitle}</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
            {children}

            <div>
              <label htmlFor="login-secret" className="field-label">
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
                  className="field pr-12!"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  aria-label={showSecret ? "Ocultar senha" : "Mostrar senha"}
                  className="icon-btn absolute right-1 top-1/2 -translate-y-1/2"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p
                id="login-error"
                role="alert"
                className="text-sm text-rose-800 bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl font-semibold"
              >
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn btn-lg btn-primary w-full">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? "Entrando..." : submitLabel}</span>
            </button>
          </form>

          {demoHint && (
            <p className="mt-6 pt-5 border-t border-line text-xs text-ink-soft text-center">{demoHint}</p>
          )}
    </AuthShell>
  );
}

/** Aceita apenas destinos internos da própria área (evita open redirect via `?next=`). */
export function safeNextPath(allowedPrefix: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith(allowedPrefix) && !next.startsWith("//") && !next.includes("\\") ? next : fallback;
}
