# §2 — Middleware de Autenticação

**Arquivo:** `middleware.ts`

## Lógica

1. Rotas públicas (`/login`, `/recuperar-senha`, `/redefinir-senha`) → sem verificação
2. Sem sessão Supabase → redirect `/login`
3. `precisa_trocar_senha = true` e rota não é `/primeiro-acesso` → redirect `/primeiro-acesso`
4. Rota pertence a perfil não autorizado → redirect `/dashboard`

## Rotas Restritas por Perfil

- **Apenas Admin:** `/usuarios`, `/auditoria`, `/configuracoes`
- **Admin + Secretário:** `/alunos`, `/professores`, `/agenda`, `/financeiro`, `/financeiro-professores`, `/validacoes`, `/relatorios`
- **Bloqueado para Professor:** tudo exceto `/dashboard`, `/agenda`, `/conta`

> ⚠️ Em `/relatorios`, controlar visibilidade do card "Trilha de auditoria" no Server Component via `perfil === 'Administrador'` — o Middleware permite acesso para Secretário, mas o card é ocultado para ele.

**Ver decisão §0.3 em `00-decisoes-e-divergencias.md`** para a regra de acesso do Secretário em `/relatorios`.

## Implementação

Usar `supabase.auth.getSession()` no middleware com cookie do Next.js.
