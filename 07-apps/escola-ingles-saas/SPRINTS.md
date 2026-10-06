# SPRINTS — English School Manager
## Versão 2.0 — 05/06/2026

> **Como usar este arquivo:**
> Cada sprint lista os arquivos SPEC exatos que o agente deve consultar, as features a implementar e os critérios de aceite.
> O orquestrador deve ler o **Mapa de Dependências** antes de lançar sprints para identificar quais podem ser paralelizadas.
>
> **Estrutura de referência:**
> - Arquivos SPEC: `SPEC/` (pasta com um arquivo por módulo)
> - Arquivos de design: `English School SaaS-handoff/english-school-saas/project/`
> - PRD: `PRD.md`
> - Decisões transversais: `SPEC/00-decisoes-e-divergencias.md` — **leitura obrigatória antes de qualquer sprint**
>
> **Agentes disponíveis:**
> - `nextjs-developer` — implementação Next.js + Supabase
> - `code-reviewer` — revisão de código (Opus), qualidade e segurança

---

## Mapa de Dependências e Paralelismo

```
Sprint 0 (Fundação)
  ├── Sprint 1A (Autenticação)        ← paralela com 1B
  ├── Sprint 1B (Layout + UI Prims)   ← paralela com 1A
  │     └── Sprint 2A (Dashboard)     ← depende de 1A + 1B
  │     └── Sprint 2B (Usuários)      ← depende de 1A + 1B │ paralela com 2A, 2C
  │     └── Sprint 2C (Professores)   ← depende de 1A + 1B │ paralela com 2A, 2B
  │           └── Sprint 3A (Alunos)  ← depende de 2C
  │                 ├── Sprint 3B (Agenda)              ← depende de 3A
  │                 ├── Sprint 4A (Financeiro Alunos)   ← depende de 3A │ paralela com 3B
  │                 │     └── Sprint 4B (Fin. Professores) ← depende de 2C + 3B
  │                 │           └── Sprint 5 (Auditoria/Relatórios/Config/Conta) ← depende de 4A + 4B
  │                 │                 └── Sprint 6 (Emails + Cron Jobs) ← depende de 5
  │                 │                       └── Sprint 7 (Code Review Final) ← depende de tudo
```

**Grupos paralelizáveis:**

| Rodada | Sprints simultâneas |
|--------|---------------------|
| 1 | Sprint 0 |
| 2 | Sprint 1A + Sprint 1B |
| 3 | Sprint 2A + Sprint 2B + Sprint 2C |
| 4 | Sprint 3A |
| 5 | Sprint 3B + Sprint 4A |
| 6 | Sprint 4B |
| 7 | Sprint 5 |
| 8 | Sprint 6 |
| 9 | Sprint 7 |

---

## Sprint 0 — Fundação: Infraestrutura, Banco de Dados e Estrutura do Projeto

**Agente:** `nextjs-developer`

**Objetivo:** criar o esqueleto completo do projeto — banco de dados, projeto Next.js, design tokens e infraestrutura base — para que todas as sprints seguintes possam ser implementadas sem bloqueios de infraestrutura.

**Arquivos SPEC obrigatórios para esta sprint:**
- `SPEC/00-decisoes-e-divergencias.md` — decisões transversais (ler primeiro, sempre)
- `SPEC/01-stack-e-estrutura-geral.md` — estrutura de pastas, stack, design tokens
- `SPEC/02-middleware-autenticacao.md` — lógica de guard e redirects
- `SPEC/17-banco-de-dados-schema.md` — schema completo, índices, RLS, get_perfil()
- `SPEC/18-storage-comprovantes.md` — criação do bucket
- `SPEC/20-auditoria-helper.md` — interface insertAuditLog

**Arquivos de design relevantes:** `index.html` (tokens CSS), `layout.jsx` (objeto NAV)

---

### Features

#### F0.1 — Projeto Next.js inicializado

