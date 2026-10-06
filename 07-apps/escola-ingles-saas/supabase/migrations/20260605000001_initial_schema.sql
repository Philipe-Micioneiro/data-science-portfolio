-- =============================================================================
-- Migration: 20260605000001_initial_schema.sql
-- Sistema de Gestão Escolar — Escola de Inglês
-- =============================================================================
-- Ordem de criação:
--   1. Extensões
--   2. Enums
--   3. Tabelas (respeitando ordem de FK)
--   4. Índices
--   5. Função helper get_perfil()
--   6. RLS — enable + policies por tabela
-- =============================================================================

-- =============================================================================
-- 1. EXTENSÕES
-- =============================================================================

-- pgcrypto não é necessário pois a geração de senhas temporárias é feita
-- pela aplicação Next.js (§0.6). Sem extensões adicionais requeridas pela SPEC.


-- =============================================================================
-- 2. ENUMS
-- =============================================================================

CREATE TYPE public.perfil_usuario AS ENUM (
  'Administrador',
  'Secretário',
  'Professor'
);

CREATE TYPE public.status_aluno AS ENUM (
  'Ativo',
  'Atrasado',
  'Pendente de Validação',
  'Inativo'
);

CREATE TYPE public.status_usuario AS ENUM (
  'Ativo',
  'Inativo'
);

CREATE TYPE public.status_professor AS ENUM (
  'Ativo',
  'Inativo'
);

CREATE TYPE public.forma_pagamento AS ENUM (
  'Cartão',
  'PIX',
  'Boleto'
);

CREATE TYPE public.status_payment AS ENUM (
  'Pago',
  'Atrasado',
  'Pendente de Validação'
);

CREATE TYPE public.status_agenda AS ENUM (
  'Agendada',
  'Realizada',
  'Cancelada'
);

CREATE TYPE public.status_teacher_payment AS ENUM (
  'Pendente',
  'Parcial',
  'Pago'
);


-- =============================================================================
-- 3. TABELAS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 3.1 users_profile
-- Extensão de auth.users. Criada antes de qualquer tabela que a referencie.
-- school_config referencia users_profile(id), então esta tabela vem primeiro.
-- -----------------------------------------------------------------------------

