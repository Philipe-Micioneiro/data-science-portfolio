# §1 — Stack e Estrutura Geral

## §1.1 — Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14+ (App Router, TypeScript) |
| Estilos | Tailwind CSS — tokens mapeados de `index.html` do design |
| Backend/DB | Supabase (Postgres + Auth + Storage + Realtime) |
| Email | Brevo SMTP (fallback Gmail SMTP) |
| Deploy | Vercel (frontend) + Supabase (backend) |
| Cron | Vercel Cron Jobs (inativação automática diária) |

---

## §1.2 — Estrutura de Pastas Next.js

```
app/
  (auth)/
    login/                     ← LoginScreen
    primeiro-acesso/           ← PrimeiroAcessoScreen
    recuperar-senha/           ← EsqueciSenhaModal como tela
    redefinir-senha/           ← RedefinirSenhaScreen / TokenExpiradoScreen
  (app)/
    layout.tsx                 ← Sidebar + Topbar (design: layout.jsx)
    dashboard/
    usuarios/
    alunos/
    professores/
    agenda/
    financeiro/
    financeiro-professores/
    validacoes/
    auditoria/
    relatorios/
    configuracoes/
    conta/
  api/
    auth/
    upload/
      comprovante/             ← Server Action: hash SHA256 + upload
    cron/
      inativacao/              ← Vercel Cron: inativação automática
    email/                     ← Brevo SMTP dispatcher
middleware.ts                  ← Auth guard + redirect por perfil
lib/
  supabase/
    client.ts                  ← Browser client
    server.ts                  ← Server client (Server Components/Actions)
    admin.ts                   ← Admin client (Supabase Admin API)
  audit.ts                     ← insertAuditLog helper
  email.ts                     ← sendEmail helper (Brevo)
  sha256.ts                    ← calcSHA256 (Web Crypto API)
components/
  ui/                          ← Primitivos (mapeados de ui.jsx do design)
  layout/                      ← Sidebar, Topbar (mapeados de layout.jsx)
  [modulo]/                    ← Componentes por módulo
```

---

## §1.3 — Design Tokens → Tailwind

Todos os tokens CSS definidos em:
**`design: index.html`** → seção `:root { ... }` e `[data-theme="dark"] { ... }`

Mapear no `tailwind.config.ts` e `globals.css`. Não inventar valores — usar exatamente os tokens do design.

---

## §1.4 — Perfis e Navegação

**Fonte de verdade:** `design: layout.jsx` — objeto `NAV`

| Perfil | Rotas permitidas |
|--------|----------------|
| Administrador | dashboard, usuarios, alunos, professores, agenda, financeiro, financeiroProf, validacoes, auditoria, relatorios, config |
| Secretário | dashboard, alunos, professores, agenda, financeiro, financeiroProf, validacoes, relatorios |
| Professor | dashboard (meus alunos), agenda (minha agenda), conta |
