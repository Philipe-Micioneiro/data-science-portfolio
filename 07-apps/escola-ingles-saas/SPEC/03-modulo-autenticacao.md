# §3 — Módulo: Autenticação

**Design:** `screens-auth.jsx`

---

## §3.1 — Tela de Login — `/login`

**Componente design:** `LoginScreen`

**Fluxo:**
```
Input: email + senha
→ supabase.auth.signInWithPassword({ email, password })
→ Erro: exibir mensagem (design: bloco vermelho com ícone)
→ Sucesso: verificar users_profile.precisa_trocar_senha
  → true: redirect /primeiro-acesso
  → false: redirect /dashboard
→ Registrar na auditoria: acao='Login realizado'
```

**Estados de UI do design:** erro inline (bloco `--red-bg`), loading com ícone spin, show/hide senha.

**DemoAccordion:** remover em produção. Ver `00-decisoes-e-divergencias.md §0.5`.

**Supabase Auth:** `signInWithPassword` — sem configuração especial.

---

## §3.2 — Primeiro Acesso — `/primeiro-acesso`

**Componente design:** `PrimeiroAcessoScreen`

**Fluxo:**
```
Input: senha_temporária + nova_senha + confirmar_senha
→ Validar senha_temporária: supabase.auth.signInWithPassword com a temporária
→ Validar regras de nova_senha (frontend + backend):
  - mín 8 chars, 1 maiúscula, 1 minúscula, 1 número
  - Validação em tempo real: checklist visual (design: grid 2 colunas com ícones)
→ supabase.auth.updateUser({ password: nova_senha })
→ UPDATE users_profile SET precisa_trocar_senha = false
→ Registrar auditoria: acao='Troca de senha no primeiro acesso'
→ Redirect /dashboard
```

**Regra:** campo "Senha temporária" valida que o usuário conhece a senha anterior antes de redefinir.

---

## §3.3 — Recuperação de Senha

**Componentes design:** `EsqueciSenhaModal`, `RedefinirSenhaScreen`, `TokenExpiradoScreen`

**Fluxo 1 — Solicitar link:**
```
EsqueciSenhaModal (modal inline no LoginScreen)
→ Input: email
→ supabase.auth.resetPasswordForEmail(email, { redirectTo: '/redefinir-senha' })
→ Email enviado via Brevo (Supabase aciona o envio; configurar template no Supabase Auth)
→ Toast: "Link enviado. Verifique sua caixa de entrada."
→ Registrar auditoria: acao='Recuperação de senha solicitada'
```

**Fluxo 2 — Redefinir senha:** `/redefinir-senha?code=xxx`
```
RedefinirSenhaScreen
→ Supabase trata o token via exchangeCodeForSession (PKCE flow)
→ Token inválido/expirado → exibir TokenExpiradoScreen
→ Token válido → formulário de nova_senha com checklist visual
→ supabase.auth.updateUser({ password: nova_senha })
→ Registrar auditoria: acao='Senha redefinida via recuperação'
→ Redirect /login com toast de sucesso
```
