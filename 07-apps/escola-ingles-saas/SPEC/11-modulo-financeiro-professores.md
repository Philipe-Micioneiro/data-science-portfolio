# §11 — Módulo: Financeiro de Professores

**Design:** `screens-finance-prof.jsx`
**Rota:** `/financeiro-professores` (Admin, Secretário)

---

## §11.1 — Listagem

**Componente design:** `FinanceiroProfScreen`

**Dados:**
```sql
SELECT tp.*, t.nome AS professor, t.valor_hora, t.forma_pagamento,
  COUNT(a.id) AS aulas, SUM(a.duracao_min / 60.0) AS horas
FROM teacher_payments tp
JOIN teachers t ON t.id = tp.teacher_id
LEFT JOIN agenda a ON a.teacher_id = t.id AND a.status = 'Realizada'
  AND date_trunc('month', a.start_at) = date_trunc('month', now())
WHERE tp.competencia = [mes_atual]
GROUP BY tp.id, t.id
ORDER BY t.nome;
```

**KPIs:** total a pagar, total pago, total pendente — calculados da lista.

---

## §11.2 — Registrar Pagamento ao Professor

**Componente design:** `PagarProfModal`

**Diferença dos alunos:** pagamento parcial é **permitido** para professores.

**Ação:**
```
UPDATE teacher_payments SET
  valor_pago = valor_pago + valor_novo,
  status = CASE
    WHEN valor_pago + valor_novo >= valor_devido THEN 'Pago'
    WHEN valor_pago + valor_novo > 0 THEN 'Parcial'
    ELSE 'Pendente'
  END
WHERE id = teacher_payment_id
→ insertAuditLog({ acao: 'Pagamento professor registrado' })
→ Toast com valor pago formatado em R$
```
