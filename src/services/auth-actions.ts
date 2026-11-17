"use server";

import { z } from "zod";
import { createSession, destroySession, getSession } from "@/lib/auth/session";
import { checkAdminCredentials, checkStaffPin, demoAllowed, isDemoMode } from "@/lib/auth/credentials";
import { consumeAttempt, resetAttempts, RATE_LIMIT_MESSAGE } from "@/lib/auth/rate-limit";
import { findGuardianByIdentifier } from "./data-store";
import type { ActionResult } from "@/lib/action-result";
import type { SessionRole } from "@/lib/auth/token";

const fail = (error: string): ActionResult<never> => ({ ok: false, error, code: "INVALID" });

/** Cria a sessão; se o servidor estiver sem SESSION_SECRET, devolve uma mensagem clara. */
async function startSession(data: Parameters<typeof createSession>[0]): Promise<ActionResult<never> | null> {
  try {
    await createSession(data);
    return null;
  } catch (err) {
    console.error("[auth] falha ao criar sessão:", err);
    return fail("Servidor sem configuração de sessão (SESSION_SECRET). Contate o administrador do sistema.");
  }
}

export async function loginAdmin(email: string, password: string): Promise<ActionResult<void>> {
  const parsed = z.object({ email: z.string().max(160), password: z.string().max(200) }).safeParse({ email, password });
  if (!parsed.success) return fail("Dados de acesso inválidos.");

  if (!(await consumeAttempt("admin"))) return fail(RATE_LIMIT_MESSAGE);

  const check = checkAdminCredentials(parsed.data.email, parsed.data.password);
  if (!check.ok) return fail(check.error);

  await resetAttempts("admin");
  const sessionError = await startSession({ role: "admin", name: parsed.data.email.trim() || "Administrador" });
  if (sessionError) return sessionError;
  return { ok: true, data: undefined };
}

export async function loginStaff(monitorName: string, pin: string): Promise<ActionResult<void>> {
  const parsed = z
    .object({ name: z.string().trim().min(1).max(80), pin: z.string().max(100) })
    .safeParse({ name: monitorName, pin });
  if (!parsed.success) return fail("Selecione a monitora e informe o PIN.");

  if (!(await consumeAttempt("staff"))) return fail(RATE_LIMIT_MESSAGE);

  const check = checkStaffPin(parsed.data.pin);
  if (!check.ok) return fail(check.error);

  await resetAttempts("staff");
  const sessionError = await startSession({ role: "staff", name: parsed.data.name });
  if (sessionError) return sessionError;
  return { ok: true, data: undefined };
}

/**
 * Acesso do responsável por telefone ou e-mail (sem senha, conforme a regra do portal).
 * A busca acontece no servidor com correspondência exata — a lista de responsáveis
 * nunca é enviada ao navegador.
 */
export async function loginGuardian(identifier: string): Promise<ActionResult<{ full_name: string }>> {
  const parsed = z.string().trim().min(3).max(160).safeParse(identifier);
  if (!parsed.success) return fail("Informe o telefone (com DDD) ou o e-mail cadastrado.");

  if (!(await consumeAttempt("guardian"))) return fail(RATE_LIMIT_MESSAGE);

  const guardian = await findGuardianByIdentifier(parsed.data);
  if (!guardian) {
    return fail(
      "Nenhum responsável encontrado com esse telefone ou e-mail. Verifique se o cadastro foi realizado pela equipe da creche."
    );
  }

  const sessionError = await startSession({ role: "guardian", name: guardian.full_name, guardianId: guardian.id });
  if (sessionError) return sessionError;
  return { ok: true, data: { full_name: guardian.full_name } };
}

export async function logout(role: SessionRole): Promise<void> {
  if (role === "admin" || role === "staff" || role === "guardian") {
    await destroySession(role);
  }
}

/** Dados mínimos da sessão atual para exibir na interface. */
export async function getSessionInfo(role: SessionRole): Promise<{ name: string } | null> {
  const session = await getSession(role);
  return session ? { name: session.name } : null;
}

/** Indica se as telas de login devem exibir as dicas do modo demonstração. */
export async function getLoginMode(): Promise<{ adminDemo: boolean; staffDemo: boolean; portalDemo: boolean }> {
  return {
    adminDemo: isDemoMode("admin"),
    staffDemo: isDemoMode("staff"),
    portalDemo: demoAllowed(),
  };
}
