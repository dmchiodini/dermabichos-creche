/**
 * Resultado padronizado das Server Actions.
 *
 * Em produção o Next.js oculta a mensagem de erros lançados por Server Actions,
 * então erros esperados (validação, limite de fotos, sessão expirada) são
 * devolvidos como valor, preservando a mensagem amigável para o usuário.
 */
export type ActionErrorCode = "AUTH" | "INVALID" | "ERROR";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: ActionErrorCode };

/** Erro cuja mensagem é segura e útil para mostrar ao usuário. */
export class UserError extends Error {
  constructor(message: string, public code: ActionErrorCode = "INVALID") {
    super(message);
    this.name = "UserError";
  }
}

export class ActionError extends Error {
  constructor(message: string, public code: ActionErrorCode) {
    super(message);
    this.name = "ActionError";
  }
}

/**
 * Desembrulha o resultado de uma Server Action no cliente.
 * Lança `ActionError` em caso de falha; se a sessão expirou, redireciona ao login da área atual.
 */
export async function unwrap<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  let result: ActionResult<T>;
  try {
    result = await promise;
  } catch {
    throw new ActionError("Não foi possível falar com o servidor. Verifique sua conexão e tente novamente.", "ERROR");
  }

  if (result.ok) return result.data;

  if (result.code === "AUTH" && typeof window !== "undefined") {
    const path = window.location.pathname;
    const loginPath = path.startsWith("/admin") ? "/admin/login" : path.startsWith("/monitora") ? "/monitora/login" : null;
    if (loginPath && path !== loginPath) {
      // Recarga completa de propósito: descarta todo o estado em memória da sessão expirada.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`${loginPath}?expired=1`);
    }
  }
  throw new ActionError(result.error, result.code);
}

export function errorMessage(err: unknown, fallback = "Ocorreu um erro inesperado."): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
