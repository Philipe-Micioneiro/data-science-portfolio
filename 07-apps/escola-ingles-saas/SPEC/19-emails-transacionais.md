# §19 — Emails Transacionais

**Provider:** Brevo SMTP. Configurar em `lib/email.ts`.

> ⚠️ Falha de email NÃO deve interromper a ação principal — registrar erro no log e retornar sucesso com aviso ao frontend.

---

## Templates

| Template | Gatilho | Quem recebe |
|---------|---------|------------|
| `boas_vindas` | Criação de usuário ou professor | Novo usuário (email de login) |
| `recuperacao_senha` | Esqueci minha senha | Usuário solicitante — configurar como template customizado no Supabase Auth usando Brevo SMTP |
| `rejeicao_comprovante` | Rejeição de comprovante | Aluno — **usar `students.email`, não `users_profile.email`** |
| `lembrete_vencimento` | Dia do vencimento (PIX/Boleto não pagos) | Aluno |
| `cobranca_pos_vencimento` | Diariamente pós-vencimento | Aluno inadimplente |

---

## Lembretes e Cobranças (Vercel Cron)

Disparar via Vercel Cron + query de vencimentos do dia.

**Lembrete de vencimento:**
```sql
SELECT p.*, s.email, s.nome FROM payments p
JOIN students s ON s.id = p.student_id
WHERE p.vencimento = CURRENT_DATE
AND p.status != 'Pago'
AND p.forma_pagamento IN ('PIX', 'Boleto')
```

**Cobrança pós-vencimento:**
```sql
SELECT p.*, s.email, s.nome FROM payments p
JOIN students s ON s.id = p.student_id
WHERE p.vencimento < CURRENT_DATE
AND p.status = 'Atrasado'
```

Registrar `insertAuditLog({ acao: 'Email enviado', dados_depois: { template, aluno_id } })` para cada email.