**Critérios de aceite:**
- [ ] `npx create-next-app` com TypeScript, App Router, Tailwind, ESLint
- [ ] Estrutura de pastas exata conforme `SPEC/01-stack-e-estrutura-geral.md §1.2` criada: `app/(auth)/`, `app/(app)/`, `app/api/`, `lib/`, `components/ui/`, `components/layout/`, `components/[modulo]/`
- [ ] `tsconfig.json` com `strict: true`
- [ ] `next.config.ts` configurado para Vercel
- [ ] `.env.example` com todas as variáveis: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_SMTP_*`
- [ ] `vercel.json` com configuração de Cron Jobs (cron diário às 02:00 UTC para rota `/api/cron/inativacao`)

---

#### F0.2 — Design tokens mapeados no Tailwind

**Critérios de aceite:**
- [ ] Todos os tokens da seção `:root { ... }` e `[data-theme="dark"] { ... }` do arquivo `index.html` do design mapeados em `tailwind.config.ts` → `theme.extend.colors`
- [ ] `globals.css` importa os tokens via variáveis CSS
- [ ] Dark mode configurado com `data-theme` attribute no `<html>` (não com classe)
- [ ] Nenhum valor de cor hardcoded nos componentes — tudo via tokens

---

#### F0.3 — Banco de dados Supabase: schema completo

**Referência:** `SPEC/17-banco-de-dados-schema.md §17.1`

**Critérios de aceite:**
- [ ] Tabela `users_profile` criada com: `id` (FK auth.users), `nome`, `perfil` (enum: Administrador/Secretário/Professor), `status`, `precisa_trocar_senha` (boolean, default true), `criado_em`, `atualizado_em`
- [ ] Tabela `students` com todos os campos incluindo `motivo_inativacao`, `status_atrasado_desde` (timestamptz nullable), `criado_por`
- [ ] Tabela `teachers` com: `nome`, `email`, `telefone`, `valor_hora`, `forma_pagamento`, `obs_financeiras`, `status`, `user_id` (FK auth.users nullable)
- [ ] Tabela `student_teachers` (N:N) com `student_id` + `teacher_id`
- [ ] Tabela `payments` com: `student_id`, `competencia`, `competencia_date`, `valor_previsto`, `valor_pago`, `forma_pagamento`, `vencimento`, `status`, `motivo_rejeicao`, `aprovado_por`, `aprovado_em`, `criado_por`, `criado_em`
- [ ] Tabela `payment_receipts` com: `payment_id`, `arquivo_url`, `hash_sha256` (UNIQUE), `formato`, `enviado_por`, `criado_em`
- [ ] Tabela `audit_logs` com: `usuario_id` (nullable), `perfil`, `acao`, `entidade`, `entidade_id`, `dados_antes` (jsonb), `dados_depois` (jsonb), `ip`, `user_agent`, `criado_em`
- [ ] Tabela `agenda` com: `student_id`, `teacher_id`, `start_at`, `duracao_min`, `observacoes`, `status` (enum: Agendada/Realizada/Cancelada), `criado_por`, `criado_em`
- [ ] Tabela `teacher_payments` com: `teacher_id`, `competencia`, `valor_devido`, `valor_pago`, `status` (enum: Pendente/Parcial/Pago), `criado_em`
- [ ] Tabela `school_config` criada com SQL exato de `SPEC/17-banco-de-dados-schema.md §17.1` (linha única, check `id = 1`), com INSERT inicial
- [ ] Todos os 7 índices críticos de `SPEC/17-banco-de-dados-schema.md §17.2` criados

---

#### F0.4 — RLS policies em todas as tabelas

**Referência:** `SPEC/17-banco-de-dados-schema.md §17.3`

**Critérios de aceite:**
- [ ] Função `public.get_perfil()` criada conforme SQL de `SPEC/17-banco-de-dados-schema.md §17.3`
- [ ] RLS habilitado em todas as tabelas públicas
- [ ] `students`: Admin/Secretário full; Professor apenas SELECT via `student_teachers`
- [ ] `payments` + `payment_receipts`: Admin/Secretário full; Professor sem acesso
- [ ] `teachers`: Admin/Secretário full; Professor SELECT apenas próprio registro
- [ ] `audit_logs`: Admin SELECT+INSERT; Secretário e Professor apenas INSERT via função server-side
- [ ] `users_profile`: Admin full; Secretário SELECT com policy `users_profile_readonly_names`; Professor SELECT próprio — avaliar e documentar no migration se criar view restrita com apenas `id` e `nome`
- [ ] `agenda`: Admin/Secretário full; Professor full apenas eventos próprios via `teacher_id`
- [ ] `teacher_payments`: Admin/Secretário full; Professor sem acesso
- [ ] `school_config`: apenas Admin (`get_perfil() = 'Administrador'`)
- [ ] Nenhuma tabela acessível sem autenticação

---

#### F0.5 — Clientes Supabase e helpers base

**Referência:** `SPEC/20-auditoria-helper.md`, `SPEC/18-storage-comprovantes.md`

**Critérios de aceite:**
- [ ] `lib/supabase/client.ts` — browser client com `createBrowserClient`
- [ ] `lib/supabase/server.ts` — server client com `createServerClient` usando cookies do Next.js
- [ ] `lib/supabase/admin.ts` — admin client com `SUPABASE_SERVICE_ROLE_KEY` (nunca exposto ao browser)
- [ ] `lib/audit.ts` — `insertAuditLog` com interface exata de `SPEC/20-auditoria-helper.md`; captura IP e UserAgent via `headers()` do Next.js
- [ ] `lib/email.ts` — `sendEmail` helper integrado ao Brevo SMTP; aceita `{ template, to, payload }`
- [ ] `lib/sha256.ts` — `calcSHA256(file: File): Promise<string>` usando Web Crypto API
- [ ] Storage bucket `comprovantes` criado como privado no Supabase

---

#### F0.6 — Middleware de autenticação

**Referência:** `SPEC/02-middleware-autenticacao.md`, `SPEC/00-decisoes-e-divergencias.md §0.3`

**Critérios de aceite:**
- [ ] Rotas públicas (`/login`, `/recuperar-senha`, `/redefinir-senha`) sem verificação
- [ ] Sem sessão Supabase → redirect `/login`
- [ ] `precisa_trocar_senha = true` e rota ≠ `/primeiro-acesso` → redirect `/primeiro-acesso`
- [ ] Rota pertence a perfil não autorizado → redirect `/dashboard`
- [ ] Rotas Admin-only (`/usuarios`, `/auditoria`, `/configuracoes`) bloqueadas para Secretário e Professor
- [ ] Rotas Admin+Secretário bloqueadas para Professor
- [ ] `/relatorios` acessível para Admin **e** Secretário (decisão `SPEC/00-decisoes-e-divergencias.md §0.3`)
- [ ] Professor acessa apenas `/dashboard`, `/agenda`, `/conta`
- [ ] Usar `supabase.auth.getSession()` com cookie do Next.js

---

## Sprint 1A — Autenticação

**Agente:** `nextjs-developer`
**Depende de:** Sprint 0

**Objetivo:** implementar todos os fluxos de autenticação: login, primeiro acesso, recuperação e redefinição de senha.

**Arquivos SPEC obrigatórios para esta sprint:**
- `SPEC/00-decisoes-e-divergencias.md §0.5` — elementos a remover (DemoAccordion)
- `SPEC/00-decisoes-e-divergencias.md §0.6` — algoritmo senha temporária (para validar Primeiro Acesso)
- `SPEC/03-modulo-autenticacao.md` — fluxos completos de Login, Primeiro Acesso, Recuperação

**Arquivos de design relevantes:** `screens-auth.jsx` (LoginScreen, PrimeiroAcessoScreen, EsqueciSenhaModal, RedefinirSenhaScreen, TokenExpiradoScreen)

---

### Features

#### F1A.1 — Tela de Login `/login`

**Critérios de aceite:**
- [ ] Formulário com campos email + senha, botão submit
- [ ] Estado de loading com ícone spin durante `signInWithPassword`
- [ ] Erro exibido como bloco vermelho com ícone (design `LoginScreen` → bloco `--red-bg`)
- [ ] Toggle show/hide senha funcional
- [ ] `DemoAccordion` **removido** (ver `SPEC/00-decisoes-e-divergencias.md §0.5`)
- [ ] Após login: verificar `precisa_trocar_senha` → redirect `/primeiro-acesso` ou `/dashboard`
- [ ] `insertAuditLog({ acao: 'Login realizado' })` após login bem-sucedido
- [ ] Layout visual pixel-perfect conforme `LoginScreen` do design

---

#### F1A.2 — Primeiro Acesso `/primeiro-acesso`

**Critérios de aceite:**
- [ ] Campos: senha temporária, nova senha, confirmar nova senha
- [ ] Checklist visual em grid 2 colunas com ícones de validação em tempo real (design `PrimeiroAcessoScreen`)
- [ ] Regras validadas em tempo real: mín. 8 chars, 1 maiúscula, 1 minúscula, 1 número
- [ ] Botão submit disabled enquanto checklist incompleto
- [ ] Ao submeter: valida senha temporária via `signInWithPassword`, depois `updateUser({ password })`
- [ ] `UPDATE users_profile SET precisa_trocar_senha = false`
- [ ] `insertAuditLog({ acao: 'Troca de senha no primeiro acesso' })`
- [ ] Redirect `/dashboard` após sucesso

---

#### F1A.3 — Recuperação de Senha

**Critérios de aceite:**
- [ ] `EsqueciSenhaModal` renderizado como modal inline na tela de Login (não rota separada)
- [ ] `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/redefinir-senha' })`
- [ ] Toast: "Link enviado. Verifique sua caixa de entrada."
- [ ] `insertAuditLog({ acao: 'Recuperação de senha solicitada' })`
- [ ] `/redefinir-senha` (`RedefinirSenhaScreen`): `exchangeCodeForSession` do Supabase (PKCE flow)
- [ ] Token inválido/expirado → exibir `TokenExpiradoScreen` com opção de solicitar novo link
- [ ] Token válido → formulário nova senha com checklist visual idêntico ao F1A.2
- [ ] `supabase.auth.updateUser({ password: nova_senha })`
- [ ] `insertAuditLog({ acao: 'Senha redefinida via recuperação' })`
- [ ] Redirect `/login` com toast de sucesso

