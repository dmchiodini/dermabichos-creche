import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { isExplicitDemo } from "./token";

/**
 * Ambiente que permite login de demonstração: desenvolvimento local ou fase de
 * testes (padrão). Desligado só com `DEMO_MODE=false` — ver `isExplicitDemo`.
 */
export function demoAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || isExplicitDemo();
}

/**
 * Modo demonstração: ativo apenas quando a credencial correspondente não foi
 * configurada E o ambiente permite (dev local ou fase de testes). Permite testar
 * com qualquer senha/PIN, como no protótipo original. Fora disso, sem credencial,
 * o login é recusado.
 */
export function isDemoMode(kind: "admin" | "staff"): boolean {
  const configured = kind === "admin" ? process.env.ADMIN_PASSWORD : process.env.STAFF_PIN;
  return !configured && demoAllowed();
}

/** Comparação em tempo constante (evita ataques de temporização). */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export type CredentialCheck = { ok: true } | { ok: false; error: string };

export function checkAdminCredentials(email: string, password: string): CredentialCheck {
  if (!password) return { ok: false, error: "Informe a senha de administrador." };
  if (isDemoMode("admin")) return { ok: true };

  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword) {
    return { ok: false, error: "Acesso administrativo não configurado no servidor." };
  }

  const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const emailOk = expectedEmail ? safeEqual(email.trim().toLowerCase(), expectedEmail) : true;
  const passwordOk = safeEqual(password, expectedPassword);

  return emailOk && passwordOk ? { ok: true } : { ok: false, error: "E-mail ou senha inválidos." };
}

export function checkStaffPin(pin: string): CredentialCheck {
  if (!pin) return { ok: false, error: "Informe a senha ou PIN de acesso." };
  if (isDemoMode("staff")) return { ok: true };

  const expectedPin = process.env.STAFF_PIN;
  if (!expectedPin) {
    return { ok: false, error: "Acesso da equipe não configurado no servidor." };
  }
  return safeEqual(pin, expectedPin) ? { ok: true } : { ok: false, error: "PIN inválido." };
}
