# §10 — Módulo: Financeiro (Alunos)

**Design:** `screens-finance.jsx`
**Rota:** `/financeiro` (Admin vê KPIs globais; Secretário não vê KPIs financeiros)

---

## §10.1 — Listagem de Pagamentos

**Componente design:** `FinanceiroScreen`

**Dados:**
```sql
SELECT p.*, s.nome AS aluno_nome, pr.arquivo_url AS comprovante_url
FROM payments p
JOIN students s ON s.id = p.student_id
LEFT JOIN payment_receipts pr ON pr.payment_id = p.id
ORDER BY p.competencia_date DESC, p.criado_em DESC;
```

**KPIs financeiros (apenas Admin):**
```sql
SELECT
  SUM(valor_previsto) AS receita_prevista,
  SUM(CASE WHEN status='Pago' THEN valor_pago ELSE 0 END) AS receita_recebida,
  SUM(CASE WHEN status='Atrasado' THEN valor_previsto ELSE 0 END) AS inadimplencia
FROM payments
WHERE competencia_date = date_trunc('month', now());
```
Não executar esta query para Secretário. Controlar via verificação de perfil no Server Component.

**Filtros:** status, forma de pagamento, busca por aluno — server-side com query params ou client-side.

**Export:** `exportCSV` / `exportXLSX` do design (`design: ui.jsx`). Respeitar filtros ativos.
`insertAuditLog({ acao: 'Relatório exportado', dados_depois: { filtros, total } })`.

---

## §10.2 — Registrar Pagamento

**Componente design:** `RegistrarPagamentoModal`

**Fluxo (3 etapas do design):**

**Etapa 1 — Localizar aluno:** busca por nome. Query:
```sql
SELECT id, nome, plano, valor_mensalidade FROM students WHERE nome ILIKE '%query%' AND status != 'Inativo' LIMIT 6;
```

**Etapa 2 — Forma de pagamento:** Cartão / PIX / Boleto (toggle visual, sem query).

**Etapa 3 — Comprovante** (`ComprovanteUploader`):

Ver `design: screens-finance.jsx` → `ComprovanteUploader` para os 4 estados exatos de UI:
- `idle` → área de upload (dashed border)
- `verificando` → spinner com texto SHA256
- `aprovado` → arquivo com hash truncado exibido
- `duplicata` → erro contextual vermelho com nome do aluno original

**Server Action de upload:**
```
POST /api/upload/comprovante
1. calcSHA256(file) no client → enviar hash junto com arquivo
2. SELECT pr.id, pr.payment_id, p.competencia, s.nome AS aluno_nome
   FROM payment_receipts pr
   JOIN payments p ON p.id = pr.payment_id
   JOIN students s ON s.id = p.student_id
   WHERE pr.hash_sha256 = hash
   → Se existir: retornar { error: 'DUPLICATE_HASH', context: { alunoNome, competencia } }
     ⚠️ Ver mensagem exata em 00-decisoes-e-divergencias.md §0.7
     Registrar: insertAuditLog({ acao: 'Tentativa de hash duplicado', dados_depois: { hash, alunoNome, competencia } })
   → Se não: continuar
3. Validar MIME type server-side: aceitar apenas image/png, image/jpeg, application/pdf
4. supabase.storage.from('comprovantes').upload(path, file)
   path = comprovantes/{payment_id}/{hash_sha256}.{ext}
5. INSERT INTO payment_receipts (payment_id, arquivo_url, hash_sha256, formato, enviado_por)
6. Retornar { success: true, hash }
```

**Ação final (Registrar):**
```
INSERT INTO payments (student_id, competencia, competencia_date, valor_previsto, forma_pagamento, vencimento, status, criado_por)
→ status = forma === 'Cartão' ? 'Pago' : 'Pendente de Validação'
→ Se 'Pago': UPDATE students SET status='Ativo'
→ Comprovante obrigatório para PIX e Boleto; opcional para Cartão (verificação server-side)
→ Pagamento parcial PROIBIDO para alunos: valor_pago deve = valor_previsto (verificação server-side)
→ insertAuditLog({ acao: 'Pagamento registrado' })
→ Toast correspondente ao status gerado
```

---

## §10.3 — Validação de Comprovantes

**Design:** `ValidacoesScreen`
**Rota:** `/validacoes`

**Layout:** painel duplo — fila à esquerda (320px) + detalhe à direita. Ver design exato.

**Dados:**
```sql
SELECT p.*, s.nome AS aluno_nome, pr.arquivo_url
FROM payments p
JOIN students s ON s.id = p.student_id
LEFT JOIN payment_receipts pr ON pr.payment_id = p.id
WHERE p.status = 'Pendente de Validação'
ORDER BY p.criado_em ASC;
```

**Aprovar pagamento:**
```
UPDATE payments SET status='Pago', aprovado_por=auth.uid(), aprovado_em=now() WHERE id = payment_id
→ UPDATE students SET status='Ativo' WHERE id = payment.student_id
→ insertAuditLog({ acao: 'Comprovante aprovado', entidade: 'Financeiro' })
→ Toast: "Comprovante aprovado · aluno marcado como Ativo."
→ Remover da fila → selecionar próximo item automaticamente
```

**Rejeitar pagamento** → abre `RejeicaoModal`:

Ver `design: screens-finance.jsx` → `RejeicaoModal`:
- Campo de motivo obrigatório (mín. 20 caracteres)
- Contador de caracteres com cor dinâmica
- Botão "Confirmar rejeição" disabled até atingir mínimo

```
UPDATE payments SET status='Atrasado', motivo_rejeicao=motivo WHERE id = payment_id
→ Buscar email: SELECT email FROM students WHERE id = payment.student_id
   ⚠️ Usar students.email — NÃO users_profile.email
   O aluno NÃO possui conta de login; seu email está em students.email
→ sendEmail({ template: 'rejeicao_comprovante', to: student.email, motivo })
→ insertAuditLog({ acao: 'Comprovante rejeitado', dados_depois: { motivo } })
→ Toast: "Comprovante rejeitado. Aluno notificado."
```