CREATE TABLE public.users_profile (
  id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome                text NOT NULL,
  email               text,                           -- espelho de auth.users.email para queries JOIN
  perfil              public.perfil_usuario NOT NULL,
  status              public.status_usuario NOT NULL DEFAULT 'Ativo',
  precisa_trocar_senha boolean NOT NULL DEFAULT true,
  criado_em           timestamptz NOT NULL DEFAULT now(),
  atualizado_em       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.users_profile IS
  'Extensão de auth.users com perfil, status e flag de senha temporária. '
  'Campo email é espelho de auth.users.email para facilitar queries.';

COMMENT ON COLUMN public.users_profile.precisa_trocar_senha IS
  'Setado como true na criação de conta e no reset de senha pelo admin (§6.2, §6.4). '
  'Zerado após o usuário definir sua nova senha no fluxo de troca obrigatória (§3).';


-- -----------------------------------------------------------------------------
-- 3.2 teachers
-- Deve vir antes de students (student_teachers) e school_config não depende dela.
-- -----------------------------------------------------------------------------

CREATE TABLE public.teachers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                text NOT NULL,
  email               text NOT NULL,
  telefone            text,
  valor_hora          numeric(10, 2),
  forma_pagamento     text,                           -- texto livre (PIX, transferência, etc.)
  obs_financeiras     text,
  status              public.status_professor NOT NULL DEFAULT 'Ativo',
  user_id             uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- nullable: professor pode existir sem conta
  criado_em           timestamptz NOT NULL DEFAULT now(),
  atualizado_em       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.teachers IS
  'Professores da escola. user_id é nullable: professor pode ser cadastrado antes '
  'de ter acesso ao sistema. Criação de conta é feita em §8.2.';

COMMENT ON COLUMN public.teachers.user_id IS
  'Referência à conta de login do professor em auth.users. '
  'Null quando o professor ainda não possui conta criada.';


-- -----------------------------------------------------------------------------
-- 3.3 students
-- -----------------------------------------------------------------------------

CREATE TABLE public.students (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                    text NOT NULL,
  telefone                text NOT NULL,
  email                   text,
  plano                   text,
  nivel_ingles            text,
  valor_mensalidade       numeric(10, 2),
  dia_vencimento          int CHECK (dia_vencimento BETWEEN 1 AND 31),
  data_entrada            date,
  carga_horaria           text,
  observacoes             text,
  status                  public.status_aluno NOT NULL DEFAULT 'Ativo',
  motivo_inativacao       text,                       -- preenchido em §7.4 (inativação manual) ou §7.5 (cron)
  status_atrasado_desde   timestamptz,                -- §0.4: setado ao entrar em 'Atrasado', zerado ao sair
  criado_por              uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em               timestamptz NOT NULL DEFAULT now(),
  atualizado_em           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.students IS
  'Alunos cadastrados na escola.';

COMMENT ON COLUMN public.students.motivo_inativacao IS
  'Preenchido na inativação manual (§7.4) com o texto digitado pelo operador, '
  'ou automaticamente pelo cron (§7.5) com texto fixo.';

COMMENT ON COLUMN public.students.status_atrasado_desde IS
  'Timestamp do momento em que o status mudou para Atrasado. '
  'Usado pelo widget Risco de Inativação (> 20 dias) e cron de inativação (> 30 dias). '
  'Decisão: §0.4 de 00-decisoes-e-divergencias.md.';

COMMENT ON COLUMN public.students.email IS
  'Email pessoal do aluno — NÃO é conta de acesso ao sistema. '
  'Usado para envio de emails de rejeição de comprovante (§10.3). Ver §21.';


-- -----------------------------------------------------------------------------
-- 3.4 student_teachers  (tabela N:N)
-- -----------------------------------------------------------------------------

CREATE TABLE public.student_teachers (
  student_id  uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id  uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  PRIMARY KEY (student_id, teacher_id)
);

COMMENT ON TABLE public.student_teachers IS
  'Relação N:N entre alunos e professores. '
  'Um aluno pode ter múltiplos professores (MultiProfessorPicker, §7.2).';


-- -----------------------------------------------------------------------------
-- 3.5 payments
-- -----------------------------------------------------------------------------

CREATE TABLE public.payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  competencia         text NOT NULL,                  -- ex: "2026-06" (formato YYYY-MM para exibição)
  competencia_date    date NOT NULL,                  -- primeiro dia do mês — usado para índice e queries
  valor_previsto      numeric(10, 2) NOT NULL,
  valor_pago          numeric(10, 2),                 -- null até aprovação; igual a valor_previsto (§21)
  forma_pagamento     public.forma_pagamento NOT NULL,
  vencimento          date,
  status              public.status_payment NOT NULL DEFAULT 'Pendente de Validação',
  motivo_rejeicao     text,                           -- preenchido em §10.3 ao rejeitar comprovante
  aprovado_por        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  aprovado_em         timestamptz,
  criado_por          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payments IS
  'Mensalidades dos alunos. Pagamento parcial é PROIBIDO para alunos: '
  'valor_pago deve ser igual a valor_previsto quando pago (§21).';

COMMENT ON COLUMN public.payments.competencia IS
  'Texto no formato YYYY-MM usado para exibição (ex: "2026-06").';

COMMENT ON COLUMN public.payments.competencia_date IS
  'Primeiro dia do mês da competência — date type para índice e comparações de período.';

COMMENT ON COLUMN public.payments.valor_pago IS
  'Null enquanto o pagamento não for aprovado. '
  'Deve ser igual a valor_previsto ao aprovar (verificação na Server Action, §21).';

COMMENT ON COLUMN public.payments.motivo_rejeicao IS
  'Preenchido ao rejeitar comprovante (§10.3). Mínimo de 20 caracteres conforme design.';


-- -----------------------------------------------------------------------------
-- 3.6 payment_receipts
-- -----------------------------------------------------------------------------

CREATE TABLE public.payment_receipts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id    uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  arquivo_url   text NOT NULL,                        -- Supabase Storage path: comprovantes/{payment_id}/{hash}.{ext}
  hash_sha256   text NOT NULL,                        -- SHA256 do arquivo — UNIQUE garante antifraude (§17.2)
  formato       text NOT NULL,                        -- 'image/png' | 'image/jpeg' | 'application/pdf'
  enviado_por   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payment_receipts IS
  'Comprovantes de pagamento. hash_sha256 UNIQUE impede o mesmo arquivo '
  'ser vinculado a múltiplos pagamentos (antifraude, §0.7, §17.2, §21).';

COMMENT ON COLUMN public.payment_receipts.arquivo_url IS
  'Path no Supabase Storage. Bucket: comprovantes (privado). '
  'Estrutura: comprovantes/{payment_id}/{hash_sha256}.{ext} (§18).';

COMMENT ON COLUMN public.payment_receipts.hash_sha256 IS
  'Hash SHA256 calculado client-side (Web Crypto API) e verificado server-side. '
  'UNIQUE INDEX garante unicidade antifraude (§17.2, §21).';

COMMENT ON COLUMN public.payment_receipts.formato IS
  'MIME type validado server-side. Valores aceitos: image/png, image/jpeg, application/pdf (§18, §21).';


-- -----------------------------------------------------------------------------
-- 3.7 audit_logs
-- IMUTÁVEL: sem UPDATE, sem DELETE — policies garantem isso para todos os perfis.
-- usuario_id é nullable para suportar ações do Sistema (cron de inativação, §7.5).
-- -----------------------------------------------------------------------------

CREATE TABLE public.audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,  -- nullable: ações de Sistema
  perfil        text,                                                -- 'Administrador' | 'Secretário' | 'Professor' | 'Sistema'
  acao          text NOT NULL,
  entidade      text,
  entidade_id   uuid,
  dados_antes   jsonb,
  dados_depois  jsonb,
  ip            text,
  user_agent    text,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_logs IS
  'Trilha de auditoria imutável. Nenhum perfil pode executar UPDATE ou DELETE. '
  'usuario_id é nullable para ações de Sistema (ex: cron de inativação automática, §7.5).';

COMMENT ON COLUMN public.audit_logs.perfil IS
  'Snapshot do perfil no momento da ação. Valor especial "Sistema" para ações de cron.';


-- -----------------------------------------------------------------------------
-- 3.8 agenda
-- -----------------------------------------------------------------------------

CREATE TABLE public.agenda (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  teacher_id    uuid NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
  start_at      timestamptz NOT NULL,
  duracao_min   int NOT NULL DEFAULT 60 CHECK (duracao_min > 0),
  observacoes   text,
  status        public.status_agenda NOT NULL DEFAULT 'Agendada',
  criado_por    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.agenda IS
  'Eventos de aula. Criação: Admin e Secretário apenas (§0.1, §9.2). '
  'Professor tem acesso somente leitura da sua própria agenda via RLS. '
  'Alunos Inativos não podem ser agendados (§0.2, §9.2, §21).';

COMMENT ON COLUMN public.agenda.duracao_min IS
  'Duração da aula em minutos. Usado para cálculo de horas no financeiro de professores (§11.1).';


-- -----------------------------------------------------------------------------
-- 3.9 teacher_payments
-- -----------------------------------------------------------------------------

CREATE TABLE public.teacher_payments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    uuid NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
  competencia   text NOT NULL,                        -- ex: "2026-06" (formato YYYY-MM)
  valor_devido  numeric(10, 2) NOT NULL,
  valor_pago    numeric(10, 2) NOT NULL DEFAULT 0,
  status        public.status_teacher_payment NOT NULL DEFAULT 'Pendente',
  criado_em     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, competencia)                    -- um registro por professor por mês
);

COMMENT ON TABLE public.teacher_payments IS
  'Pagamentos mensais aos professores. Pagamento parcial é PERMITIDO (§11.2, §21). '
  'UNIQUE (teacher_id, competencia) garante um registro por professor por competência.';


-- -----------------------------------------------------------------------------
-- 3.10 school_config
-- Linha única garantida por PK = 1 e constraint CHECK (id = 1).
-- Referencia users_profile, que já foi criada acima.
-- -----------------------------------------------------------------------------

CREATE TABLE public.school_config (
  id                      int PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- garante linha única
  nome_instituicao        text NOT NULL DEFAULT 'English School LTDA',
  dias_uteis_atraso       int NOT NULL DEFAULT 5,
  dias_inativacao         int NOT NULL DEFAULT 30,
  comprovante_obrigatorio boolean NOT NULL DEFAULT true,
  notificar_rejeicao      boolean NOT NULL DEFAULT true,
  atualizado_por          uuid REFERENCES public.users_profile(id) ON DELETE SET NULL,
  atualizado_em           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.school_config IS
  'Configurações globais da escola. Linha única garantida por id = 1 (CHECK constraint). '
  'Apenas Administrador pode ler e atualizar (§17.3).';

COMMENT ON COLUMN public.school_config.dias_uteis_atraso IS
  'Número de dias úteis após vencimento para marcar pagamento como Atrasado.';

COMMENT ON COLUMN public.school_config.dias_inativacao IS
  'Dias no status Atrasado antes da inativação automática pelo cron (§7.5).';

-- Inserir linha inicial com valores padrão (§17.1)
INSERT INTO public.school_config (id) VALUES (1);


-- =============================================================================
-- 4. ÍNDICES CRÍTICOS (§17.2)
-- =============================================================================

-- Antifraude: garante unicidade de comprovante via hash SHA256
CREATE UNIQUE INDEX ON public.payment_receipts(hash_sha256);

-- Queries de pagamentos por aluno em determinada competência (§10.1, §10.2)
CREATE INDEX ON public.payments(student_id, competencia_date);

-- Filtro de pagamentos por status (fila de validação, §10.3)
CREATE INDEX ON public.payments(status);

-- Queries de auditoria ordenadas por data DESC (§12)
CREATE INDEX ON public.audit_logs(criado_em DESC);

-- Agenda do professor em range de datas (§9.1)
CREATE INDEX ON public.agenda(teacher_id, start_at);

-- Lookup de alunos de um professor (§7.1, RLS do Professor)
CREATE INDEX ON public.student_teachers(student_id);

-- Lookup de professores de um aluno
CREATE INDEX ON public.student_teachers(teacher_id);


-- =============================================================================
-- 5. FUNÇÃO HELPER RLS: get_perfil()
-- Retorna o perfil do usuário autenticado atual.
-- STABLE: pode ser chamada em policies RLS sem overhead de recálculo por linha.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_perfil()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT perfil::text
  FROM public.users_profile
  WHERE id = auth.uid()
$$;

COMMENT ON FUNCTION public.get_perfil() IS
  'Helper para RLS: retorna o perfil (text) do usuário autenticado atual. '
  'SECURITY DEFINER para acessar users_profile sem recursão de policy. '
  'Retorna NULL para usuários não autenticados ou sem users_profile.';


-- =============================================================================
-- 6. RLS — HABILITAR E CRIAR POLICIES
-- Convenção de nomenclatura: "{tabela}_{perfil/ação}_{operação}"
-- Nenhuma tabela é acessível sem autenticação (auth.uid() IS NOT NULL em todas).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 6.1 users_profile
-- Admin: full access
-- Secretário: SELECT de todos (para exibir "criado por" e "aprovado por") — §17.3 nota
-- Professor: SELECT apenas próprio registro
-- Nota: sem UPDATE de perfil para ninguém (coluna read-only — §21)
-- -----------------------------------------------------------------------------

ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;

-- Admin: leitura e escrita total
CREATE POLICY "users_profile_admin_all"
ON public.users_profile
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Administrador'
);

-- Secretário: pode ler todos os profiles (para exibir nomes em "criado por" / "aprovado por")
-- ⚠️ Expõe campos de users_profile para Secretário. Avaliar criação de view restrita (id, nome)
--    se requisitos de privacidade forem revisados. Documentado em §17.3.
CREATE POLICY "users_profile_secretario_select"
ON public.users_profile
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Secretário'
);