---

## Sprint 1B — Layout Autenticado e Componentes UI Primitivos

**Agente:** `nextjs-developer`
**Depende de:** Sprint 0

**Objetivo:** implementar o shell de navegação (Sidebar + Topbar) e todos os componentes UI primitivos que serão usados por todas as sprints seguintes.

**Arquivos SPEC obrigatórios para esta sprint:**
- `SPEC/00-decisoes-e-divergencias.md §0.5` — ícone sino a remover, mock data a remover
- `SPEC/04-modulo-layout.md` — Sidebar, Topbar, badge Realtime, dark mode
- `SPEC/16-componentes-ui.md` — lista completa dos 13 primitivos e mapeamento do design

**Arquivos de design relevantes:** `layout.jsx` (Sidebar, Topbar, NAV), `ui.jsx` (todos os primitivos)

---

### Features

#### F1B.1 — Layout autenticado (Sidebar + Topbar)

**Critérios de aceite:**
- [ ] `app/(app)/layout.tsx` com Sidebar + Topbar + slot de conteúdo
- [ ] `Sidebar` renderiza navegação correta por perfil (objeto `NAV` de `layout.jsx`)
- [ ] Badge de "Validações" com `COUNT(*) FROM payments WHERE status = 'Pendente de Validação'`; atualização via Supabase Realtime subscription
- [ ] `Topbar` exibe `user.nome` e `user.perfil` da sessão
- [ ] Ícone de sino **removido** (ver `SPEC/00-decisoes-e-divergencias.md §0.5`)
- [ ] Toggle dark mode: persiste em `localStorage`, aplica `data-theme` no `<html>`
- [ ] Sidebar colapsável conforme comportamento do design
- [ ] Layout responsivo: sidebar oculta em mobile com menu hamburger

---

#### F1B.2 — Componentes UI primitivos (`components/ui/`)

**Referência completa:** `SPEC/16-componentes-ui.md`

**Critérios de aceite (um item por componente):**
- [ ] `Avatar.tsx` — cor determinística por nome usando função `avColor` de `ui.jsx`
- [ ] `StatusBadge.tsx` — estados: Ativo (verde), Atrasado (âmbar), Pendente de Validação (azul), Inativo (cinza), Pago (verde)
- [ ] `KpiCard.tsx` — suporta `onClick` para navegação; variantes de cor conforme design
- [ ] `Modal.tsx` — fecha com ESC + click no overlay; trap focus; animação conforme design
- [ ] `FilterChips.tsx` — chips selecionáveis com badge de contador
- [ ] `SearchInput.tsx` — input com ícone lupa, debounce 300ms
- [ ] `ExportMenu.tsx` — dropdown XLSX + CSV usando `exportCSV`/`exportXLSX` de `ui.jsx`
- [ ] `Toast.tsx` + hook `useToast()` — 3 tipos: ok/warn/err; auto-dismiss em 4s; empilhamento vertical
- [ ] `Empty.tsx` — estado vazio genérico com ícone e mensagem configuráveis
- [ ] `LineChart.tsx` — SVG puro replicado de `ui.jsx` (sem Recharts — ver `SPEC/22-decisoes-tecnicas-fixadas.md`)
- [ ] `BarsChart.tsx` — SVG puro replicado de `ui.jsx` (sem Recharts)
- [ ] `CardHead.tsx` — header de card com título + slot de ação
- [ ] `PerfilBadge.tsx` — cores: Administrador=azul, Secretário=cinza, Professor=verde

---

## Sprint 2A — Dashboard

**Agente:** `nextjs-developer`
**Depende de:** Sprint 1A + Sprint 1B

**Objetivo:** implementar o dashboard com as três variações por perfil (Admin, Secretário, Professor).

**Arquivos SPEC obrigatórios para esta sprint:**
- `SPEC/00-decisoes-e-divergencias.md §0.4` — campo status_atrasado_desde (widget Risco)
- `SPEC/05-modulo-dashboard.md` — queries completas dos 3 dashboards e regras de perfil
- `SPEC/16-componentes-ui.md` — LineChart, BarsChart (SVG puro)

**Arquivos de design relevantes:** `screens-dashboard.jsx` (AdminDashboard, SecretariaDashboard, ProfessorDashboard, ProfessorAlunosTable)

---

### Features

#### F2A.1 — Admin Dashboard

**Critérios de aceite:**
- [ ] KPI cards: total alunos, ativos, atrasados, inativos, receita do mês — queries paralelas via `Promise.all` (ver `SPEC/05-modulo-dashboard.md §5.1`)
- [ ] `LineChart` com série histórica de alunos (últimos 12 meses)
- [ ] `BarsChart` com série histórica financeira (receita prevista vs. recebida)
- [ ] Widget "Próximos Vencimentos": até 6 pagamentos com vencimento nos próximos 10 dias
- [ ] Widget "Pagamentos Pendentes de Validação": últimos 6, com link para `/validacoes`
- [ ] Widget "Últimas Validações": últimas 6 ações de audit_logs
- [ ] Widget "Risco de Inativação": alunos com `status_atrasado_desde < now() - 20 dias`
- [ ] KPI cards clicáveis: Ativo → `/alunos?status=Ativo`, Atrasado → `/alunos?status=Atrasado`, pendentes → `/validacoes`
- [ ] Widget "Risco de Inativação" clicável → `/alunos?status=Risco`

---

#### F2A.2 — Secretária Dashboard

**Critérios de aceite:**
- [ ] Sem KPIs financeiros: query de `payments` financeiro **não executada** para Secretário
- [ ] KPI cards operacionais: total alunos, ativos, atrasados, inativos
- [ ] Widgets: Pendentes de Validação, Próximos Vencimentos, Risco de Inativação
- [ ] Controle de visibilidade no Server Component via verificação de `perfil` — não via CSS

---

#### F2A.3 — Professor Dashboard

**Referência:** `SPEC/05-modulo-dashboard.md §5.3`

**Critérios de aceite:**
- [ ] `ProfessorAlunosTable`: apenas alunos vinculados ao professor logado via `student_teachers`
- [ ] Colunas: Nome, Nível, Plano, Carga horária, Entrada, Status — **sem colunas financeiras**
- [ ] KPI: contador de alunos ativos do professor
- [ ] Sem acesso a dados financeiros ou de outros professores (garantido por RLS de `SPEC/17-banco-de-dados-schema.md §17.3`)

