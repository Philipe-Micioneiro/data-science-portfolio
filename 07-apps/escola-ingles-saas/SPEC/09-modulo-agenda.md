# §9 — Módulo: Agenda

**Design:** `screens-agenda.jsx`
**Rota:** `/agenda` (Admin, Secretário, Professor)

> ⚠️ **Decisão crítica:** ver `00-decisoes-e-divergencias.md §0.1` (quem pode criar aulas) e `§0.2` (bloqueio por status).

---

## §9.1 — Visualização

**Componente design:** `AgendaScreen` com views Dia/Semana/Mês (`TimeGrid`, `MonthGrid`, `EventBlock`)

**Dados:**
```sql
-- Admin/Secretário: todos os eventos
SELECT a.*, s.nome AS aluno, t.nome AS professor_nome
FROM agenda a
JOIN students s ON s.id = a.student_id
JOIN teachers t ON t.id = a.teacher_id
WHERE a.start_at BETWEEN [range_start] AND [range_end]
ORDER BY a.start_at;

-- Professor: apenas seus eventos
SELECT a.*, s.nome AS aluno
FROM agenda a
JOIN students s ON s.id = a.student_id
WHERE a.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
AND a.start_at BETWEEN [range_start] AND [range_end];
```

**RLS:** professores acessam somente eventos onde `teacher_id` bate com seu `teachers.id`. Ver `17-banco-de-dados-schema.md §17.3`.

---

## §9.2 — Criar / Reagendar Aula

**Componente design:** `AulaModal` (modo edit)

**Quem pode criar (PRD §20.2 prevalece sobre o design):** Admin ✅, Secretário ✅, Professor ❌.
O design mostra `canEdit = isProf` — esse valor deve ser invertido: `canEdit = perfil !== 'Professor'`.
Professor visualiza sua própria agenda mas não cria, reagenda ou cancela aulas.

**Regra de bloqueio (PRD §20.3):** apenas alunos com `status = 'Inativo'` bloqueiam agendamento. Para "Atrasado": exibir aviso amber informativo mas permitir agendar.

**Ação:**
```
INSERT INTO agenda (student_id, teacher_id, start_at, duracao_min, observacoes, status='Agendada', criado_por)
→ Verificação server-side: student.status !== 'Inativo' (não apenas frontend)
→ insertAuditLog({ acao: 'Aula agendada' })
→ Toast: "Aula agendada."
```

---

## §9.3 — Cancelar Aula

**Somente Admin e Secretário podem cancelar.**

```
UPDATE agenda SET status='Cancelada' WHERE id = evento_id
→ insertAuditLog({ acao: 'Aula cancelada' })
→ Toast: "Aula cancelada."
```
