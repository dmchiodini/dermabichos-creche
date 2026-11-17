-- ==============================================================================
-- DERMABICHOS - GESTÃO DA CRECHE CANINA
-- Schema Inicial de Banco de Dados, RLS e Funções de Limpeza de Fotos (7 dias)
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- 2. Tabela de Perfis de Usuário
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'guardian')),
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Responsáveis (Guardians)
CREATE TABLE IF NOT EXISTS public.guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Pets
CREATE TABLE IF NOT EXISTS public.pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    photo_url TEXT,
    breed TEXT,
    gender TEXT CHECK (gender IN ('macho', 'femea')),
    birth_date DATE,
    approximate_age TEXT,
    size TEXT NOT NULL DEFAULT 'medio' CHECK (size IN ('pequeno', 'medio', 'grande')),
    temperament TEXT,
    diet_restrictions TEXT,
    allergies TEXT,
    care_notes TEXT,
    general_notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Vínculo N:N entre Pets e Responsáveis
CREATE TABLE IF NOT EXISTS public.pet_guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
    relationship TEXT DEFAULT 'Tutor',
    is_primary BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(pet_id, guardian_id)
);

-- 6. Tabela de Funcionários
CREATE TABLE IF NOT EXISTS public.staff_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    role_title TEXT NOT NULL DEFAULT 'Monitor de Creche',
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabela de Presença Diária
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'expected' CHECK (status IN ('present', 'absent', 'expected')),
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    registered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(pet_id, date)
);

-- 8. Tabela de Relatórios Diários
CREATE TABLE IF NOT EXISTS public.daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'shared')),
    feeding TEXT NOT NULL DEFAULT 'nao_observado' CHECK (feeding IN ('comeu_tudo', 'parcial', 'nao_comeu', 'nao_observado')),
    feeding_notes TEXT,
    water TEXT NOT NULL DEFAULT 'nao_observado' CHECK (water IN ('normal', 'pouco', 'muito', 'nao_observado')),
    water_notes TEXT,
    activities_participation TEXT NOT NULL DEFAULT 'nao_observado' CHECK (activities_participation IN ('participou', 'parcial', 'nao_participou', 'nao_observado')),
    activities_notes TEXT,
    nap_after_lunch TEXT NOT NULL DEFAULT 'nao_observado' CHECK (nap_after_lunch IN ('sim', 'nao', 'nao_observado')),
    nap_notes TEXT,
    behavior_socialization TEXT,
    free_observations TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(pet_id, date)
);

-- 9. Tabela de Fotos da Rotina (Legado/Opcional)
CREATE TABLE IF NOT EXISTS public.daily_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    storage_url TEXT,
    caption TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9.1 Tabela de Registros do Dia (Atividades Coletivas da Creche)
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

