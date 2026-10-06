# §8 — Módulo: Professores

**Design:** `screens-professores.jsx`
**Rota:** `/professores` (Admin, Secretário)

---

## §8.1 — Listagem

**Componente design:** `ProfessoresScreen`

**Dados:**
```sql
SELECT t.*,
  COUNT(DISTINCT st.student_id) AS num_alunos,
  COUNT(DISTINCT CASE WHEN a.status != 'Cancelada' THEN a.id END) AS aulas_no_mes,
  COUNT(DISTINCT CASE WHEN a.status = 'Realizada' THEN a.id END) AS aulas_realizadas
FROM teachers t
LEFT JOIN student_teachers st ON st.teacher_id = t.id
LEFT JOIN agenda a ON a.teacher_id = t.id AND date_trunc('month', a.start_at) = date_trunc('month', now())
GROUP BY t.id
ORDER BY t.nome;
```

**Distribuição de carga:** cards de ranking calculados client-side a partir da lista. Ver `design: screens-professores.jsx` → `RankingCard`.

---

## §8.2 — Criar/Editar Professor

**Componente design:** `ProfessorFormModal`

**Campos:** nome*, email*, telefone, valor_hora, forma_pagamento, obs_financeiras, status (só na edição).

**Ação (criar):**
```
→ INSERT INTO teachers (nome, email, telefone, valor_hora, forma_pagamento, obs_financeiras, status='Ativo')
→ Criar user via Supabase Admin API (se não existir): senha temporária + email (algoritmo em 00-decisoes-e-divergencias.md §0.6)
→ INSERT INTO users_profile (id, nome, perfil='Professor', precisa_trocar_senha=true)
→ sendEmail({ template: 'boas_vindas' })
  ⚠️ Falha de email NÃO interrompe a criação — registrar erro no log e retornar sucesso com aviso
→ insertAuditLog({ acao: 'Professor criado' })
```

**Ação (editar):**
```
UPDATE teachers SET nome, email, telefone, valor_hora, forma_pagamento, obs_financeiras, status
→ UPDATE users_profile SET nome, email WHERE id = teacher.user_id
→ insertAuditLog({ acao: 'Professor editado', dados_antes, dados_depois })
```

---

## §8.3 — Detalhe do Professor

**Componente design:** `ProfessorDetailModal`

**Dados adicionais:** lista de alunos do professor + KPI de pagamento (teacher_payments).

**Inativar/Reativar:** soft delete com confirmação inline. Ver design: botões na barra de ações do modal.

**⚠️ Coluna Mensalidade na tabela de alunos do professor:** `ProfessorDetailModal` exibe a mensalidade dos alunos — isso é intencional. Este modal é acessado exclusivamente por Admin e Secretário (não pelo Professor), portanto a exibição de mensalidade é permitida conforme PRD §3.2.