---

## Sprint 2B — Módulo Usuários (Admin exclusivo)

**Agente:** `nextjs-developer`
**Depende de:** Sprint 1A + Sprint 1B

**Objetivo:** CRUD completo de usuários do sistema.

**Arquivos SPEC obrigatórios para esta sprint:**
- `SPEC/00-decisoes-e-divergencias.md §0.6` — algoritmo de senha temporária
- `SPEC/06-modulo-usuarios.md` — fluxos completos de listagem, criação, edição e reset

**Arquivos de design relevantes:** `screens-users.jsx` (UsuariosScreen, NovoUsuarioModal, EditarUsuarioModal, UsuarioDetailModal, TempPwBanner)

---

### Features

#### F2B.1 — Listagem de Usuários `/usuarios`

**Critérios de aceite:**
- [ ] Tabela: Nome, Perfil (PerfilBadge), Status, Último Acesso (de `auth.users.last_sign_in_at`)
- [ ] KPI cards calculados client-side: total, por perfil, inativos
- [ ] Filtro por perfil e busca por nome — client-side na lista carregada
- [ ] Rota protegida para Admin exclusivo

---

#### F2B.2 — Criar Usuário

**Referência:** `SPEC/06-modulo-usuarios.md §6.2`, `SPEC/00-decisoes-e-divergencias.md §0.6`

**Critérios de aceite:**
- [ ] `NovoUsuarioModal`: campos Nome, Email, Perfil (Secretário ou Professor apenas — sem opção Admin)
- [ ] Validações server-side: email único, nome obrigatório, perfil válido
- [ ] Server Action: `supabaseAdmin.auth.admin.createUser` → INSERT `users_profile` → `sendEmail({ template: 'boas_vindas' })`
- [ ] Senha temporária gerada pelo algoritmo exato de `SPEC/00-decisoes-e-divergencias.md §0.6`
- [ ] Falha no envio de email **não interrompe** a criação — registrar erro no log, retornar sucesso com aviso
- [ ] `TempPwBanner` exibido com senha e botão de copiar; modal não fecha automaticamente
- [ ] `insertAuditLog({ acao: 'Usuário criado' })`

---

#### F2B.3 — Editar Usuário

**Critérios de aceite:**
- [ ] `EditarUsuarioModal`: campos Nome, Email, Status — Perfil como badge read-only (não editável)
- [ ] Ao inativar: `supabase.auth.admin.updateUserById` com `ban_duration: 'none+'`
- [ ] Admin não pode inativar a si mesmo (verificação `usuario.id === auth.uid()` server-side)
- [ ] `insertAuditLog({ acao: 'Usuário editado', dados_antes, dados_depois })`

---

#### F2B.4 — Reset de Senha

**Critérios de aceite:**
- [ ] Botão "Resetar senha" no `UsuarioDetailModal`
- [ ] Server Action: `supabaseAdmin.auth.admin.updateUserById` com nova senha temp + `UPDATE users_profile SET precisa_trocar_senha = true`
- [ ] Nova senha exibida inline no modal em painel azul (conforme design)
- [ ] `insertAuditLog({ acao: 'Senha resetada pelo admin' })`

---

## Sprint 2C — Módulo Professores

**Agente:** `nextjs-developer`
**Depende de:** Sprint 1A + Sprint 1B

**Objetivo:** CRUD completo de professores com vínculo a usuários e visualização de carga.

**Arquivos SPEC obrigatórios para esta sprint:**
- `SPEC/00-decisoes-e-divergencias.md §0.6` — algoritmo de senha temporária
- `SPEC/08-modulo-professores.md` — queries, fluxos de criação/edição/detalhe

**Arquivos de design relevantes:** `screens-professores.jsx` (ProfessoresScreen, ProfessorFormModal, ProfessorDetailModal, RankingCard)

---

### Features

#### F2C.1 — Listagem de Professores `/professores`

**Referência:** `SPEC/08-modulo-professores.md §8.1`

**Critérios de aceite:**
- [ ] Tabela com: Nome, Email, Qtd. alunos, Aulas no mês, Aulas realizadas
- [ ] Query com JOINs em `student_teachers` e `agenda` conforme SPEC
- [ ] `RankingCard` de distribuição de carga calculado client-side
- [ ] Busca por nome (client-side)

---

#### F2C.2 — Criar Professor

**Referência:** `SPEC/08-modulo-professores.md §8.2`, `SPEC/00-decisoes-e-divergencias.md §0.6`

**Critérios de aceite:**
- [ ] `ProfessorFormModal` com campos: nome*, email*, telefone, valor_hora, forma_pagamento, obs_financeiras
- [ ] Server Action: INSERT `teachers` → criar usuário (`supabaseAdmin`) → INSERT `users_profile` com `perfil='Professor'` → `sendEmail({ template: 'boas_vindas' })`
- [ ] Senha temporária gerada pelo algoritmo de `SPEC/00-decisoes-e-divergencias.md §0.6`
- [ ] Falha no envio de email **não interrompe** a criação
- [ ] `insertAuditLog({ acao: 'Professor criado' })`

---

#### F2C.3 — Editar Professor

**Critérios de aceite:**
- [ ] Mesmo modal em modo edição com campo `status` visível
- [ ] Server Action: UPDATE `teachers` → UPDATE `users_profile` (nome, email)
- [ ] `insertAuditLog({ acao: 'Professor editado', dados_antes, dados_depois })`

---

#### F2C.4 — Detalhe do Professor

**Referência:** `SPEC/08-modulo-professores.md §8.3`

**Critérios de aceite:**
- [ ] `ProfessorDetailModal`: dados do professor, lista de alunos com mensalidade (permitido — acesso apenas Admin/Secretário)
- [ ] KPI de pagamentos do professor (`teacher_payments`)
- [ ] Inativar/Reativar com confirmação inline: `UPDATE teachers SET status='Inativo'/'Ativo'`
- [ ] `insertAuditLog` em ambas as ações

---

## Sprint 3A — Módulo Alunos

**Agente:** `nextjs-developer`
**Depende de:** Sprint 2C

**Objetivo:** CRUD completo de alunos com filtros avançados, vinculação a professores, inativação manual e cron de inativação automática.

**Arquivos SPEC obrigatórios para esta sprint:**
- `SPEC/00-decisoes-e-divergencias.md §0.2` — bloqueio de agendamento (Inativo vs Atrasado)
- `SPEC/00-decisoes-e-divergencias.md §0.4` — campo status_atrasado_desde
- `SPEC/07-modulo-alunos.md` — queries, fluxos completos, lógica de status_atrasado_desde, cron

