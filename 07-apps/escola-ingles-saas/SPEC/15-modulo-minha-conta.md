# §15 — Módulo: Minha Conta

**Design:** `screens-audit.jsx` → `MinhaContaScreen`
**Rota:** `/conta`

> ⚠️ Campo "Idioma" deve ser **removido**. Ver `00-decisoes-e-divergencias.md §0.5`.

---

## Dados

Perfil atual do usuário logado (da sessão). Sem query adicional além da sessão.

## Ação — Atualizar Dados Pessoais

```
UPDATE teachers SET nome, telefone WHERE user_id = auth.uid()  ← apenas para Professor
UPDATE users_profile SET nome WHERE id = auth.uid()
supabase.auth.updateUser({ email: novo_email })  ← se email mudou
→ insertAuditLog({ acao: 'Dados pessoais atualizados' })
→ Toast: "Alterações salvas."
```

## Ação — Trocar Senha

```
→ Validar senha atual: supabase.auth.signInWithPassword({ email, password: senhaAtual })
→ supabase.auth.updateUser({ password: nova_senha })
→ Checklist visual de validação em tempo real (mesmo padrão de 03-modulo-autenticacao.md §3.2)
→ insertAuditLog({ acao: 'Senha alterada' })
→ Toast: "Alterações salvas."
```
