# §5 — Módulo: Dashboard

**Design:** `screens-dashboard.jsx`

---

## §5.1 — Admin Dashboard — `/dashboard` (perfil Admin)

**Componente design:** `AdminDashboard`

**Dados necessários (queries paralelas):**

| Dado | Query |
|------|-------|
| KPIs operacionais | `SELECT status, COUNT(*) FROM students GROUP BY status` |
| Financeiro do mês | `SELECT SUM(valor_previsto), SUM(CASE WHEN status='Pago' THEN valor_pago END), SUM(CASE WHEN status='Atrasado' THEN valor_previsto END) FROM payments WHERE competencia_date = date_trunc('month', now())` |
| Série histórica alunos | `SELECT DATE_TRUNC('month', criado_em) AS mes, COUNT(*) FROM students GROUP BY mes ORDER BY mes DESC LIMIT 12` |
| Série histórica financeiro | `SELECT competencia_date, SUM(valor_previsto) AS prevista, SUM(CASE WHEN status='Pago' THEN valor_pago END) AS recebida FROM payments GROUP BY competencia_date ORDER BY competencia_date DESC LIMIT 12` |
| Widget Próximos vencimentos | `SELECT p.*, s.nome FROM payments p JOIN students s ON s.id = p.student_id WHERE p.status != 'Pago' AND p.vencimento BETWEEN now() AND now() + interval '10 days' ORDER BY p.vencimento LIMIT 6` |
| Widget Pagamentos pendentes | `SELECT p.*, s.nome FROM payments p JOIN students s ON s.id = p.student_id WHERE p.status = 'Pendente de Validação' ORDER BY p.criado_em DESC LIMIT 6` |
| Widget Últimas validações | Últimos 6 registros de `audit_logs` onde `acao IN ('Comprovante aprovado', 'Comprovante rejeitado')` |
| Widget Risco inativação | `SELECT * FROM students WHERE status = 'Atrasado' AND status_atrasado_desde < now() - interval '20 days' ORDER BY status_atrasado_desde ASC LIMIT 6` |

**Gráficos:** LineChart e BarsChart são SVG puros. Ver implementação exata em `design: ui.jsx`. Não usar biblioteca externa — replicar fielmente. Ver `16-componentes-ui.md`.

**Ações:** KPI cards clicáveis navegam para `/alunos?status=X` ou `/validacoes`. Widget "Risco de Inativação" navega para `/alunos?status=Risco`. Sem mutação de dados.

---

## §5.2 — Secretaria Dashboard — `/dashboard` (perfil Secretário)

**Componente design:** `SecretariaDashboard`

**Diferença do Admin:** sem KPIs financeiros (sem receita, sem inadimplência). Apenas contadores operacionais de alunos.

**Dados:** subset das queries do Admin — apenas KPIs operacionais + widgets de pendentes, vencimentos, risco e validações.

**RLS:** a query de `finance` não deve ser executada para Secretário. Controlar no Server Component via verificação de perfil.

---

## §5.3 — Professor Dashboard — `/dashboard` (perfil Professor)

**Componente design:** `ProfessorDashboard`, `ProfessorAlunosTable`

**Dados:**
```sql
-- Apenas alunos do professor logado
SELECT s.* FROM students s
JOIN student_teachers st ON st.student_id = s.id
JOIN teachers t ON t.id = st.teacher_id
WHERE t.user_id = auth.uid();
```

**Regra crítica:** a tabela de alunos não inclui colunas financeiras (sem mensalidade, sem status financeiro).
Ver `design: screens-dashboard.jsx` → `ProfessorAlunosTable`: colunas são Nome, Nível, Plano, Carga horária, Entrada, Status.

**RLS:** professores acessam APENAS alunos via `student_teachers`. Ver `17-banco-de-dados-schema.md §17.3`.
