import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

/**
 * Cliente Supabase exclusivo do servidor.
 *
 * Usa a SERVICE_ROLE_KEY quando configurada (ignora RLS — a autorização é feita
 * pelas Server Actions em `services/db-service.ts`). Sem ela, usa a chave anônima
 * e o RLS do banco continua valendo. Retorna `null` se o Supabase não estiver configurado.
 *
 * O cliente é reutilizado entre requisições (não guarda sessão de usuário).
 */
export function createAdminClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();

  if (!url || !key) {
    cached = null;
    return cached;
  }

  try {
    cached = createSupabaseClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } catch (error) {
    console.warn("Falha ao inicializar o cliente Supabase:", error);
    cached = null;
  }
  return cached;
}

export const PHOTO_BUCKET = "daily-photos";
