# §7 — Módulo: Alunos

**Design:** `screens-students.jsx`
**Rota:** `/alunos` (Admin, Secretário) | `/dashboard` (Professor — via ProfessorAlunosTable)

---

## §7.1 — Listagem com Filtros

**Componente design:** `AlunosScreen`

**Dados:**
```sql
SELECT s.*,
  array_agg(t.nome) AS professores_nomes,
  array_agg(st.teacher_id) AS professores_ids
FROM students s
LEFT JOIN student_teachers st ON st.student_id = s.id
LEFT JOIN teachers t ON t.id = st.teacher_id
GROUP BY s.id
ORDER BY s.nome;
```

**Filtros** (todos client-side a partir da lista carregada, ou server-side para listas grandes):
- `status`: Todos / Ativo / Atrasado / Pendente de Validação / Inativo / **Risco** (status='Atrasado' AND status_atrasado_desde < now()-20d)
- `professor`: filtrar por teacher_id
- `busca`: nome, email ou telefone (case insensitive)

**Query param especial `?status=Risco`** (vindo do widget do Dashboard): ativa filtro `status='Atrasado' AND status_atrasado_desde < now() - interval '20 days'`.

**Chip "Risco de inativação":** filtra `status_atrasado_desde < now() - interval '20 days'`. Ver `00-decisoes-e-divergencias.md §0.4`.

**Export:** respeita filtros ativos. Ver `design: ui.jsx` → `exportCSV` / `exportXLSX`. Registrar auditoria ao exportar.

---

## §7.2 — Cadastro de Aluno

**Componente design:** `NovoAlunoModal`

**Campos obrigatórios:** nome, telefone, professor(es). Ver design para validação inline (botão disabled até válido).

**MultiProfessorPicker:** componente custom, ver `design: screens-students.jsx`. Exibe badges removíveis.

**Ação:**
```
INSERT INTO students (nome, telefone, email, plano, nivel_ingles, valor_mensalidade, dia_vencimento, data_entrada, carga_horaria, observacoes, status='Ativo', criado_por=auth.uid())
→ INSERT INTO student_teachers (student_id, teacher_id) para cada professor selecionado
→ insertAuditLog({ acao: 'Aluno criado', entidade: 'Aluno', entidade_id: novoId, dados_depois: { ...campos } })
→ Toast: "Aluno cadastrado. Ação registrada na auditoria."
```

---

## §7.3 — Detalhe e Edição do Aluno

**Componente design:** `AlunoDetail`

O componente tem **dois modos**: `view` e `edit`. Ver `design: screens-students.jsx` → `AlunoDetail` → estado `mode`.

**Modo view mostra:**
- Status badge + valor/mês
- Grid de informações (email, telefone, plano, nível, carga horária, mensalidade, vencimento, entrada)
- Professores vinculados (badges)
- Observações
- Agenda rápida (próximas 3 aulas) — consultar tabela `agenda`
- Histórico financeiro recente (últimos 4 pagamentos) — consultar tabela `payments`

**Modo edit — campos editáveis por perfil:**

| Campo | Admin | Secretário | Professor |
|-------|-------|-----------|-----------|
| Email, Telefone, Plano, Nível, Carga, Venc, Professores, Obs | ✅ | ✅ | ❌ (sem botão Editar) |
| Valor mensalidade | ✅ (input) | ❌ (read-only + ícone cadeado) | ❌ |

**Ação ao salvar edição:**
```
UPDATE students SET telefone, email, plano, nivel_ingles, valor_mensalidade (se admin), dia_vencimento, carga_horaria, observacoes WHERE id = aluno_id
→ DELETE FROM student_teachers WHERE student_id = aluno_id
→ INSERT INTO student_teachers para novos professores
→ Lógica status_atrasado_desde:
  - Ao mudar status para 'Atrasado': SET status_atrasado_desde = now()
  - Ao sair de 'Atrasado': SET status_atrasado_desde = null
→ insertAuditLog({ acao: 'Aluno editado', dados_antes: {...antes}, dados_depois: {...depois} })
→ Toast: "Dados de [Nome] atualizados."
```

**Bloqueio de agendamento:** se `aluno.status === 'Inativo'`, ocultar botão "Ver na agenda". Se 'Atrasado', exibir aviso amber mas manter botão. Ver `00-decisoes-e-divergencias.md §0.2`.

---

## §7.4 — Inativação de Aluno

**Componente design:** `InativarAlunoModal`

**Ação:**
```
UPDATE students SET status='Inativo', motivo_inativacao=motivo WHERE id = aluno_id
→ SET status_atrasado_desde = null
→ insertAuditLog({ acao: 'Aluno inativado', dados_antes: { status: statusAnterior }, dados_depois: { status: 'Inativo', motivo } })
→ Toast: "Aluno inativado. Histórico preservado."
→ Fechar AlunoDetail após 1.6s (ver design)
```

**Reativação (inline no AlunoDetail):** confirmação rápida sem modal separado.
```
UPDATE students SET status='Ativo', motivo_inativacao=null WHERE id = aluno_id
→ insertAuditLog({ acao: 'Aluno reativado' })
→ Toast: "Aluno reativado."
```

---

## §7.5 — Inativação Automática (Cron)

**Arquivo:** `app/api/cron/inativacao/route.ts`

**Trigger:** Vercel Cron, diariamente às 02:00 UTC. Configurar em `vercel.json`.

**Lógica:**
```sql
UPDATE students SET status='Inativo', motivo_inativacao='Inativação automática — 30 dias sem regularização',
  status_atrasado_desde = null
WHERE status = 'Atrasado'
AND status_atrasado_desde < now() - interval '30 days'
RETURNING id, nome;
```
Para cada aluno inativado: `insertAuditLog({ acao: 'Inativação automática', usuario_id: null, perfil: 'Sistema' })`.

Rota protegida por Vercel Cron secret — não acessível publicamente.
