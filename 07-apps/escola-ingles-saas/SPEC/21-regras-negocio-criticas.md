# §21 — Regras de Negócio Críticas para Implementação

> Estas regras devem ser verificadas **no servidor** (Server Actions / RLS) — nunca apenas no frontend.

---

| Regra | Onde verificar |
|-------|---------------|
| Comprovante obrigatório (PIX/Boleto) | Server Action de criação de payment |
| Hash SHA256 único | `payment_receipts.hash_sha256` UNIQUE INDEX |
| Validação de MIME type no upload | Server Action — aceitar apenas image/png, image/jpeg, application/pdf |
| Pagamento parcial proibido para alunos | Server Action: `valor_pago` deve igual `valor_previsto` |
| Pagamento parcial permitido para professores | Sem restrição |
| Admin não pode inativar a si mesmo | Server Action com verificação de `auth.uid()` |
| Aluno inativo não pode ser agendado | Server Action de criação de agenda |
| Perfil de usuário não é editável | Coluna `perfil` sem UPDATE na policy do Secretário |
| Auditoria imutável | RLS: sem UPDATE, sem DELETE em `audit_logs` |
| Professor só vê seus alunos | RLS via `student_teachers` |
| Secretário não vê métricas financeiras globais | Controle no Server Component (não executar query) |
| Email de rejeição vai para `students.email` | NÃO usar `users_profile.email` — aluno não tem conta |