**Arquivos de design relevantes:** `screens-students.jsx` (AlunosScreen, NovoAlunoModal, AlunoDetail, InativarAlunoModal)

---

### Features

#### F3A.1 — Listagem de Alunos com Filtros `/alunos`

**Referência:** `SPEC/07-modulo-alunos.md §7.1`

**Critérios de aceite:**
- [ ] Tabela com: Nome, Professores (badges), Plano, Nível, Vencimento, Mensalidade, Status
- [ ] Query com JOIN em `student_teachers` e `teachers`
- [ ] FilterChips: Todos / Ativo / Atrasado / Pendente de Validação / Inativo / **Risco**
- [ ] Chip "Risco" usa `status_atrasado_desde < now() - interval '20 days'` (não `atualizado_em`)
- [ ] Query param `?status=Risco` ativa automaticamente o chip Risco
- [ ] Filtro por professor e busca por nome/email/telefone (case insensitive)
- [ ] Export CSV e XLSX respeitando filtros ativos → `insertAuditLog({ acao: 'Base de alunos exportada' })`
- [ ] Suporte a `?status=X` para deep link a partir do Dashboard

---

#### F3A.2 — Cadastro de Aluno

**Referência:** `SPEC/07-modulo-alunos.md §7.2`

**Critérios de aceite:**
- [ ] `NovoAlunoModal` com campos obrigatórios: nome*, telefone*, professor(es)*
- [ ] `MultiProfessorPicker`: seleção múltipla com badges removíveis (conforme design)
- [ ] Botão submit disabled até obrigatórios preenchidos
- [ ] Server Action: INSERT `students` (status='Ativo') → INSERT `student_teachers` → `insertAuditLog({ acao: 'Aluno criado' })`
- [ ] Toast: "Aluno cadastrado. Ação registrada na auditoria."

---

#### F3A.3 — Detalhe e Edição do Aluno

**Referência:** `SPEC/07-modulo-alunos.md §7.3`, `SPEC/00-decisoes-e-divergencias.md §0.2`

**Critérios de aceite:**
- [ ] `AlunoDetail` com modos `view` e `edit`
- [ ] Modo view: status badge, grid de informações, professores, observações, agenda rápida (próximas 3 aulas), histórico financeiro (últimos 4 pagamentos)
- [ ] Modo edit por perfil: Admin edita todos os campos incluindo mensalidade; Secretário edita todos exceto mensalidade (read-only + cadeado); Professor sem botão Editar
- [ ] Aviso amber se `status='Atrasado'`; bloqueio de agendamento **apenas** se `status='Inativo'`
- [ ] Botão "Ver na agenda" oculto se `status='Inativo'`
- [ ] Lógica `status_atrasado_desde`: ao mudar para 'Atrasado' → `SET now()`; ao sair → `SET null`
- [ ] Server Action: UPDATE `students` → DELETE/INSERT `student_teachers` → `insertAuditLog({ acao: 'Aluno editado' })`

---

#### F3A.4 — Inativação e Reativação de Aluno

**Referência:** `SPEC/07-modulo-alunos.md §7.4`

**Critérios de aceite:**
- [ ] `InativarAlunoModal` com campo motivo (texto obrigatório)
- [ ] Server Action: `UPDATE students SET status='Inativo', motivo_inativacao, status_atrasado_desde=null` → `insertAuditLog({ acao: 'Aluno inativado' })`
- [ ] Toast + `AlunoDetail` fecha após 1.6s
- [ ] Reativação inline: `UPDATE students SET status='Ativo', motivo_inativacao=null` → `insertAuditLog({ acao: 'Aluno reativado' })`

---

#### F3A.5 — Cron de Inativação Automática

**Referência:** `SPEC/07-modulo-alunos.md §7.5`

**Critérios de aceite:**
- [ ] Rota `app/api/cron/inativacao/route.ts` criada
- [ ] `vercel.json` com trigger diário às 02:00 UTC
- [ ] SQL: UPDATE `students` SET `status='Inativo'`, `motivo_inativacao='Inativação automática — 30 dias sem regularização'`, `status_atrasado_desde=null` WHERE `status='Atrasado'` AND `status_atrasado_desde < now() - interval '30 days'`
- [ ] Para cada aluno inativado: `insertAuditLog({ acao: 'Inativação automática', usuario_id: null, perfil: 'Sistema' })`
- [ ] Rota protegida por Vercel Cron secret — não acessível publicamente

---

## Sprint 3B — Módulo Agenda

**Agente:** `nextjs-developer`
**Depende de:** Sprint 3A

**Objetivo:** visualização de calendário com views dia/semana/mês e CRUD de aulas com controle de permissões.

**Arquivos SPEC obrigatórios para esta sprint:**
- `SPEC/00-decisoes-e-divergencias.md §0.1` — quem pode criar aulas (PRD prevalece sobre design)
- `SPEC/00-decisoes-e-divergencias.md §0.2` — bloqueio por status (só Inativo, não Atrasado)
- `SPEC/09-modulo-agenda.md` — queries, fluxos de criação/cancelamento, permissões
- `SPEC/17-banco-de-dados-schema.md §17.3` — RLS de agenda

**Arquivos de design relevantes:** `screens-agenda.jsx` (AgendaScreen, TimeGrid, MonthGrid, EventBlock, AulaModal)

---

### Features

#### F3B.1 — Visualização da Agenda `/agenda`

**Critérios de aceite:**
- [ ] Views Dia / Semana / Mês com toggle entre elas
- [ ] `TimeGrid` (dia/semana) e `MonthGrid` (mês) com `EventBlock` por aula
- [ ] Admin/Secretário: todos os eventos com nome do professor no `EventBlock`
- [ ] Professor: apenas seus próprios eventos (query filtrada por `teacher_id`)
- [ ] Navegação por período (anterior/próximo)
- [ ] Cores por status: Agendada (azul), Realizada (verde), Cancelada (cinza riscado)

---

#### F3B.2 — Criar e Reagendar Aula

**Referência:** `SPEC/09-modulo-agenda.md §9.2`, `SPEC/00-decisoes-e-divergencias.md §0.1` e `§0.2`

**Critérios de aceite:**
- [ ] `AulaModal` acessível apenas para Admin e Secretário; Professor vê agenda em somente leitura
- [ ] `canEdit = perfil !== 'Professor'` (inversão do design — ver `SPEC/00-decisoes-e-divergencias.md §0.1`)
- [ ] Bloqueio apenas para `status='Inativo'`; aviso amber para `status='Atrasado'` mas permite agendar
- [ ] Verificação de bloqueio por `status='Inativo'` feita **no servidor** (não apenas frontend)
- [ ] Server Action criar: INSERT `agenda` → `insertAuditLog({ acao: 'Aula agendada' })`
- [ ] Server Action reagendar: UPDATE `agenda SET start_at, duracao_min` → `insertAuditLog({ acao: 'Aula reagendada' })`

