-- ==============================================================================
-- DERMABICHOS - SEED DE DEMONSTRAÇÃO E TESTES
-- ==============================================================================

-- 1. Pets de Exemplo
INSERT INTO public.pets (id, name, breed, gender, approximate_age, size, temperament, diet_restrictions, care_notes, status)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Thor', 'Golden Retriever', 'macho', '3 anos', 'grande', 'Muito dócil, brincalhão e enérgico. Adora piscina e bolinha.', 'Ração hipoalergênica ao meio-dia', 'Gosta de carinho na orelha e descansar na sombra após brincar.', 'active'),
    ('22222222-2222-2222-2222-222222222222', 'Pipoca', 'Spitz Alemão', 'femea', '1 ano e meio', 'pequeno', 'Atenta, alegre e adora correr com outros cães pequenos.', 'Não pode petiscos com corante', 'Cuidado com escadas e pulos altos.', 'active'),
    ('33333333-3333-3333-3333-333333333333', 'Mel', 'Labrador', 'femea', '4 anos', 'grande', 'Muito amorosa, sociável e calma com todos.', 'Nenhuma restrição conhecida', 'Toma água com calma, gosta de brinquedos de morder.', 'active'),
    ('44444444-4444-4444-4444-444444444444', 'Bob', 'Bulldog Francês', 'macho', '2 anos', 'medio', 'Tranquilo, dorminhoco, adora soneca no ar condicionado.', 'Alimentação especial para braquicefálico', 'Evitar esforço físico em dias muito quentes.', 'active'),
    ('55555555-5555-5555-5555-555555555555', 'Luna', 'Vira-lata (SRD)', 'femea', '2 anos', 'medio', 'Extremamente carinhosa, um pouco tímida no primeiro contato.', 'Nenhuma', 'Ganhar confiança com petiscos leves.', 'active')
ON CONFLICT (id) DO NOTHING;

-- 2. Responsáveis de Exemplo
INSERT INTO public.guardians (id, full_name, phone, email, notes)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mariana Silva', '(11) 98765-4321', 'mariana.silva@exemplo.com', 'Mãe do Thor. Prefere contato via WhatsApp.'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Carlos Eduardo', '(11) 99123-4567', 'carlos.edu@exemplo.com', 'Responsável pela Pipoca. Autoriza fotos no Instagram.'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Renata Oliveira', '(11) 97654-3210', 'renata.oliver@exemplo.com', 'Responsável pela Mel e pelo Bob.')
ON CONFLICT (id) DO NOTHING;

-- 3. Vínculo Pets e Responsáveis
INSERT INTO public.pet_guardians (pet_id, guardian_id, relationship, is_primary)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Mãe', true),
    ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Pai', true),
    ('33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Mãe', true),
    ('44444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Mãe', true)
ON CONFLICT DO NOTHING;

-- 4. Funcionário de Exemplo
INSERT INTO public.staff_members (id, name, role_title, active)
VALUES
    ('99999999-9999-9999-9999-999999999999', 'Ana Paula (Monitora)', 'Monitora de Creche', true)
ON CONFLICT (id) DO NOTHING;