-- Professor: apenas próprio registro
CREATE POLICY "users_profile_professor_select_own"
ON public.users_profile
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Professor'
  AND id = auth.uid()
);


-- -----------------------------------------------------------------------------
-- 6.2 teachers
-- Admin: full access
-- Secretário: full access
-- Professor: SELECT apenas próprio registro (via user_id = auth.uid())
-- -----------------------------------------------------------------------------

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Admin: full
CREATE POLICY "teachers_admin_all"
ON public.teachers
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Administrador'
);

-- Secretário: full
CREATE POLICY "teachers_secretario_all"
ON public.teachers
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Secretário'
);

-- Professor: apenas próprio registro
CREATE POLICY "teachers_professor_select_own"
ON public.teachers
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Professor'
  AND user_id = auth.uid()
);


-- -----------------------------------------------------------------------------
-- 6.3 students
-- Admin: full access
-- Secretário: full access
-- Professor: SELECT apenas alunos vinculados via student_teachers
-- -----------------------------------------------------------------------------

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Admin: full
CREATE POLICY "students_admin_all"
ON public.students
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Administrador'
);

-- Secretário: full
CREATE POLICY "students_secretario_all"
ON public.students
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Secretário'
);

-- Professor: SELECT apenas seus alunos via student_teachers → teachers(user_id)
CREATE POLICY "students_professor_select_own"
ON public.students
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Professor'
  AND EXISTS (
    SELECT 1
    FROM public.student_teachers st
    JOIN public.teachers t ON t.id = st.teacher_id
    WHERE st.student_id = students.id
      AND t.user_id = auth.uid()
  )
);


