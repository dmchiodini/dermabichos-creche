-- ==============================================================================
-- DERMABICHOS — Foto de perfil da equipe (2026-11-17)
--
-- Aplicar UMA vez no SQL Editor do Supabase. Idempotente; não altera dados.
-- As fotos ficam no bucket "daily-photos", na pasta staff/ (enviadas pelo servidor).
-- ==============================================================================

ALTER TABLE public.staff_members ADD COLUMN IF NOT EXISTS photo_url TEXT;