---

#### F3B.3 — Cancelar Aula

**Critérios de aceite:**
- [ ] Ação disponível apenas para Admin e Secretário; confirmação inline
- [ ] Server Action: `UPDATE agenda SET status='Cancelada'` → `insertAuditLog({ acao: 'Aula cancelada' })`

---

## Sprint 4A — Módulo Financeiro de Alunos

**Agente:** `nextjs-developer`
**Depende de:** Sprint 3A

**Objetivo:** listagem de pagamentos, registro com upload de comprovante e SHA256 antifraude, e tela de validação.

**Arquivos SPEC obrigatórios para esta sprint:**
- `SPEC/00-decisoes-e-divergencias.md §0.7` — mensagem contextual de hash duplicado
- `SPEC/10-modulo-financeiro-alunos.md` — queries, fluxo das 3 etapas, ComprovanteUploader, validação
- `SPEC/18-storage-comprovantes.md` — path do bucket, validação de MIME type
- `SPEC/21-regras-negocio-criticas.md` — pagamento parcial proibido para alunos, email de rejeição

**Arquivos de design relevantes:** `screens-finance.jsx` (FinanceiroScreen, RegistrarPagamentoModal, ComprovanteUploader, ValidacoesScreen, RejeicaoModal)

---

### Features

#### F4A.1 — Listagem de Pagamentos `/financeiro`

**Referência:** `SPEC/10-modulo-financeiro-alunos.md §10.1`

**Critérios de aceite:**
- [ ] Tabela: Aluno, Competência, Valor, Status, Forma de pagamento, Comprovante (ícone de link)
- [ ] KPIs financeiros exibidos **apenas para Admin** — query não executada para Secretário (controle no Server Component)
- [ ] Filtros: status, forma de pagamento, busca por aluno
- [ ] Export CSV e XLSX com filtros ativos → `insertAuditLog({ acao: 'Relatório exportado' })`

---

#### F4A.2 — Registrar Pagamento (3 etapas)

**Referência:** `SPEC/10-modulo-financeiro-alunos.md §10.2`, `SPEC/00-decisoes-e-divergencias.md §0.7`, `SPEC/18-storage-comprovantes.md`

**Critérios de aceite:**
- [ ] `RegistrarPagamentoModal` com 3 etapas conforme design
- [ ] **Etapa 1** — Busca aluno: `ILIKE '%query%'`, exclui `status='Inativo'`, máx. 6 resultados
- [ ] **Etapa 2** — Toggle visual Cartão / PIX / Boleto
- [ ] **Etapa 3** — `ComprovanteUploader` com 4 estados exatos: idle / verificando / aprovado / duplicata
- [ ] Estado `duplicata` exibe: "Este comprovante já foi utilizado para [alunoNome] na competência [competencia]." (usando `context` retornado pelo Server Action — ver `SPEC/00-decisoes-e-divergencias.md §0.7`)
- [ ] Server Action upload: calcSHA256 → verificar `DUPLICATE_HASH` → validar MIME type server-side (apenas png/jpeg/pdf) → upload Storage → INSERT `payment_receipts`
- [ ] Tentativa de hash duplicado registrada em audit_log
- [ ] Comprovante obrigatório para PIX e Boleto; opcional para Cartão (verificação server-side)
- [ ] INSERT `payments`: `status = forma === 'Cartão' ? 'Pago' : 'Pendente de Validação'`
- [ ] Se 'Pago': `UPDATE students SET status='Ativo'`
- [ ] Pagamento parcial **proibido** para alunos — verificação server-side
- [ ] `insertAuditLog({ acao: 'Pagamento registrado' })`

---

#### F4A.3 — Validação de Comprovantes `/validacoes`

**Referência:** `SPEC/10-modulo-financeiro-alunos.md §10.3`, `SPEC/21-regras-negocio-criticas.md`

**Critérios de aceite:**
- [ ] Layout painel duplo: fila à esquerda (320px) + detalhe à direita
- [ ] Fila: pagamentos `status='Pendente de Validação'` por `criado_em ASC`
- [ ] **Aprovar:** UPDATE `payments` SET status='Pago', aprovado_por, aprovado_em → UPDATE `students` SET status='Ativo' → `insertAuditLog({ acao: 'Comprovante aprovado' })` → Toast → seleciona próximo automaticamente
- [ ] **Rejeitar** — `RejeicaoModal`: motivo obrigatório (mín. 20 chars), contador com cor dinâmica, botão disabled até mínimo
- [ ] Rejeição: UPDATE `payments` SET status='Atrasado' → email para `students.email` (**não** `users_profile.email`) → `insertAuditLog({ acao: 'Comprovante rejeitado' })`
- [ ] Badge da Sidebar atualizado em tempo real via Supabase Realtime

---

## Sprint 4B — Módulo Financeiro de Professores

**Agente:** `nextjs-developer`
**Depende de:** Sprint 2C + Sprint 3B

**Objetivo:** controle de pagamentos mensais aos professores com suporte a pagamento parcial.

**Arquivos SPEC obrigatórios para esta sprint:**
- `SPEC/11-modulo-financeiro-professores.md` — query completa, lógica de pagamento parcial, PagarProfModal

**Arquivos de design relevantes:** `screens-finance-prof.jsx` (FinanceiroProfScreen, PagarProfModal)

---

### Features

#### F4B.1 — Listagem Financeiro de Professores `/financeiro-professores`

**Referência:** `SPEC/11-modulo-financeiro-professores.md §11.1`

**Critérios de aceite:**
- [ ] Tabela: Professor, Valor hora, Aulas no mês, Horas, Valor devido, Valor pago, Status
- [ ] Query com JOIN em `teacher_payments`, `teachers` e `agenda` conforme SPEC
- [ ] KPIs: total a pagar, total pago, total pendente — calculados da lista
- [ ] Filtro por mês (competência)

---

#### F4B.2 — Registrar Pagamento ao Professor

**Referência:** `SPEC/11-modulo-financeiro-professores.md §11.2`

**Critérios de aceite:**
- [ ] `PagarProfModal` com campo valor (permite parcial)
- [ ] Pagamento parcial **permitido** para professores (diferente dos alunos)
- [ ] Server Action: UPDATE `teacher_payments` com lógica CASE (Pago/Parcial/Pendente) conforme SQL da SPEC
- [ ] `insertAuditLog({ acao: 'Pagamento professor registrado' })`
- [ ] Toast com valor formatado em R$

---

## Sprint 5 — Auditoria, Relatórios, Configurações e Minha Conta

**Agente:** `nextjs-developer`
**Depende de:** Sprint 4A + Sprint 4B

**Objetivo:** implementar os módulos de governança e configuração do sistema.