-- 9.2 Tabela de Fotos das Atividades (Até 10 fotos por atividade, limpeza ao final do dia)
CREATE TABLE IF NOT EXISTS public.daily_activity_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_log_id UUID NOT NULL REFERENCES public.daily_activity_logs(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    storage_url TEXT,
    caption TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9.3 Modelos de Atividades (catálogo gerenciado pelo administrador)
CREATE TABLE IF NOT EXISTS public.activity_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    default_description TEXT NOT NULL DEFAULT '',
    category TEXT DEFAULT 'Recreação',
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Tabela de Ocorrências / Incidentes
CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.daily_reports(id) ON DELETE SET NULL,
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    action_taken TEXT,
    notify_guardian BOOLEAN DEFAULT false NOT NULL,
    severity TEXT NOT NULL DEFAULT 'baixa' CHECK (severity IN ('baixa', 'media', 'alta')),
    resolved BOOLEAN DEFAULT false NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Tabela de Compartilhamentos (WhatsApp)
CREATE TABLE IF NOT EXISTS public.report_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
    guardian_id UUID REFERENCES public.guardians(id) ON DELETE SET NULL,
    channel TEXT NOT NULL DEFAULT 'whatsapp',
    status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'completed')),
    recipient_phone TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Tabela de Auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Criar Índices de Desempenho
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_pet ON public.attendance(pet_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON public.daily_reports(date);
CREATE INDEX IF NOT EXISTS idx_daily_reports_pet ON public.daily_reports(pet_id);
CREATE INDEX IF NOT EXISTS idx_daily_photos_report ON public.daily_photos(report_id);
CREATE INDEX IF NOT EXISTS idx_daily_photos_created ON public.daily_photos(created_at);
CREATE INDEX IF NOT EXISTS idx_incidents_date ON public.incidents(date);
CREATE INDEX IF NOT EXISTS idx_pet_guardians_guardian ON public.pet_guardians(guardian_id);
CREATE INDEX IF NOT EXISTS idx_daily_activity_logs_date ON public.daily_activity_logs(date);
CREATE INDEX IF NOT EXISTS idx_daily_activity_photos_log ON public.daily_activity_photos(activity_log_id);
CREATE INDEX IF NOT EXISTS idx_daily_activity_photos_created ON public.daily_activity_photos(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_templates_active ON public.activity_templates(active);

-- 14. Função e Trigger para limitar a 10 fotos por atividade nos Registros do Dia
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

-- 14. Função e Trigger para limitar a 5 fotos por relatório/pet/dia
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

DROP TRIGGER IF EXISTS trigger_max_five_photos ON public.daily_photos;
CREATE TRIGGER trigger_max_five_photos
BEFORE INSERT ON public.daily_photos
FOR EACH ROW
EXECUTE FUNCTION public.check_max_five_photos();

-- 15. Configuração do Supabase Storage para Fotos Diárias
-- Leitura pública (o portal exibe as fotos por URL); limite de 6 MB e apenas imagens.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('daily-photos', 'daily-photos', true, 6291456, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
-- As políticas de escrita do Storage ficam na seção de RLS (dependem de current_user_role()).

-- 16. Rotina Idempotente de Exclusão de Fotos ao Final do Dia (e retenção)
CREATE OR REPLACE FUNCTION public.cleanup_expired_daily_photos()
RETURNS void AS $$
DECLARE
    photo_record RECORD;
    act_photo_record RECORD;
BEGIN
    -- 1. Remove fotos de atividades anteriores a hoje (limpeza ao final do dia)
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

    -- 2. Seleciona e remove fotos individuais legadas com mais de 7 dias
    FOR photo_record IN 
        SELECT id, file_path 
        FROM public.daily_photos 
        WHERE created_at < (NOW() - INTERVAL '7 days')
    LOOP
        -- Exclui objeto do storage (se existir)
        DELETE FROM storage.objects 
        WHERE bucket_id = 'daily-photos' AND name = photo_record.file_path;

        -- Exclui metadados do banco
        DELETE FROM public.daily_photos 
        WHERE id = photo_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage;

-- A limpeza é disparada só pelo pg_cron; ninguém deve chamá-la via API (RPC).
REVOKE ALL ON FUNCTION public.cleanup_expired_daily_photos() FROM PUBLIC, anon, authenticated;

-- Agendamento diário à meia-noite via pg_cron (se disponível)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule('cleanup-expired-daily-photos', '0 3 * * *', 'SELECT public.cleanup_expired_daily_photos()');
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignora se pg_cron não estiver habilitado no plano
    NULL;
END;
$$;

-- ==============================================================================
-- 17. ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_activity_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_templates ENABLE ROW LEVEL SECURITY;

-- Helper: Função segura para verificar papel do usuário atual
-- (perfis desativados perdem o acesso imediatamente)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() AND active = true;
$$;

-- PROFILES
DROP POLICY IF EXISTS "Admin pode tudo em profiles" ON public.profiles;
CREATE POLICY "Admin pode tudo em profiles" ON public.profiles
    FOR ALL TO authenticated
    USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "Usuário pode ver próprio perfil" ON public.profiles;
CREATE POLICY "Usuário pode ver próprio perfil" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid());

DROP POLICY IF EXISTS "Equipe pode ver perfis" ON public.profiles;
CREATE POLICY "Equipe pode ver perfis" ON public.profiles
    FOR SELECT TO authenticated
    USING (public.current_user_role() IN ('admin', 'staff'));

-- PETS
DROP POLICY IF EXISTS "Equipe pode gerenciar pets" ON public.pets;
CREATE POLICY "Equipe pode gerenciar pets" ON public.pets
    FOR ALL TO authenticated
    USING (public.current_user_role() IN ('admin', 'staff'));

DROP POLICY IF EXISTS "Responsável pode ver apenas seus pets" ON public.pets;
CREATE POLICY "Responsável pode ver apenas seus pets" ON public.pets
    FOR SELECT TO authenticated
    USING (
        id IN (
            SELECT pg.pet_id 
            FROM public.pet_guardians pg
            JOIN public.guardians g ON pg.guardian_id = g.id
            WHERE g.user_id = auth.uid()
        )
    );

-- GUARDIANS
DROP POLICY IF EXISTS "Equipe pode gerenciar responsáveis" ON public.guardians;
CREATE POLICY "Equipe pode gerenciar responsáveis" ON public.guardians
    FOR ALL TO authenticated
    USING (public.current_user_role() IN ('admin', 'staff'));

DROP POLICY IF EXISTS "Responsável pode ver seu próprio registro" ON public.guardians;
CREATE POLICY "Responsável pode ver seu próprio registro" ON public.guardians
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- PET_GUARDIANS
DROP POLICY IF EXISTS "Equipe pode gerenciar vínculos pet-responsável" ON public.pet_guardians;
CREATE POLICY "Equipe pode gerenciar vínculos pet-responsável" ON public.pet_guardians
    FOR ALL TO authenticated
    USING (public.current_user_role() IN ('admin', 'staff'));

DROP POLICY IF EXISTS "Responsável pode ver seus vínculos" ON public.pet_guardians;
CREATE POLICY "Responsável pode ver seus vínculos" ON public.pet_guardians
    FOR SELECT TO authenticated
    USING (
        guardian_id IN (
            SELECT id FROM public.guardians WHERE user_id = auth.uid()
        )
    );

-- ATTENDANCE
DROP POLICY IF EXISTS "Equipe pode gerenciar presenças" ON public.attendance;
CREATE POLICY "Equipe pode gerenciar presenças" ON public.attendance
    FOR ALL TO authenticated
    USING (public.current_user_role() IN ('admin', 'staff'));

DROP POLICY IF EXISTS "Responsável vê presença APENAS do dia atual de seus pets" ON public.attendance;
CREATE POLICY "Responsável vê presença APENAS do dia atual de seus pets" ON public.attendance
    FOR SELECT TO authenticated
    USING (
        date = (timezone('America/Sao_Paulo'::text, now()))::date
        AND pet_id IN (
            SELECT pg.pet_id 
            FROM public.pet_guardians pg
            JOIN public.guardians g ON pg.guardian_id = g.id
            WHERE g.user_id = auth.uid()
        )
    );

-- DAILY_REPORTS
DROP POLICY IF EXISTS "Equipe pode gerenciar relatórios diários" ON public.daily_reports;
CREATE POLICY "Equipe pode gerenciar relatórios diários" ON public.daily_reports
    FOR ALL TO authenticated
    USING (public.current_user_role() IN ('admin', 'staff'));

DROP POLICY IF EXISTS "Responsável vê relatório APENAS do dia atual de seus pets" ON public.daily_reports;
CREATE POLICY "Responsável vê relatório APENAS do dia atual de seus pets" ON public.daily_reports
    FOR SELECT TO authenticated
    USING (
        date = (timezone('America/Sao_Paulo'::text, now()))::date
        AND status IN ('in_progress', 'completed', 'shared')
        AND pet_id IN (
            SELECT pg.pet_id 
            FROM public.pet_guardians pg
            JOIN public.guardians g ON pg.guardian_id = g.id
            WHERE g.user_id = auth.uid()
        )
    );

-- DAILY_PHOTOS
DROP POLICY IF EXISTS "Equipe pode gerenciar fotos diárias" ON public.daily_photos;
CREATE POLICY "Equipe pode gerenciar fotos diárias" ON public.daily_photos
    FOR ALL TO authenticated
    USING (public.current_user_role() IN ('admin', 'staff'));

DROP POLICY IF EXISTS "Responsável vê fotos APENAS do dia atual de seus pets" ON public.daily_photos;
CREATE POLICY "Responsável vê fotos APENAS do dia atual de seus pets" ON public.daily_photos
    FOR SELECT TO authenticated
    USING (
        report_id IN (
            SELECT id FROM public.daily_reports
            WHERE date = (timezone('America/Sao_Paulo'::text, now()))::date
            AND pet_id IN (
                SELECT pg.pet_id 
                FROM public.pet_guardians pg
                JOIN public.guardians g ON pg.guardian_id = g.id
                WHERE g.user_id = auth.uid()
            )
        )
    );

-- DAILY_ACTIVITY_LOGS (Registros do Dia)
DROP POLICY IF EXISTS "Equipe pode gerenciar registros de atividades" ON public.daily_activity_logs;
CREATE POLICY "Equipe pode gerenciar registros de atividades" ON public.daily_activity_logs
    FOR ALL TO authenticated
    USING (public.current_user_role() IN ('admin', 'staff'));

DROP POLICY IF EXISTS "Responsável vê registros de atividades do dia atual" ON public.daily_activity_logs;
CREATE POLICY "Responsável vê registros de atividades do dia atual" ON public.daily_activity_logs
    FOR SELECT TO authenticated
    USING (date = (timezone('America/Sao_Paulo'::text, now()))::date);

-- DAILY_ACTIVITY_PHOTOS (Fotos das Atividades do Dia)
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

-- INCIDENTS
DROP POLICY IF EXISTS "Equipe pode gerenciar ocorrências" ON public.incidents;
CREATE POLICY "Equipe pode gerenciar ocorrências" ON public.incidents
    FOR ALL TO authenticated
    USING (public.current_user_role() IN ('admin', 'staff'));

DROP POLICY IF EXISTS "Responsável vê ocorrências do dia atual de seus pets se notificadas" ON public.incidents;
CREATE POLICY "Responsável vê ocorrências do dia atual de seus pets se notificadas" ON public.incidents
    FOR SELECT TO authenticated
    USING (
        notify_guardian = true
        AND date = (timezone('America/Sao_Paulo'::text, now()))::date
        AND pet_id IN (
            SELECT pg.pet_id 
            FROM public.pet_guardians pg
            JOIN public.guardians g ON pg.guardian_id = g.id
            WHERE g.user_id = auth.uid()
        )
    );

-- REPORT_SHARES
DROP POLICY IF EXISTS "Equipe gerencia compartilhamentos" ON public.report_shares;
CREATE POLICY "Equipe gerencia compartilhamentos" ON public.report_shares
    FOR ALL TO authenticated
    USING (public.current_user_role() IN ('admin', 'staff'));

-- AUDIT_LOGS
DROP POLICY IF EXISTS "Admin pode consultar logs de auditoria" ON public.audit_logs;
CREATE POLICY "Admin pode consultar logs de auditoria" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "Sistema insere logs" ON public.audit_logs;
CREATE POLICY "Sistema insere logs" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ACTIVITY_TEMPLATES
DROP POLICY IF EXISTS "Equipe vê modelos de atividades" ON public.activity_templates;
CREATE POLICY "Equipe vê modelos de atividades" ON public.activity_templates
    FOR SELECT TO authenticated
    USING (public.current_user_role() IN ('admin', 'staff'));

DROP POLICY IF EXISTS "Admin gerencia modelos de atividades" ON public.activity_templates;
CREATE POLICY "Admin gerencia modelos de atividades" ON public.activity_templates
    FOR ALL TO authenticated
    USING (public.current_user_role() = 'admin')
    WITH CHECK (public.current_user_role() = 'admin');

-- STORAGE (bucket daily-photos): leitura pública, escrita somente da equipe
DROP POLICY IF EXISTS "Permitir upload de fotos diárias" ON storage.objects;
DROP POLICY IF EXISTS "Permitir exclusão de fotos diárias" ON storage.objects;
DROP POLICY IF EXISTS "Visualização pública de fotos diárias" ON storage.objects;
CREATE POLICY "Visualização pública de fotos diárias" ON storage.objects
    FOR SELECT USING (bucket_id = 'daily-photos');

DROP POLICY IF EXISTS "Equipe envia fotos diárias" ON storage.objects;
CREATE POLICY "Equipe envia fotos diárias" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'daily-photos' AND public.current_user_role() IN ('admin', 'staff'));

DROP POLICY IF EXISTS "Equipe exclui fotos diárias" ON storage.objects;
CREATE POLICY "Equipe exclui fotos diárias" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'daily-photos' AND public.current_user_role() IN ('admin', 'staff'));