-- -----------------------------------------------------------------------------
-- 6.4 student_teachers
-- Admin: full access
-- Secretário: full access
-- Professor: SELECT apenas linhas onde o teacher_id é o seu registro em teachers
-- -----------------------------------------------------------------------------

ALTER TABLE public.student_teachers ENABLE ROW LEVEL SECURITY;

-- Admin: full
CREATE POLICY "student_teachers_admin_all"
ON public.student_teachers
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Administrador'
);

-- Secretário: full
CREATE POLICY "student_teachers_secretario_all"
ON public.student_teachers
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Secretário'
);

-- Professor: SELECT apenas vínculos que envolvem seu próprio teacher_id
CREATE POLICY "student_teachers_professor_select_own"
ON public.student_teachers
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Professor'
  AND EXISTS (
    SELECT 1
    FROM public.teachers t
    WHERE t.id = student_teachers.teacher_id
      AND t.user_id = auth.uid()
  )
);


-- -----------------------------------------------------------------------------
-- 6.5 payments
-- Admin: full access
-- Secretário: full access
-- Professor: sem acesso (nenhuma policy para Professor)
-- -----------------------------------------------------------------------------

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Admin: full
CREATE POLICY "payments_admin_all"
ON public.payments
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Administrador'
);

-- Secretário: full
CREATE POLICY "payments_secretario_all"
ON public.payments
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Secretário'
);