**Arquivos SPEC obrigatórios para esta sprint:**
- `SPEC/00-decisoes-e-divergencias.md §0.3` — acesso Secretário em Relatórios
- `SPEC/00-decisoes-e-divergencias.md §0.5` — campo Idioma a remover em Minha Conta
- `SPEC/12-modulo-auditoria.md` — filtros, imutabilidade, export
- `SPEC/13-modulo-relatorios.md` — cards, queries, controle de perfil no Server Component
- `SPEC/14-modulo-configuracoes.md` — school_config, campos, toggles
- `SPEC/15-modulo-minha-conta.md` — dados pessoais, troca de senha

**Arquivos de design relevantes:** `screens-audit.jsx` (AuditoriaScreen, RelatoriosScreen, ConfigScreen, MinhaContaScreen)

---

### Features

#### F5.1 — Auditoria `/auditoria` (Admin exclusivo)

**Referência:** `SPEC/12-modulo-auditoria.md`

**Critérios de aceite:**
- [ ] Tabela: Data/Hora, Usuário, Perfil, Ação, Entidade, IP
- [ ] Expandir linha para ver `dados_antes` e `dados_depois` (JSON formatado)
- [ ] Filtros server-side: usuario_id, acao, entidade, período, busca livre, IP
- [ ] Paginação ou scroll infinito (limite inicial 500 registros)
- [ ] Export CSV/XLSX → `insertAuditLog({ acao: 'Trilha de auditoria exportada' })`
- [ ] Sem UPDATE, sem DELETE em audit_logs (garantido por RLS de `SPEC/17-banco-de-dados-schema.md §17.3`)

---

#### F5.2 — Relatórios `/relatorios`

**Referência:** `SPEC/13-modulo-relatorios.md`, `SPEC/00-decisoes-e-divergencias.md §0.3`

**Critérios de aceite:**
- [ ] Cards XLSX + CSV para: Base de alunos, Lançamentos financeiros, Inadimplência, Professores
- [ ] Card "Trilha de auditoria" visível **apenas para Admin** (verificação `perfil === 'Administrador'` no Server Component — não via Middleware)
- [ ] Secretário acessa a rota e vê 4 cards (sem Trilha de auditoria)
- [ ] Cada card exporta dados completos sem filtros adicionais
- [ ] `insertAuditLog({ acao: 'Relatório exportado', dados_depois: { tipo_relatorio, formato, total_registros } })`

---

#### F5.3 — Configurações `/configuracoes` (Admin exclusivo)

**Referência:** `SPEC/14-modulo-configuracoes.md`, `SPEC/17-banco-de-dados-schema.md §17.1` (schema school_config)

**Critérios de aceite:**
- [ ] `ConfigScreen` com campos conforme `SPEC/14-modulo-configuracoes.md`
- [ ] Componente `Toggle` replicado do design com comportamento visual exato
- [ ] Leitura de `school_config` (linha única)
- [ ] Server Action: UPDATE `school_config` → `insertAuditLog({ acao: 'Configurações alteradas', dados_antes, dados_depois })`
- [ ] Toast de confirmação

---

#### F5.4 — Minha Conta `/conta`

**Referência:** `SPEC/15-modulo-minha-conta.md`, `SPEC/00-decisoes-e-divergencias.md §0.5`

**Critérios de aceite:**
- [ ] Campo "Idioma" **removido** (ver `SPEC/00-decisoes-e-divergencias.md §0.5`)
- [ ] Atualizar dados pessoais: UPDATE `teachers` (nome, telefone) + UPDATE `users_profile` + `supabase.auth.updateUser(email)` → `insertAuditLog({ acao: 'Dados pessoais atualizados' })`
- [ ] Trocar senha: validar senha atual → `updateUser({ password })` → checklist visual em tempo real → `insertAuditLog({ acao: 'Senha alterada' })`
- [ ] Toast: "Alterações salvas."

---

## Sprint 6 — Emails Transacionais e Cron de Lembretes

**Agente:** `nextjs-developer`
**Depende de:** Sprint 5

**Objetivo:** implementar templates de email via Brevo SMTP, cron de lembretes/cobranças e Edge Function de PDF.

**Arquivos SPEC obrigatórios para esta sprint:**
- `SPEC/19-emails-transacionais.md` — templates, queries de vencimento, fallback
- `SPEC/18-storage-comprovantes.md` — Edge Function de conversão PNG/JPG → PDF

---

### Features

#### F6.1 — Templates de email e integração Brevo

**Referência:** `SPEC/19-emails-transacionais.md`

**Critérios de aceite:**
- [ ] `lib/email.ts` integrado ao Brevo SMTP (nodemailer ou API Brevo direta)
- [ ] Template `boas_vindas`: nome, email e senha temporária
- [ ] Template `recuperacao_senha` configurado como template customizado no **Supabase Auth** usando Brevo SMTP como provider SMTP
- [ ] Template `rejeicao_comprovante`: motivo da rejeição para `students.email`
- [ ] Template `lembrete_vencimento`: enviado no dia do vencimento para PIX/Boleto não pagos
- [ ] Template `cobranca_pos_vencimento`: diariamente para alunos inadimplentes pós-vencimento
- [ ] Falha de email **não quebra** a ação principal — registrar erro no log
- [ ] Variáveis de ambiente documentadas no `.env.example`

---

#### F6.2 — Cron de lembretes e cobranças

**Referência:** `SPEC/19-emails-transacionais.md`

**Critérios de aceite:**
- [ ] Rota `app/api/cron/lembretes/route.ts` criada
- [ ] `vercel.json` com trigger diário
- [ ] Lembrete de vencimento: `SELECT payments JOIN students WHERE vencimento = CURRENT_DATE AND status != 'Pago' AND forma_pagamento IN ('PIX', 'Boleto')`
- [ ] Cobrança pós-vencimento: `SELECT payments JOIN students WHERE vencimento < CURRENT_DATE AND status = 'Atrasado'`
- [ ] Rota protegida por Vercel Cron secret
- [ ] `insertAuditLog({ acao: 'Email enviado', dados_depois: { template, aluno_id } })` por email

---

#### F6.3 — Edge Function para download de comprovante como PDF

**Referência:** `SPEC/18-storage-comprovantes.md`

**Critérios de aceite:**
- [ ] Supabase Edge Function para converter imagens PNG/JPG para PDF com `pdf-lib`
- [ ] Acessível apenas para Admin e Secretário (verificação via JWT Supabase)
- [ ] URL de download via Supabase Storage signed URL (não pública)

---

## Sprint 7 — Code Review Final e Hardening

**Agente:** `code-reviewer`
**Depende de:** Todas as sprints anteriores (Sprint 6 concluída)

**Objetivo:** revisão abrangente de qualidade, segurança e conformidade antes do deploy.

