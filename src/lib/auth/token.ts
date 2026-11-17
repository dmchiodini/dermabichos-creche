/**
 * Assinatura e verificação de tokens de sessão (HMAC-SHA256 via Web Crypto).
 *
 * Este módulo não depende de `next/headers`, então pode ser usado tanto no
 * `proxy.ts` (verificação otimista de rota) quanto nas Server Actions.
 */

export type SessionRole = "admin" | "staff" | "guardian";

export interface SessionPayload {
  role: SessionRole;
  /** Nome exibido na interface (monitora, administrador ou tutor). */
  name: string;
  /** ID do responsável — presente apenas em sessões do portal. */
  guardianId?: string;
  /** Expiração em epoch (segundos). */
  exp: number;
}

/**
 * Um cookie por papel: permite, como antes, manter a área da monitora e a
 * administração abertas no mesmo navegador sem uma derrubar a outra.
 */
export const SESSION_COOKIES: Record<SessionRole, string> = {
  admin: "dermabichos_admin",
  staff: "dermabichos_staff",
  guardian: "dermabichos_guardian",
};

/** Duração da sessão por papel (em segundos). */
export const SESSION_TTL: Record<SessionRole, number> = {
  admin: 60 * 60 * 8, // 8h — um expediente
  staff: 60 * 60 * 14, // 14h — cobre o plantão inteiro
  guardian: 60 * 60 * 24, // 24h — o portal só mostra o dia atual
};

const DEV_FALLBACK_SECRET = "dermabichos-dev-only-secret-nao-usar-em-producao";

/**
 * FASE DE TESTES (dados fictícios): o modo demonstração fica LIGADO por padrão,
 * inclusive em produção (Vercel) — qualquer login entra enquanto ADMIN_PASSWORD /
 * STAFF_PIN não estiverem configurados.
 *
 * Para a produção real: defina `DEMO_MODE=false` + SESSION_SECRET, ADMIN_PASSWORD
 * e STAFF_PIN. NUNCA deixe o modo demonstração ligado com dados reais de clientes.
 */
export function isExplicitDemo(): boolean {
  return process.env.DEMO_MODE !== "false";
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  // Sem SESSION_SECRET: deriva a chave da service role key (também só existe no
  // servidor), para que os cookies não possam ser forjados com o segredo público
  // de desenvolvimento. O HMAC não expõe a chave original.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && serviceKey.length >= 32) return `dermabichos-session:${serviceKey}`;
  if (process.env.NODE_ENV === "production" && !isExplicitDemo()) {
    throw new Error(
      "SESSION_SECRET ausente ou curto demais (mínimo 32 caracteres). Configure a variável de ambiente."
    );
  }
  return DEV_FALLBACK_SECRET;
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

let cachedKey: { secret: string; key: CryptoKey } | null = null;

async function getKey(): Promise<CryptoKey> {
  const secret = getSecret();
  if (cachedKey && cachedKey.secret === secret) return cachedKey.key;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  cachedKey = { secret, key };
  return key;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await getKey(), encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  try {
    // crypto.subtle.verify faz comparação em tempo constante.
    const valid = await crypto.subtle.verify(
      "HMAC",
      await getKey(),
      fromBase64Url(signature) as BufferSource,
      encoder.encode(body)
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload;
    if (!payload || typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return null;
    if (!["admin", "staff", "guardian"].includes(payload.role)) return null;
    return payload;
  } catch {
    return null;
  }
}