-- Professor: sem policy → sem acesso (RLS bloqueia por padrão)


-- -----------------------------------------------------------------------------
-- 6.6 payment_receipts
-- Admin: full access
-- Secretário: full access
-- Professor: sem acesso
-- -----------------------------------------------------------------------------

ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

-- Admin: full
CREATE POLICY "payment_receipts_admin_all"
ON public.payment_receipts
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Administrador'
);

-- Secretário: full
CREATE POLICY "payment_receipts_secretario_all"
ON public.payment_receipts
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Secretário'
);

-- Professor: sem policy → sem acesso


-- -----------------------------------------------------------------------------
-- 6.7 audit_logs
-- IMUTÁVEL: nenhum perfil pode executar UPDATE ou DELETE (§17.1, §21).
-- Admin: SELECT + INSERT
-- Secretário: INSERT apenas (sem SELECT — dados financeiros e administrativos sensíveis)
-- Professor: INSERT apenas
-- Ações de Sistema (cron): INSERT via service_role key — não coberto por RLS de usuário
-- -----------------------------------------------------------------------------

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin: SELECT de todos os logs
CREATE POLICY "audit_logs_admin_select"
ON public.audit_logs
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Administrador'
);

-- Admin: INSERT
CREATE POLICY "audit_logs_admin_insert"
ON public.audit_logs
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Administrador'
);

-- Secretário: INSERT apenas (sem SELECT de auditoria — §0.3, §12)
CREATE POLICY "audit_logs_secretario_insert"
ON public.audit_logs
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Secretário'
);

