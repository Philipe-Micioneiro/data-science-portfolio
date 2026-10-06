# §17 — Banco de Dados — Schema Supabase

---

## §17.1 — Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `auth.users` | Gerenciada pelo Supabase Auth |
| `users_profile` | Extensão de auth.users — perfil, status, precisa_trocar_senha |
| `students` | Alunos com `motivo_inativacao` e `status_atrasado_desde` |
| `teachers` | Professores com `valor_hora`, `forma_pagamento` |
| `student_teachers` | N:N aluno↔professor |
| `payments` | Mensalidades com `motivo_rejeicao`, `aprovado_por` |
| `payment_receipts` | Comprovantes com `hash_sha256` UNIQUE |
| `audit_logs` | Imutável — sem UPDATE, sem DELETE |
| `agenda` | Eventos de aula |
| `teacher_payments` | Pagamento mensal aos professores |
| `school_config` | Configurações da escola (linha única) |

---

### Campo adicional em `students`

```sql
ALTER TABLE students ADD COLUMN status_atrasado_desde timestamptz;
-- Setado quando status muda para 'Atrasado', zerado ao sair desse status.
-- Usado para filtro "Risco de inativação" (>20 dias) e cron de inativação (>30 dias).
```

**Lógica de atualização:**
- Ao marcar aluno como 'Atrasado': `SET status_atrasado_desde = now()`
- Ao mudar de 'Atrasado' para qualquer outro status: `SET status_atrasado_desde = null`
- Implementar via trigger Postgres ou na Server Action de atualização de status.

---

### Schema de `school_config`

```sql
CREATE TABLE public.school_config (
  id                        int primary key default 1 check (id = 1), -- garante linha única
  nome_instituicao          text not null default 'English School LTDA',
  dias_uteis_atraso         int not null default 5,
  dias_inativacao           int not null default 30,
  comprovante_obrigatorio   boolean not null default true,
  notificar_rejeicao        boolean not null default true,
  atualizado_por            uuid references public.users_profile(id),
  atualizado_em             timestamptz not null default now()
);

-- Inserir linha inicial:
INSERT INTO school_config (id) VALUES (1);

-- RLS: apenas Admin pode SELECT e UPDATE
ALTER TABLE school_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_admin_only" ON school_config
  USING (public.get_perfil() = 'Administrador');
```

---

## §17.2 — Índices Críticos

```sql
CREATE UNIQUE INDEX ON payment_receipts(hash_sha256); -- antifraude
CREATE INDEX ON payments(student_id, competencia_date);
CREATE INDEX ON payments(status);
CREATE INDEX ON audit_logs(criado_em DESC);
CREATE INDEX ON agenda(teacher_id, start_at);
CREATE INDEX ON student_teachers(student_id);
CREATE INDEX ON student_teachers(teacher_id);
```

---

## §17.3 — RLS — Resumo por Tabela

| Tabela | Admin | Secretário | Professor |
|--------|-------|-----------|-----------|
| `students` | Full | Full | SELECT via student_teachers (seus alunos apenas) |
| `payments` | Full | Full | Sem acesso |
| `payment_receipts` | Full | Full | Sem acesso |
| `teachers` | Full | Full | SELECT (próprio registro) |
| `audit_logs` | SELECT + INSERT | INSERT apenas (via função server) | INSERT apenas |
| `users_profile` | Full | SELECT (todos — ver nota abaixo) | SELECT (próprio) |
| `agenda` | Full | Full | Full (próprios eventos via teacher_id) |
| `teacher_payments` | Full | Full | Sem acesso |
| `school_config` | Full | Sem acesso | Sem acesso |

---

### Função helper RLS

```sql
CREATE FUNCTION public.get_perfil() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT perfil FROM users_profile WHERE id = auth.uid()
$$;
```

---

### Policy adicional de `users_profile` para Secretário

```sql
-- Secretário pode ler nomes de usuários para exibir "criado por" e "aprovado por"
CREATE POLICY "users_profile_readonly_names" ON public.users_profile FOR SELECT
  USING (
    public.get_perfil() = 'Secretário'
  );
```

> ⚠️ Esta policy permite que Secretário veja todos os `users_profile`. Avaliar e documentar no migration se deve criar uma view restrita com apenas `id` e `nome`, dependendo do requisito de privacidade.