**Arquivos SPEC obrigatórios para esta sprint:**
- `SPEC/00-decisoes-e-divergencias.md` — verificar todas as 7 decisões implementadas
- `SPEC/21-regras-negocio-criticas.md` — verificar cada regra server-side
- `SPEC/22-decisoes-tecnicas-fixadas.md` — verificar cada decisão técnica

---

### Features

#### F7.1 — Auditoria de segurança

**Referência:** `SPEC/21-regras-negocio-criticas.md`

**Critérios de aceite:**
- [ ] Nenhuma variável `SUPABASE_SERVICE_ROLE_KEY` exposta em bundle client-side
- [ ] Todas as regras de `SPEC/21-regras-negocio-criticas.md` verificadas no servidor
- [ ] RLS testado: Secretário não acessa métricas financeiras; Professor não acessa dados de outros alunos
- [ ] Hash SHA256 verificado server-side — não apenas client-side
- [ ] Admin não consegue inativar a si mesmo
- [ ] Nenhuma rota Admin-only acessível por Secretário ou Professor
- [ ] Sem SQL injection em queries de busca

---

#### F7.2 — Conformidade com a SPEC

**Referência:** `SPEC/00-decisoes-e-divergencias.md`, `SPEC/22-decisoes-tecnicas-fixadas.md`

**Critérios de aceite:**
- [ ] `DemoAccordion` confirmado removido (`SPEC/00-decisoes-e-divergencias.md §0.5`)
- [ ] Campo "Idioma" confirmado removido de Minha Conta
- [ ] Ícone de sino confirmado removido do Topbar
- [ ] Gráficos confirmados como SVG puro — sem Recharts (`SPEC/22-decisoes-tecnicas-fixadas.md`)
- [ ] `canEdit = perfil !== 'Professor'` na Agenda (`SPEC/00-decisoes-e-divergencias.md §0.1`)
- [ ] Bloqueio de agendamento apenas para `status='Inativo'` (`SPEC/00-decisoes-e-divergencias.md §0.2`)
- [ ] Secretário acessa `/relatorios` mas não vê card "Trilha de auditoria" (`SPEC/00-decisoes-e-divergencias.md §0.3`)
- [ ] `status_atrasado_desde` sendo setado/zerado corretamente (`SPEC/00-decisoes-e-divergencias.md §0.4`)
- [ ] Nenhuma mock data de `data.js` (`window.ESM`) presente no código de produção

---

#### F7.3 — Qualidade de código

**Critérios de aceite:**
- [ ] Zero erros de TypeScript strict (`tsc --noEmit` limpo)
- [ ] Sem `any` implícito ou explícito nos Server Actions
- [ ] Todos os 13 componentes UI primitivos de `SPEC/16-componentes-ui.md` implementados
- [ ] `insertAuditLog` chamado em todas as ações especificadas nos arquivos SPEC dos módulos
- [ ] `exportCSV` e `exportXLSX` funcionando em todas as telas com filtros ativos
- [ ] Responsividade testada em mobile para as telas principais

---

## Checklist de Cobertura da SPEC

| Arquivo SPEC | Conteúdo coberto | Sprint(s) |
|--------------|-----------------|-----------|
| `SPEC/00-decisoes-e-divergencias.md §0.1` | canEdit na Agenda | Sprint 3B — F3B.2 |
| `SPEC/00-decisoes-e-divergencias.md §0.2` | Bloqueio só para Inativo | Sprint 3B — F3B.2 + Sprint 3A — F3A.3 |
| `SPEC/00-decisoes-e-divergencias.md §0.3` | Secretário em /relatorios | Sprint 0 — F0.6 + Sprint 5 — F5.2 |
| `SPEC/00-decisoes-e-divergencias.md §0.4` | status_atrasado_desde | Sprint 0 — F0.3 + Sprint 3A — F3A.3 |
| `SPEC/00-decisoes-e-divergencias.md §0.5` | Remoção de elementos de proto | Sprint 1A, 1B, 5, 7 |
| `SPEC/00-decisoes-e-divergencias.md §0.6` | Algoritmo senha temporária | Sprint 2B — F2B.2 + Sprint 2C — F2C.2 |
| `SPEC/00-decisoes-e-divergencias.md §0.7` | Mensagem hash duplicado contextual | Sprint 4A — F4A.2 |
| `SPEC/01-stack-e-estrutura-geral.md` | Stack, pastas, tokens, navegação | Sprint 0 — F0.1 + F0.2 |
| `SPEC/02-middleware-autenticacao.md` | Guard, redirects por perfil | Sprint 0 — F0.6 |
| `SPEC/03-modulo-autenticacao.md` | Login, Primeiro Acesso, Recuperação | Sprint 1A |
| `SPEC/04-modulo-layout.md` | Sidebar, Topbar, dark mode | Sprint 1B — F1B.1 |
| `SPEC/05-modulo-dashboard.md` | 3 variações de dashboard | Sprint 2A |
| `SPEC/06-modulo-usuarios.md` | CRUD usuários + reset senha | Sprint 2B |
| `SPEC/07-modulo-alunos.md` | CRUD alunos + cron | Sprint 3A |
| `SPEC/08-modulo-professores.md` | CRUD professores + detalhe | Sprint 2C |
| `SPEC/09-modulo-agenda.md` | Agenda + CRUD aulas | Sprint 3B |
| `SPEC/10-modulo-financeiro-alunos.md` | Pagamentos + upload + validação | Sprint 4A |
| `SPEC/11-modulo-financeiro-professores.md` | Financeiro professores | Sprint 4B |
| `SPEC/12-modulo-auditoria.md` | Tela de auditoria | Sprint 5 — F5.1 |
| `SPEC/13-modulo-relatorios.md` | Relatórios por perfil | Sprint 5 — F5.2 |
| `SPEC/14-modulo-configuracoes.md` | school_config + toggles | Sprint 5 — F5.3 |
| `SPEC/15-modulo-minha-conta.md` | Dados pessoais + senha | Sprint 5 — F5.4 |
| `SPEC/16-componentes-ui.md` | 13 primitivos UI | Sprint 1B — F1B.2 |
| `SPEC/17-banco-de-dados-schema.md` | Schema, índices, RLS | Sprint 0 — F0.3 + F0.4 |
| `SPEC/18-storage-comprovantes.md` | Bucket + Edge Function PDF | Sprint 0 — F0.5 + Sprint 6 — F6.3 |
| `SPEC/19-emails-transacionais.md` | Templates + Brevo + cron | Sprint 6 — F6.1 + F6.2 |
| `SPEC/20-auditoria-helper.md` | insertAuditLog helper | Sprint 0 — F0.5 |
| `SPEC/21-regras-negocio-criticas.md` | Regras server-side | Sprint 7 — F7.1 |
| `SPEC/22-decisoes-tecnicas-fixadas.md` | Decisões técnicas imutáveis | Sprint 7 — F7.2 |
