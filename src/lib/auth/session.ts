import "server-only";
import { cookies } from "next/headers";
import {
  SESSION_COOKIES,
  SESSION_TTL,
  signSession,
  verifySession,
  type SessionPayload,
  type SessionRole,
} from "./token";
import { UserError } from "@/lib/action-result";

export class AuthError extends UserError {
  constructor(message = "Sessão expirada ou acesso não autorizado. Entre novamente.") {
    super(message, "AUTH");
    this.name = "AuthError";
  }
}

export async function createSession(data: Omit<SessionPayload, "exp">): Promise<void> {
  const ttl = SESSION_TTL[data.role];
  const token = await signSession({ ...data, exp: Math.floor(Date.now() / 1000) + ttl });
  const store = await cookies();
  store.set(SESSION_COOKIES[data.role], token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ttl,
  });
}

export async function destroySession(role: SessionRole): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIES[role]);
}

export async function getSession(role: SessionRole): Promise<SessionPayload | null> {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIES[role])?.value);
  return session && session.role === role ? session : null;
}

/**
 * Retorna a primeira sessão válida entre os papéis permitidos (em ordem).
 * Lança AuthError se nenhuma existir — use no início de toda operação de dados.
 */
export async function requireRole(...roles: SessionRole[]): Promise<SessionPayload> {
  for (const role of roles) {
    const session = await getSession(role);
    if (session) return session;
  }
  throw new AuthError();
}
