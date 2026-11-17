-- ==============================================================================
-- DERMABICHOS — Migração de endurecimento de segurança (2026-11-17)
--
-- Aplicar UMA vez no SQL Editor do Supabase em bancos criados com a versão
-- anterior do schema.sql. É idempotente (pode ser executada novamente).
-- Não altera nem apaga dados existentes.
--
-- Também cria as tabelas de "Registros do Dia" (atividades coletivas) e de
-- modelos de atividades, que o app usa mas não existiam no schema antigo.
-- ==============================================================================

-- 1. Tabelas de atividades coletivas (ausentes em bancos antigos) ---------------
CREATE TABLE IF NOT EXISTS public.daily_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.daily_activity_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_log_id UUID NOT NULL REFERENCES public.daily_activity_logs(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    storage_url TEXT,
    caption TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.activity_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    default_description TEXT NOT NULL DEFAULT '',
    category TEXT DEFAULT 'Recreação',
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_daily_activity_logs_date ON public.daily_activity_logs(date);
CREATE INDEX IF NOT EXISTS idx_daily_activity_photos_log ON public.daily_activity_photos(activity_log_id);
CREATE INDEX IF NOT EXISTS idx_daily_activity_photos_created ON public.daily_activity_photos(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_templates_active ON public.activity_templates(active);

-- Limite de 10 fotos por atividade
CREATE OR REPLACE FUNCTION public.check_max_ten_activity_photos()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
    IF (SELECT count(*) FROM public.daily_activity_photos WHERE activity_log_id = NEW.activity_log_id) >= 10 THEN
        RAISE EXCEPTION 'Limite máximo de 10 fotos por atividade atingido.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_max_ten_activity_photos ON public.daily_activity_photos;
CREATE TRIGGER trigger_max_ten_activity_photos
BEFORE INSERT ON public.daily_activity_photos
FOR EACH ROW
EXECUTE FUNCTION public.check_max_ten_activity_photos();

-- 2. Funções SECURITY DEFINER com search_path fixo ------------------------------
--    (evita sequestro por objetos homônimos em outro schema)

-- Perfis desativados perdem o acesso imediatamente.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() AND active = true;
$$;

CREATE OR REPLACE FUNCTION public.check_max_five_photos()
RETURNS TRIGGER
SET search_path = public
AS $$
BEGIN
    IF (SELECT count(*) FROM public.daily_photos WHERE report_id = NEW.report_id) >= 5 THEN
        RAISE EXCEPTION 'Limite máximo de 5 fotos por relatório diário atingido.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Limpeza: fotos de atividades somem no fim do dia; fotos individuais após 7 dias.
CREATE OR REPLACE FUNCTION public.cleanup_expired_daily_photos()
RETURNS void AS $$
DECLARE
    photo_record RECORD;
    act_photo_record RECORD;
BEGIN
    FOR act_photo_record IN
        SELECT id, file_path
        FROM public.daily_activity_photos
        WHERE created_at < (timezone('America/Sao_Paulo'::text, now()))::date
    LOOP
        DELETE FROM storage.objects
        WHERE bucket_id = 'daily-photos' AND name = act_photo_record.file_path;

        DELETE FROM public.daily_activity_photos
        WHERE id = act_photo_record.id;
    END LOOP;

    FOR photo_record IN
        SELECT id, file_path
        FROM public.daily_photos
        WHERE created_at < (NOW() - INTERVAL '7 days')
    LOOP
        DELETE FROM storage.objects
        WHERE bucket_id = 'daily-photos' AND name = photo_record.file_path;

        DELETE FROM public.daily_photos
        WHERE id = photo_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage;

-- A limpeza é disparada só pelo pg_cron; ninguém deve chamá-la via API (RPC).
REVOKE ALL ON FUNCTION public.cleanup_expired_daily_photos() FROM PUBLIC, anon, authenticated;

-- 3. RLS das tabelas de atividades ----------------------------------------------
ALTER TABLE public.daily_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_activity_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Equipe pode gerenciar registros de atividades" ON public.daily_activity_logs;
CREATE POLICY "Equipe pode gerenciar registros de atividades" ON public.daily_activity_logs
    FOR ALL TO authenticated
    USING (public.current_user_role() IN ('admin', 'staff'));

DROP POLICY IF EXISTS "Responsável vê registros de atividades do dia atual" ON public.daily_activity_logs;
CREATE POLICY "Responsável vê registros de atividades do dia atual" ON public.daily_activity_logs
    FOR SELECT TO authenticated
    USING (date = (timezone('America/Sao_Paulo'::text, now()))::date);

DROP POLICY IF EXISTS "Equipe pode gerenciar fotos de atividades" ON public.daily_activity_photos;
CREATE POLICY "Equipe pode gerenciar fotos de atividades" ON public.daily_activity_photos
    FOR ALL TO authenticated
    USING (public.current_user_role() IN ('admin', 'staff'));

DROP POLICY IF EXISTS "Responsável vê fotos de atividades do dia atual" ON public.daily_activity_photos;
CREATE POLICY "Responsável vê fotos de atividades do dia atual" ON public.daily_activity_photos
    FOR SELECT TO authenticated
    USING (
        activity_log_id IN (
            SELECT id FROM public.daily_activity_logs
            WHERE date = (timezone('America/Sao_Paulo'::text, now()))::date
        )
    );

DROP POLICY IF EXISTS "Equipe vê modelos de atividades" ON public.activity_templates;
CREATE POLICY "Equipe vê modelos de atividades" ON public.activity_templates
    FOR SELECT TO authenticated
    USING (public.current_user_role() IN ('admin', 'staff'));

DROP POLICY IF EXISTS "Admin gerencia modelos de atividades" ON public.activity_templates;
CREATE POLICY "Admin gerencia modelos de atividades" ON public.activity_templates
    FOR ALL TO authenticated
    USING (public.current_user_role() = 'admin')
    WITH CHECK (public.current_user_role() = 'admin');

-- 4. Storage: antes QUALQUER pessoa (mesmo sem login) podia enviar e APAGAR fotos.
--    Leitura continua pública (necessária para o portal exibir as fotos).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('daily-photos', 'daily-photos', true, 6291456, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Permitir upload de fotos diárias" ON storage.objects;
DROP POLICY IF EXISTS "Permitir exclusão de fotos diárias" ON storage.objects;
DROP POLICY IF EXISTS "Equipe envia fotos diárias" ON storage.objects;
DROP POLICY IF EXISTS "Equipe exclui fotos diárias" ON storage.objects;

CREATE POLICY "Equipe envia fotos diárias" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'daily-photos' AND public.current_user_role() IN ('admin', 'staff'));

CREATE POLICY "Equipe exclui fotos diárias" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'daily-photos' AND public.current_user_role() IN ('admin', 'staff'));

-- 5. Auditoria: um usuário só registra logs em seu próprio nome -----------------
DROP POLICY IF EXISTS "Sistema insere logs" ON public.audit_logs;
CREATE POLICY "Sistema insere logs" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- 6. Agendamento diário da limpeza via pg_cron (ignorado se não estiver disponível)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule('cleanup-expired-daily-photos', '0 3 * * *', 'SELECT public.cleanup_expired_daily_photos()');
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END;
$$;
