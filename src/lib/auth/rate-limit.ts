import "server-only";
import { headers } from "next/headers";

/**
 * Limitador de tentativas simples em memória (janela deslizante por IP).
 * Suficiente para conter força bruta em uma instância única; em deploy
 * com várias instâncias, troque por um armazenamento compartilhado (ex.: Redis).
 */
const attempts = new Map<string, number[]>();

const WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const MAX_ATTEMPTS = 10;

async function clientKey(scope: string): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  return `${scope}:${ip}`;
}

/** Retorna `true` se a tentativa pode prosseguir. */
export async function consumeAttempt(scope: string): Promise<boolean> {
  const key = await clientKey(scope);
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) {
    attempts.set(key, recent);
    return false;
  }
  recent.push(now);
  attempts.set(key, recent);

  // Limpeza oportunista para o mapa não crescer indefinidamente.
  if (attempts.size > 5000) {
    for (const [k, list] of attempts) {
      if (list.every((t) => now - t >= WINDOW_MS)) attempts.delete(k);
    }
  }
  return true;
}

export async function resetAttempts(scope: string): Promise<void> {
  attempts.delete(await clientKey(scope));
}

export const RATE_LIMIT_MESSAGE = "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