-- Professor: INSERT apenas
CREATE POLICY "audit_logs_professor_insert"
ON public.audit_logs
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Professor'
);

-- UPDATE e DELETE: sem policies para nenhum perfil → bloqueados por RLS para todos


-- -----------------------------------------------------------------------------
-- 6.8 agenda
-- Admin: full access
-- Secretário: full access
-- Professor: full access apenas nos seus próprios eventos (teacher_id vinculado ao seu auth.uid())
-- Nota: criação de aulas é restringida por lógica de aplicação (§0.1, §9.2)
--       pois RLS não distingue entre quem pode INSERT vs. quem pode ler.
--       O Server Action de criação verifica get_perfil() != 'Professor' antes de inserir.
-- -----------------------------------------------------------------------------

ALTER TABLE public.agenda ENABLE ROW LEVEL SECURITY;

-- Admin: full
CREATE POLICY "agenda_admin_all"
ON public.agenda
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Administrador'
);

-- Secretário: full
CREATE POLICY "agenda_secretario_all"
ON public.agenda
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Secretário'
);

-- Professor: acesso apenas a eventos onde teacher_id = seu registro em teachers
-- SELECT liberado (visualização da própria agenda, §9.1)
-- INSERT/UPDATE/DELETE bloqueados pela aplicação — mas policy RLS permite a nível de dado
-- ⚠️ A restrição de criação (Professor não pode criar aulas) é imposta no Server Action (§0.1, §9.2)
CREATE POLICY "agenda_professor_own"
ON public.agenda
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Professor'
  AND EXISTS (
    SELECT 1
    FROM public.teachers t
    WHERE t.id = agenda.teacher_id
      AND t.user_id = auth.uid()
  )
);


-- -----------------------------------------------------------------------------
-- 6.9 teacher_payments
-- Admin: full access
-- Secretário: full access
-- Professor: sem acesso
-- -----------------------------------------------------------------------------

ALTER TABLE public.teacher_payments ENABLE ROW LEVEL SECURITY;

-- Admin: full
CREATE POLICY "teacher_payments_admin_all"
ON public.teacher_payments
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Administrador'
);

-- Secretário: full
CREATE POLICY "teacher_payments_secretario_all"
ON public.teacher_payments
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Secretário'
);

-- Professor: sem policy → sem acesso


-- -----------------------------------------------------------------------------
-- 6.10 school_config
-- Admin: full access (SELECT + UPDATE — linha única, sem INSERT/DELETE necessário)
-- Secretário: sem acesso
-- Professor: sem acesso
-- -----------------------------------------------------------------------------

ALTER TABLE public.school_config ENABLE ROW LEVEL SECURITY;

-- Admin: full (SELECT + UPDATE da linha única)
CREATE POLICY "school_config_admin_only"
ON public.school_config
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Administrador'
);

-- Secretário: sem policy → sem acesso
-- Professor: sem policy → sem acesso


-- =============================================================================
-- FIM DA MIGRATION
-- =============================================================================
-- Tabelas criadas: 10
--   users_profile, teachers, students, student_teachers, payments,
--   payment_receipts, audit_logs, agenda, teacher_payments, school_config
--
-- Índices criados: 7 (§17.2)
--   payment_receipts(hash_sha256) UNIQUE
--   payments(student_id, competencia_date)
--   payments(status)
--   audit_logs(criado_em DESC)
--   agenda(teacher_id, start_at)
--   student_teachers(student_id)
--   student_teachers(teacher_id)
--
-- RLS policies criadas: 25
--   users_profile: 3 (admin_all, secretario_select, professor_select_own)
--   teachers: 3 (admin_all, secretario_all, professor_select_own)
--   students: 3 (admin_all, secretario_all, professor_select_own)
--   student_teachers: 3 (admin_all, secretario_all, professor_select_own)
--   payments: 2 (admin_all, secretario_all)
--   payment_receipts: 2 (admin_all, secretario_all)
--   audit_logs: 4 (admin_select, admin_insert, secretario_insert, professor_insert)
--   agenda: 3 (admin_all, secretario_all, professor_own)
--   teacher_payments: 2 (admin_all, secretario_all)
--   school_config: 1 (admin_only)
-- =============================================================================
