-- =============================================================================
-- Migration: 20260809000001_crm_access.sql
-- Tabela de acessos importados do CRM externo (plataforma de turmas/comunidade
-- usada pela escola para conceder e revogar acesso dos alunos).
-- =============================================================================

CREATE TABLE public.crm_access (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_member_id   text UNIQUE,                      -- ID do membro no CRM externo (dedupe em reimportações)
  nome            text NOT NULL,
  email           text NOT NULL,
  telefone        text,
  cohort          text,                              -- ex: "Turma 1"
  ativado_em      timestamptz,
  removido_em     timestamptz,                        -- quando o acesso será revogado; null = vitalício
  vitalicio       boolean NOT NULL DEFAULT false,
  access_code     text,
  student_id      uuid REFERENCES public.students(id) ON DELETE SET NULL,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.crm_access IS
  'Snapshot de exportação do CRM externo (concessão/revogação de acesso de alunos). '
  'student_id vincula ao aluno correspondente via email quando há match.';

COMMENT ON COLUMN public.crm_access.removido_em IS
  'Data em que o acesso será revogado no CRM externo. Null quando vitalicio=true. '
  'Fonte do widget "Vencimento de acessos" no dashboard.';

CREATE INDEX ON public.crm_access(student_id);
CREATE INDEX ON public.crm_access(removido_em);
CREATE INDEX ON public.crm_access(email);

ALTER TABLE public.crm_access ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "crm_access_admin_all"
ON public.crm_access
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Administrador'
);

-- Secretário: full access (mesmo padrão de students/teachers)
CREATE POLICY "crm_access_secretario_all"
ON public.crm_access
FOR ALL
USING (
  auth.uid() IS NOT NULL
  AND public.get_perfil() = 'Secretário'
);

-- Professor: sem policy → sem acesso (dado administrativo, fora do escopo do professor)
