# 🐾 Dermabichos — Gestão da Creche Canina

Sistema completo para planejamento, gestão operacional diária e acompanhamento em tempo real da creche canina do petshop **Dermabichos**.

Construído de acordo com todas as diretrizes da arquitetura, identidade visual e regras de negócio da skill **`dermabichos-creche`**.

---

## 🎨 Identidade Visual & Diretrizes
- **Rosa Principal:** `#CD8DA7`
- **Azul Principal:** `#79B7DE`
- **Superfície & Fundo:** `#FFFFFF` e `#F8FAFC`
- **Tipografia & Contraste:** `#25313B` e `#5B6570`
- **Idioma:** Português Brasileiro (`pt-BR`)
- **Fuso Horário Operacional:** `America/Sao_Paulo`

---

## 🚀 Funcionalidades Principais

### 1. Rotina Diária Operacional (`/rotina`)
- Operação mobile-first ágil pensada para o monitor da creche.
- Check-in e check-out rápidos com registro de horários.
- Ficha de cuidados: alimentação (*comeu tudo, parcial, não comeu, não observado*), água, atividades com enriquecimento ambiental, soneca pós-almoço e comportamento.
- **Upload de até 5 fotos por pet/dia** com política explícita de **retenção de 7 dias**.
- **Fechamento Diário:** painel instantâneo com contagem de pets presentes, relatórios concluídos e pendências.
- **Compartilhamento WhatsApp:** gera mensagem pré-formatada com o resumo dos fatos reais do dia e link direto para o Portal do Tutor.

### 2. Portal do Tutor / Responsável (`/portal`)
- Área exclusiva, responsiva e com acesso protegido por autenticação.
- **Regra estrita de privacidade:** o tutor visualiza **apenas as informações do dia atual** (`America/Sao_Paulo`) dos seus próprios cães vinculados.
- Não exibe histórico passado, notas internas ou dados de outros animais.
- Seletor de pets caso o tutor possua mais de um animal cadastrado (ex.: Mel e Bob).

### 3. Gestão Cadastral Completa
- **Pets (`/pets`):** Cadastro com porte, raça, foto, temperamento, restrições alimentares, alergias e vínculo com tutores. *(Sem módulos desnecessários de vacinas, conforme o escopo do MVP)*.
- **Responsáveis (`/responsaveis`):** Gestão de dados de contato, WhatsApp e múltiplos cães vinculados.
- **Equipe (`/funcionarios`):** Cadastro de monitores, ativação e desativação segura sem apagar o histórico de auditoria.

### 4. Dashboard de Indicadores (`/dashboard`)
- Taxa de presença por data e ocupação em relação à capacidade de referência da unidade.
- Percentual de relatórios finalizados e compartilhados com tutores.
- Indicadores de apetite e engajamento nas atividades.

### 5. Histórico e Retenção de Fotos (`/historico`)
- Consulta administrativa para qualquer data anterior.
- Mantém todo o histórico textual registrado permanentemente.
- Para datas com mais de 7 dias, exibe o aviso institucional de conformidade: *"Fotos expiradas após o prazo de armazenamento de 7 dias"*.

---

## 🛠️ Stack Tecnológica
- **Frontend & Backend:** Next.js (App Router, Turbopack) + React + TypeScript estrito.
- **Estilização:** Tailwind CSS + Lucide Icons + Tokens da Dermabichos.
- **Banco de Dados & Storage:** Supabase (PostgreSQL com RLS ativo, Supabase Auth e Storage).
- **Hospedagem:** Otimizado para deploy na Vercel.

---

## 🗄️ Configuração do Banco de Dados (Supabase)

1. Acesse o **SQL Editor** do seu painel Supabase (`https://supabase.com/dashboard/project/etbukdpexskidpyoyylo/sql`).
2. Abra e execute o arquivo [`supabase/schema.sql`](./supabase/schema.sql). Ele criará:
   - Todas as tabelas relacionais com chaves estrangeiras e índices.
   - Restrição e trigger de até 5 fotos por relatório diário.
   - Criação do bucket privado `daily-photos`.
   - Rotina SQL idempotente `cleanup_expired_daily_photos()` com agendamento `pg_cron` para exclusão automática após 7 dias.
   - Políticas RLS completas garantindo que tutores acessem apenas dados do dia atual dos seus próprios pets.
3. (Opcional) Execute o arquivo [`supabase/seed.sql`](./supabase/seed.sql) para inserir pets e tutores de teste.

---

## 💻 Como Rodar Localmente

```bash
# Entrar na pasta do projeto
cd C:\Users\Diego\Documents\dermabichos-creche

# Instalar dependências (já instaladas)
npm install

# Iniciar o servidor de desenvolvimento
npm run dev
```

Acesse no navegador:
- Sistema interno: `http://localhost:3000/rotina`
- Portal do tutor: `http://localhost:3000/portal`
- Dashboard: `http://localhost:3000/dashboard`

---

## 📦 Build de Produção

```bash
npm run build
```
O build compila 100% de forma estática e otimizada para a Vercel.
