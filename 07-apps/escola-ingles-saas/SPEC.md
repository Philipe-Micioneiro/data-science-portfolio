# SPEC Técnica — English School Manager
## Versão 2.1 — 03/06/2026 (pós-revisão crítica)

> **Como usar esta SPEC:**
> Esta SPEC conecta o PRD (regras de negócio) com os arquivos de design (referências visuais) para guiar
> a implementação frontend+backend. Ela **NÃO replica código** — referencia os arquivos de design para que
> cada agente de sprint consulte a fonte visual diretamente. O foco desta SPEC é exclusivamente nas
> **conexões entre frontend e backend**: quais dados cada tela consome, quais ações geram mutações,
> quais regras de segurança se aplicam e como o fluxo de dados deve funcionar end-to-end.
>
> **Arquivos de design:** `English School SaaS-handoff/english-school-saas/project/`
> **PRD:** `PRD.md`

---

## 0. Decisões Explícitas e Divergências Design × PRD

> Estas decisões devem ser lidas ANTES de iniciar qualquer sprint de frontend.
> Onde o design e o PRD divergem, esta seção é a fonte de verdade.

### 0.1 Criação de Aulas na Agenda — PRD prevalece sobre o Design

**O design** (`screens-agenda.jsx`) restringe `canEdit = isProf` (apenas Professor cria aulas).
**O PRD** (§20.2) define: Admin ✅, Secretário ✅, Professor ❌ para criação de aulas.

**Decisão:** seguir o PRD. Na implementação:
- Admin e Secretário podem criar, reagendar e cancelar aulas
- Professor tem visualização somente leitura da sua própria agenda
- Ajustar `canEdit` na implementação para `perfil !== 'Professor'`

### 0.2 Agendamento para Alunos com Status "Atrasado"

**O design** bloqueia agendamento para "Inativo" E "Atrasado".
**O PRD** (§20.3) bloqueia apenas "Inativo".

**Decisão:** seguir o PRD. Apenas alunos com `status = 'Inativo'` bloqueiam novo agendamento. "Atrasado" exibe aviso amber mas permite agendar. Ajustar `isBlocked` para verificar somente `'Inativo'`.

### 0.3 Módulo Relatórios — Acesso do Secretário

**O design** e o Middleware da SPEC anterior definiam `/relatorios` como Admin exclusivo.
**O PRD** (§23) permite que Secretário exporte Base de alunos, Lançamentos e Inadimplência, mas NÃO Trilha de auditoria.

**Decisão:** seguir o PRD.
- Secretário acessa `/relatorios` e vê: Base de alunos, Lançamentos financeiros, Inadimplência, Professores
- Admin vê todos + Trilha de auditoria
- Ajustar Middleware para permitir Secretário em `/relatorios`
- Controlar visibilidade do card "Trilha de auditoria" via verificação de perfil no Server Component

### 0.4 Campo "Risco de Inativação" — Coluna `status_desde`

O campo `atualizado_em` em `students` é atualizado a cada edição, não apenas na mudança de status. Usar como proxy de tempo em atraso é impreciso.

**Decisão:** adicionar campo `status_atrasado_desde` (timestamptz, nullable) na tabela `students`. Esse campo é setado quando o status muda para 'Atrasado' e zerado ao sair desse status. O widget "Risco de Inativação" filtra `status_atrasado_desde < now() - interval '20 days'`.

### 0.5 Elementos do Design a Remover na Implementação

Os seguintes elementos existem no design por razões de prototipagem e **NÃO devem ser implementados em produção**:

| Elemento | Arquivo de Design | Ação |
|----------|------------------|------|
| `DemoAccordion` (acessos de demonstração) | `screens-auth.jsx` | Remover completamente |
| Campo "Idioma" em Minha Conta | `screens-audit.jsx` → `MinhaContaScreen` | Remover — sistema é somente PT-BR |
| Ícone de sino (notificações) no Topbar | `layout.jsx` → `Topbar` | Remover — sem sistema de notificações in-app na V1 |
| Mock data (`window.ESM`) | `data.js` | Substituir por queries Supabase reais |

### 0.6 Senha Temporária — Algoritmo Padrão

A senha temporária deve satisfazer as regras do PRD §7.3 e não ser previsível.

**Algoritmo obrigatório** (usar em todos os pontos de criação de usuário):
```typescript
function gerarSenhaTemp(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sem I, O
  const lower = 'abcdefghjkmnpqrstuvwxyz';   // sem i, l, o
  const digits = '23456789';                  // sem 0, 1
  const rand = (s: string) => s[Math.floor(Math.random() * s.length)];
  const suffix = Array.from({ length: 4 }, () => rand(upper + lower + digits)).join('');
  return `Temp#${new Date().getFullYear()}${rand(upper)}${rand(digits)}${suffix}`;
  // Exemplo: Temp#2026A7mKp3
}
```
Satisfaz: mín. 8 chars ✅, maiúscula ✅, minúscula ✅, número ✅.

### 0.7 Mensagem de Hash Duplicado — Deve Incluir Contexto

**PRD §16.5:** "Este comprovante já foi utilizado para [Nome do Aluno] na competência [mês/ano]."

O Server Action de upload deve retornar, ao detectar duplicata:
```typescript
{ error: 'DUPLICATE_HASH', context: { alunoNome: string, competencia: string } }
```
O frontend usa `context` para popular a mensagem exibida no estado `duplicata` do `ComprovanteUploader`.

---

## 1. Stack e Estrutura Geral

### 1.1 Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14+ (App Router, TypeScript) |
| Estilos | Tailwind CSS — tokens mapeados de `index.html` do design |
| Backend/DB | Supabase (Postgres + Auth + Storage + Realtime) |
| Email | Brevo SMTP (fallback Gmail SMTP) |
| Deploy | Vercel (frontend) + Supabase (backend) |
| Cron | Vercel Cron Jobs (inativação automática diária) |

### 1.2 Estrutura de Pastas Next.js

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

### 1.3 Design Tokens → Tailwind

Todos os tokens CSS definidos em:
**`design: index.html`** → seção `:root { ... }` e `[data-theme="dark"] { ... }`

Mapear no `tailwind.config.ts` e `globals.css`. Não inventar valores — usar exatamente os tokens do design.

### 1.4 Perfis e Navegação

**Fonte de verdade:** `design: layout.jsx` — objeto `NAV`

| Perfil | Rotas permitidas |
|--------|----------------|
| Administrador | dashboard, usuarios, alunos, professores, agenda, financeiro, financeiroProf, validacoes, auditoria, relatorios, config |
| Secretário | dashboard, alunos, professores, agenda, financeiro, financeiroProf, validacoes |
| Professor | dashboard (meus alunos), agenda (minha agenda), conta |

---

## 2. Middleware de Autenticação

**Arquivo:** `middleware.ts`

**Lógica:**
1. Rotas públicas (`/login`, `/recuperar-senha`, `/redefinir-senha`) → sem verificação
2. Sem sessão Supabase → redirect `/login`
3. `precisa_trocar_senha = true` e rota não é `/primeiro-acesso` → redirect `/primeiro-acesso`
4. Rota pertence a perfil não autorizado → redirect `/dashboard`

**Rotas restritas por perfil:**
- Apenas Admin: `/usuarios`, `/auditoria`, `/configuracoes`
- Admin + Secretário: `/alunos`, `/professores`, `/agenda`, `/financeiro`, `/financeiro-professores`, `/validacoes`, `/relatorios`
- Bloqueado para Professor: tudo exceto `/dashboard`, `/agenda`, `/conta`

> ⚠️ Em `/relatorios`, controlar visibilidade do card "Trilha de auditoria" no Server Component via `perfil === 'Administrador'` — o Middleware permite acesso, mas o card é ocultado para Secretário.

**Supabase:** usar `supabase.auth.getSession()` no middleware com cookie do Next.js.

---

## 3. Módulo: Autenticação

**Design:** `screens-auth.jsx`

### 3.1 Tela de Login — `/login`

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

**DemoAccordion:** remover em produção. Presente apenas no design para prototipagem.

**Supabase Auth:** `signInWithPassword` — sem configuração especial.

---

### 3.2 Primeiro Acesso — `/primeiro-acesso`

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

### 3.3 Recuperação de Senha

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

---

## 4. Módulo: Layout Autenticado

**Design:** `layout.jsx`

### 4.1 Sidebar

**Componente design:** `Sidebar`

Dados necessários da sessão:
- `user.perfil` → determina qual `NAV` renderizar
- `pendingCount` → quantidade de pagamentos com `status = 'Pendente de Validação'` na competência atual

**Query para badge de Validações:**
```sql
SELECT COUNT(*) FROM payments WHERE status = 'Pendente de Validação';
```
Ideal: Supabase Realtime subscription para atualização em tempo real do badge.

### 4.2 Topbar

**Componente design:** `Topbar`

Dados: `user.nome`, `user.perfil` (da sessão). Sem query adicional.

Toggle dark mode: persistir em `localStorage` + `data-theme` no `<html>`.

---

## 5. Módulo: Dashboard

**Design:** `screens-dashboard.jsx`

### 5.1 Admin Dashboard — `/dashboard` (perfil Admin)

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

**Gráficos:** LineChart e BarsChart são SVG puros. Ver implementação exata em `design: ui.jsx`. Não usar biblioteca externa — replicar fielmente.

**Ações:** KPI cards clicáveis navegam para `/alunos?status=X` ou `/validacoes`. Sem mutação de dados.

---

### 5.2 Secretaria Dashboard — `/dashboard` (perfil Secretário)

**Componente design:** `SecretariaDashboard`

**Diferença do Admin:** sem KPIs financeiros (sem receita, sem inadimplência). Apenas contadores operacionais de alunos.

**Dados:** subset das queries do Admin — apenas KPIs operacionais + widgets de pendentes, vencimentos, risco e validações.

**RLS:** a query de `finance` não deve ser executada para Secretário. Controlar no Server Component via verificação de perfil.

---

### 5.3 Professor Dashboard — `/dashboard` (perfil Professor)

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

**RLS:** professores acessam APENAS alunos via `student_teachers`. Ver schema em PRD.md §3 (RLS).

---

## 6. Módulo: Usuários (Admin exclusivo)

**Design:** `screens-users.jsx`
**Rota:** `/usuarios`

### 6.1 Listagem

**Componente design:** `UsuariosScreen`

**Dados:**
```sql
SELECT up.*, au.last_sign_in_at AS ultimo_acesso
FROM users_profile up
LEFT JOIN auth.users au ON au.id = up.id
ORDER BY up.criado_em DESC;
```

**KPIs:** calcular client-side a partir da lista (total, por perfil, inativos).

**Filtros:** por perfil e por busca — filtrar client-side na lista carregada.

---

### 6.2 Criar Usuário

**Componente design:** `NovoUsuarioModal`

**Ação:**
```
POST /api/auth/create-user (Server Action)
→ Validar: email único, nome obrigatório, perfil válido
→ supabaseAdmin.auth.admin.createUser({ email, password: senhaTemp, email_confirm: true })
→ INSERT INTO users_profile (id, nome, perfil, precisa_trocar_senha=true)
→ sendEmail({ template: 'boas_vindas', email, nome, senhaTemp })
→ insertAuditLog({ acao: 'Usuário criado', entidade: 'Usuário', entidade_id: novoId })
→ Retornar { senhaTemp } para exibir no TempPwBanner
```

**UI pós-criação:** design exibe `TempPwBanner` (fundo verde) com a senha e botão de copiar (`CopyButton`). O modal NÃO fecha automaticamente — usuário fecha manualmente após copiar.

**Senha temporária:** formato `Temp#AAAA` onde AAAA = ano atual + sufixo aleatório (ver design: `screens-users.jsx` → `TempPwBanner`).

**Perfis criáveis:** apenas Secretário ou Professor. Admin não pode criar outro Admin por este fluxo.

---

### 6.3 Editar Usuário

**Componente design:** `EditarUsuarioModal`

**Ação:**
```
UPDATE users_profile SET nome, email, status WHERE id = usuario_id
→ Se status mudou para 'Inativo': supabase.auth.admin.updateUserById(id, { ban_duration: 'none+' }) // banir sessão
→ insertAuditLog({ acao: 'Usuário editado', dados_antes, dados_depois })
```

**Regras:**
- Perfil é read-only (exibido como badge, não editável)
- Admin não pode inativar a si mesmo (verificar `usuario.id === currentUser.id`)

---

### 6.4 Reset de Senha

**Componente design:** `UsuarioDetailModal` (botão "Resetar senha")

**Ação:**
```
→ supabaseAdmin.auth.admin.updateUserById(id, { password: novaSenhaTemp })
→ UPDATE users_profile SET precisa_trocar_senha = true WHERE id = usuario_id
→ Retornar novaSenhaTemp para exibir inline no modal (design: painel azul)
→ insertAuditLog({ acao: 'Senha resetada pelo admin', entidade: 'Usuário' })
```

---

## 7. Módulo: Alunos

**Design:** `screens-students.jsx`
**Rota:** `/alunos` (Admin, Secretário) | `/dashboard` (Professor — via ProfessorAlunosTable)

### 7.1 Listagem com Filtros

**Componente design:** `AlunosScreen`

**Dados:**
```sql
SELECT s.*, 
  array_agg(t.nome) AS professores_nomes,
  array_agg(st.teacher_id) AS professores_ids
FROM students s
LEFT JOIN student_teachers st ON st.student_id = s.id
LEFT JOIN teachers t ON t.id = st.teacher_id
GROUP BY s.id
ORDER BY s.nome;
```

**Filtros** (todos client-side a partir da lista carregada, ou server-side para listas grandes):
- `status`: Todos / Ativo / Atrasado / Pendente de Validação / Inativo / **Risco** (status='Atrasado' AND atualizado_em < now()-20d)
- `professor`: filtrar por teacher_id
- `busca`: nome, email ou telefone (case insensitive)

**Chip "Risco de inativação":** filtra `status = 'Atrasado' AND status_atrasado_desde < now() - interval '20 days'` (ver decisão §0.4). O design usa `status === 'Atrasado'` como proxy — a implementação real usa `status_atrasado_desde`.

**Export:** respeita filtros ativos. Ver `design: ui.jsx` → `exportCSV` / `exportXLSX`. Registrar auditoria ao exportar.

---

### 7.2 Cadastro de Aluno

**Componente design:** `NovoAlunoModal`

**Campos obrigatórios:** nome, telefone, professor(es). Ver design para validação inline (botão disabled até válido).

**MultiProfessorPicker:** componente custom, ver `design: screens-students.jsx`. Exibe badges removíveis.

**Ação:**
```
INSERT INTO students (nome, telefone, email, plano, nivel_ingles, valor_mensalidade, dia_vencimento, data_entrada, carga_horaria, observacoes, status='Ativo', criado_por=auth.uid())
→ INSERT INTO student_teachers (student_id, teacher_id) para cada professor selecionado
→ insertAuditLog({ acao: 'Aluno criado', entidade: 'Aluno', entidade_id: novoId, dados_depois: { ...campos } })
→ Toast: "Aluno cadastrado. Ação registrada na auditoria."
```

---

### 7.3 Detalhe e Edição do Aluno

**Componente design:** `AlunoDetail`

O componente tem **dois modos**: `view` e `edit`. Ver `design: screens-students.jsx` → `AlunoDetail` → estado `mode`.

**Modo view mostra:**
- Status badge + valor/mês
- Grid de informações (email, telefone, plano, nível, carga horária, mensalidade, vencimento, entrada)
- Professores vinculados (badges)
- Observações
- Agenda rápida (próximas 3 aulas) — consultar tabela `agenda`
- Histórico financeiro recente (últimos 4 pagamentos) — consultar tabela `payments`

**Modo edit — campos editáveis por perfil:**

| Campo | Admin | Secretário | Professor |
|-------|-------|-----------|-----------|
| Email, Telefone, Plano, Nível, Carga, Venc, Professores, Obs | ✅ | ✅ | ❌ (sem botão Editar) |
| Valor mensalidade | ✅ (input) | ❌ (read-only + ícone cadeado) | ❌ |

Ver implementação exata do campo `Mensalidade` em `design: screens-students.jsx` → `AlunoDetail` → `rowsInfo`.

**Ação ao salvar edição:**
```
UPDATE students SET telefone, email, plano, nivel_ingles, valor_mensalidade (se admin), dia_vencimento, carga_horaria, observacoes WHERE id = aluno_id
→ DELETE FROM student_teachers WHERE student_id = aluno_id
→ INSERT INTO student_teachers para novos professores
→ insertAuditLog({ acao: 'Aluno editado', dados_antes: {...antes}, dados_depois: {...depois} })
→ Toast: "Dados de [Nome] atualizados."
```

**Bloqueio de agendamento:** se `aluno.status === 'Inativo'` ou `'Atrasado'`, exibir aviso e ocultar botão "Ver na agenda". Ver design: `AlunoDetail` → variável `isBlocked`.

---

### 7.4 Inativação de Aluno

**Componente design:** `InativarAlunoModal`

**Ação:**
```
UPDATE students SET status='Inativo', motivo_inativacao=motivo WHERE id = aluno_id
→ insertAuditLog({ acao: 'Aluno inativado', dados_antes: { status: statusAnterior }, dados_depois: { status: 'Inativo', motivo } })
→ Toast: "Aluno inativado. Histórico preservado."
→ Fechar AlunoDetail após 1.6s (ver design)
```

**Reativação (inline no AlunoDetail):** confirmação rápida sem modal separado.
```
UPDATE students SET status='Ativo', motivo_inativacao=null WHERE id = aluno_id
→ insertAuditLog({ acao: 'Aluno reativado' })
→ Toast: "Aluno reativado."
```

---

### 7.5 Inativação Automática (Cron)

**Arquivo:** `app/api/cron/inativacao/route.ts`

**Trigger:** Vercel Cron, diariamente às 02:00 UTC. Configurar em `vercel.json`.

**Lógica:**
```sql
UPDATE students SET status='Inativo', motivo_inativacao='Inativação automática — 30 dias sem regularização',
  status_atrasado_desde = null
WHERE status = 'Atrasado'
AND status_atrasado_desde < now() - interval '30 days'
RETURNING id, nome;
```
Para cada aluno inativado: `insertAuditLog({ acao: 'Inativação automática', usuario_id: null, perfil: 'Sistema' })`.

---

## 8. Módulo: Professores

**Design:** `screens-professores.jsx`
**Rota:** `/professores` (Admin, Secretário)

### 8.1 Listagem

**Componente design:** `ProfessoresScreen`

**Dados:**
```sql
SELECT t.*,
  COUNT(DISTINCT st.student_id) AS num_alunos,
  COUNT(DISTINCT CASE WHEN a.status != 'Cancelada' THEN a.id END) AS aulas_no_mes,
  COUNT(DISTINCT CASE WHEN a.status = 'Realizada' THEN a.id END) AS aulas_realizadas
FROM teachers t
LEFT JOIN student_teachers st ON st.teacher_id = t.id
LEFT JOIN agenda a ON a.teacher_id = t.id AND date_trunc('month', a.start_at) = date_trunc('month', now())
GROUP BY t.id
ORDER BY t.nome;
```

**Distribuição de carga:** cards de ranking calculados client-side a partir da lista. Ver `design: screens-professores.jsx` → `RankingCard`.

---

### 8.2 Criar/Editar Professor

**Componente design:** `ProfessorFormModal`

**Campos:** nome*, email*, telefone, valor_hora, forma_pagamento, obs_financeiras, status (só na edição).

**Ação (criar):**
```
→ Se perfil Professor existente na users_profile: vincular teacher.user_id
→ INSERT INTO teachers (nome, email, telefone, valor_hora, forma_pagamento, obs_financeiras, status='Ativo')
→ Criar user via Supabase Admin API (se não existir): senha temporária + email
→ INSERT INTO users_profile (id, nome='Professor X', perfil='Professor', precisa_trocar_senha=true)
→ sendEmail({ template: 'boas_vindas' })
→ insertAuditLog({ acao: 'Professor criado' })
```

**Ação (editar):**
```
UPDATE teachers SET nome, email, telefone, valor_hora, forma_pagamento, obs_financeiras, status
→ UPDATE users_profile SET nome, email WHERE id = teacher.user_id
→ insertAuditLog({ acao: 'Professor editado', dados_antes, dados_depois })
```

---

### 8.3 Detalhe do Professor

**Componente design:** `ProfessorDetailModal`

**Dados adicionais:** lista de alunos do professor + KPI de pagamento (teacher_payments).

**Inativar/Reativar:** soft delete com confirmação inline. Ver design: botões na barra de ações do modal.

**⚠️ Coluna Mensalidade na tabela de alunos do professor:** `ProfessorDetailModal` exibe a mensalidade dos alunos — isso é intencional. Este modal é acessado exclusivamente por Admin e Secretário (não pelo Professor), portanto a exibição de mensalidade é permitida conforme PRD §3.2.

---

## 9. Módulo: Agenda

**Design:** `screens-agenda.jsx`
**Rota:** `/agenda` (Admin, Secretário, Professor)

### 9.1 Visualização

**Componente design:** `AgendaScreen` com views Dia/Semana/Mês (`TimeGrid`, `MonthGrid`, `EventBlock`)

**Dados:**
```sql
-- Admin/Secretário: todos os eventos
SELECT a.*, s.nome AS aluno, t.nome AS professor_nome
FROM agenda a
JOIN students s ON s.id = a.student_id
JOIN teachers t ON t.id = a.teacher_id
WHERE a.start_at BETWEEN [range_start] AND [range_end]
ORDER BY a.start_at;

-- Professor: apenas seus eventos
SELECT a.*, s.nome AS aluno
FROM agenda a
JOIN students s ON s.id = a.student_id
WHERE a.teacher_id = (SELECT id FROM teachers WHERE user_id = auth.uid())
AND a.start_at BETWEEN [range_start] AND [range_end];
```

**RLS:** professores acessam somente eventos onde `teacher_id` bate com seu `teachers.id`.

---

### 9.2 Criar / Reagendar Aula

**Componente design:** `AulaModal` (modo edit)

**Regra de bloqueio (crítica — PRD §20.3):** apenas alunos com `status = 'Inativo'` bloqueiam o agendamento. Ver decisão §0.2 desta SPEC. Para "Atrasado": exibir aviso amber informativo mas permitir agendar.

**Quem pode criar (PRD §20.2 prevalece sobre o design):** Admin ✅, Secretário ✅, Professor ❌.
O design mostra `canEdit = isProf` — esse valor deve ser invertido na implementação para `canEdit = perfil !== 'Professor'`.
Professor visualiza sua própria agenda mas não cria, reagenda ou cancela aulas.

**Ação:**
```
INSERT INTO agenda (student_id, teacher_id, start_at, duracao_min, observacoes, status='Agendada', criado_por)
→ insertAuditLog({ acao: 'Aula agendada' })
→ Toast: "Aula agendada."
```

### 9.3 Cancelar Aula

```
UPDATE agenda SET status='Cancelada' WHERE id = evento_id
→ insertAuditLog({ acao: 'Aula cancelada' })
→ Toast: "Aula cancelada."
```

---

## 10. Módulo: Financeiro (Alunos)

**Design:** `screens-finance.jsx`
**Rota:** `/financeiro` (Admin vê KPIs globais; Secretário não vê)

### 10.1 Listagem de Pagamentos

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

**Export:** `exportCSV` / `exportXLSX` do design (`design: ui.jsx`). Respeitar filtros ativos. `insertAuditLog({ acao: 'Relatório exportado', dados_depois: { filtros, total } })`.

---

### 10.2 Registrar Pagamento

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
1. calcSHA256(file) → hash
2. SELECT pr.id, pr.payment_id, p.competencia, s.nome AS aluno_nome
   FROM payment_receipts pr
   JOIN payments p ON p.id = pr.payment_id
   JOIN students s ON s.id = p.student_id
   WHERE pr.hash_sha256 = hash
   → Se existir: retornar { error: 'DUPLICATE_HASH', context: { alunoNome, competencia } }
     ⚠️ O frontend usa context para exibir: "Este comprovante já foi utilizado para [alunoNome] na competência [competencia]."
     Registrar tentativa: insertAuditLog({ acao: 'Tentativa de hash duplicado', dados_depois: { hash, alunoNome, competencia } })
   → Se não: continuar
3. supabase.storage.from('comprovantes').upload(path, file)
4. INSERT INTO payment_receipts (payment_id, arquivo_url, hash_sha256, formato, enviado_por)
5. Retornar { success: true, hash }
```

**Ação final (Registrar):**
```
INSERT INTO payments (student_id, competencia, competencia_date, valor_previsto, forma_pagamento, vencimento, status, criado_por)
→ status = forma === 'Cartão' ? 'Pago' : 'Pendente de Validação'
→ Se 'Pago': UPDATE students SET status='Ativo'
→ insertAuditLog({ acao: 'Pagamento registrado' })
→ Toast correspondente ao status gerado
```

---

### 10.3 Validação de Comprovantes

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
   ⚠️  Usar students.email — NÃO users_profile.email
   O aluno NÃO possui conta de login; seu email está em students.email
→ sendEmail({ template: 'rejeicao_comprovante', to: student.email, motivo })
→ insertAuditLog({ acao: 'Comprovante rejeitado', dados_depois: { motivo } })
→ Toast: "Comprovante rejeitado. Aluno notificado."
```

---

## 11. Módulo: Financeiro de Professores

**Design:** `screens-finance-prof.jsx`
**Rota:** `/financeiro-professores` (Admin, Secretário)

### 11.1 Listagem

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

### 11.2 Registrar Pagamento ao Professor

**Componente design:** `PagarProfModal`

**Diferença dos alunos:** pagamento parcial é permitido para professores.

**Ação:**
```
UPDATE teacher_payments SET valor_pago = valor_pago + valor_novo,
  status = CASE WHEN valor_pago + valor_novo >= valor_devido THEN 'Pago' WHEN valor_pago + valor_novo > 0 THEN 'Parcial' ELSE 'Pendente' END
WHERE id = teacher_payment_id
→ insertAuditLog({ acao: 'Pagamento professor registrado' })
→ Toast com valor pago
```

---

## 12. Módulo: Auditoria (Admin exclusivo)

**Design:** `screens-audit.jsx` → `AuditoriaScreen`
**Rota:** `/auditoria`

**Dados:**
```sql
SELECT al.*, up.nome AS usuario_nome, up.perfil AS usuario_perfil
FROM audit_logs al
LEFT JOIN users_profile up ON up.id = al.usuario_id
ORDER BY al.criado_em DESC
LIMIT 500; -- paginação ou scroll infinito em produção
```

**Filtros (server-side):** usuario_id, acao, entidade, período (date range), busca livre (acao ILIKE ou alvo ILIKE), **ip** (ILIKE '%x%').

**RLS:** apenas Admin pode fazer SELECT em `audit_logs`. Ver schema do banco.

**Imutabilidade:** sem UPDATE, sem DELETE em `audit_logs`. Garantido via RLS (apenas INSERT permitido via função server-side).

**Export:** `insertAuditLog({ acao: 'Trilha de auditoria exportada', dados_depois: { filtros } })`.

---

## 13. Módulo: Relatórios (Admin exclusivo)

**Design:** `screens-audit.jsx` → `RelatoriosScreen`
**Rota:** `/relatorios`

**Relatórios disponíveis (cards com XLSX + CSV):**

| Relatório | Query base |
|-----------|-----------|
| Base de alunos | `SELECT * FROM students JOIN student_teachers...` |
| Lançamentos financeiros | `SELECT * FROM payments JOIN students...` |
| Inadimplência | `SELECT * FROM payments WHERE status='Atrasado' JOIN students...` |
| Professores | `SELECT * FROM teachers LEFT JOIN student_teachers... LEFT JOIN students...` |
| Trilha de auditoria | `SELECT * FROM audit_logs JOIN users_profile...` |

**Acesso por perfil (ver decisão §0.3):**
- Admin: vê todos os 4 relatórios
- Secretário: vê Base de alunos, Lançamentos financeiros, Inadimplência, Professores — NÃO vê Trilha de auditoria

Controlar visibilidade do card "Trilha de auditoria" via `perfil === 'Administrador'` no Server Component. O Middleware deve permitir Secretário em `/relatorios`.

**Sobre os dados exportados:** cada card exporta os dados completos da entidade sem filtros adicionais. Os filtros filtrados do PRD §23 aplicam-se às exportações das telas de origem (Alunos, Financeiro) — não desta tela de Relatórios. A tela de Relatórios é para exportações completas de cada módulo.

**Auditoria:** toda exportação de relatório registra evento com `{ tipo_relatorio, formato, total_registros }`.

---

## 14. Módulo: Configurações (Admin exclusivo)

**Design:** `screens-audit.jsx` → `ConfigScreen`
**Rota:** `/configuracoes`

**Dados:** buscar de uma tabela `school_config` (criar como tabela com uma única linha ou usar variáveis de ambiente gerenciadas).

**Campos:**
- `nome_instituicao` (texto)
- `dias_uteis_atraso` (inteiro, default 5)
- `dias_inativacao` (inteiro, default 30)
- `comprovante_obrigatorio` (boolean, default true)
- `notificar_rejeicao` (boolean, default true)

**Ação:** UPDATE + `insertAuditLog({ acao: 'Configurações alteradas', dados_antes, dados_depois })`.

**Toggles:** ver design `ConfigScreen` → componente `Toggle` inline. Replicar comportamento visual.

---

## 15. Módulo: Minha Conta (Professor)

**Design:** `screens-audit.jsx` → `MinhaContaScreen`
**Rota:** `/conta`

**Dados:** perfil atual do usuário logado (da sessão).

**Ação (dados pessoais):**
```
UPDATE teachers SET nome, telefone WHERE user_id = auth.uid()
UPDATE users_profile SET nome WHERE id = auth.uid()
UPDATE auth.users SET email WHERE id = auth.uid() (via supabase.auth.updateUser)
→ insertAuditLog({ acao: 'Dados pessoais atualizados' })
```

**Ação (troca de senha):**
```
→ Validar senha atual: supabase.auth.signInWithPassword
→ supabase.auth.updateUser({ password: nova_senha })
→ insertAuditLog({ acao: 'Senha alterada' })
→ Toast: "Alterações salvas."
```

---

## 16. Componentes UI — Mapeamento do Design

**Design:** `ui.jsx`

Todos os componentes abaixo devem ser implementados **pixel-perfect** conforme o design. Não usar bibliotecas de componentes externas para estes primitivos — replicar do JSX.

| Componente Design | Arquivo Next.js | Notas |
|-------------------|-----------------|-------|
| `Avatar` | `components/ui/Avatar.tsx` | Cor determinística por nome (ver `avColor` no design) |
| `StatusBadge` | `components/ui/StatusBadge.tsx` | Estados: Ativo, Atrasado, Pendente de Validação, Inativo, Pago |
| `KpiCard` | `components/ui/KpiCard.tsx` | Suporta onClick para navegação |
| `Modal` | `components/ui/Modal.tsx` | Fechar com ESC + click fora (overlay) |
| `FilterChips` | `components/ui/FilterChips.tsx` | Chips com contador de badge |
| `SearchInput` | `components/ui/SearchInput.tsx` | — |
| `ExportMenu` | `components/ui/ExportMenu.tsx` | Dropdown XLSX + CSV |
| `Toast / ToastProvider` | `components/ui/Toast.tsx` | Hook `useToast()`, 3 tipos: ok/warn/err |
| `Empty` | `components/ui/Empty.tsx` | Estado vazio genérico |
| `LineChart` | `components/ui/LineChart.tsx` | SVG puro — não usar Recharts |
| `BarsChart` | `components/ui/BarsChart.tsx` | SVG puro — não usar Recharts |
| `CardHead` | `components/ui/CardHead.tsx` | Header de card com título + ação |
| `PerfilBadge` | `components/ui/PerfilBadge.tsx` | Cores: Admin=blue, Secretário=gray, Professor=green |

**Export helpers:** `exportCSV` e `exportXLSX` do design (`ui.jsx`) funcionam no browser. Em Next.js, usar como Client Component utilities. Para dados grandes, redirecionar para Server Action que retorna blob.

---

## 17. Banco de Dados — Schema Supabase

> Schema completo com SQL está definido na SPEC anterior (v1.0 — Seção 3).
> Abaixo, apenas as referências críticas para implementação.

### 17.1 Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `auth.users` | Gerenciada pelo Supabase Auth |
| `users_profile` | Extensão de auth.users — perfil, status, precisa_trocar_senha |
| `students` | Alunos com `motivo_inativacao` e `status_atrasado_desde` |
| `teachers` | Professores com `valor_hora`, `forma_pagamento` |
| `student_teachers` | N:N aluno↔professor |
| `payments` | Mensalidades com `motivo_rejeicao`, `aprovado_por` |
| `payment_receipts` | Comprovantes com `hash_sha256` UNIQUE |
| `audit_logs` | Imutável — sem UPDATE, sem DELETE |
| `agenda` | Eventos de aula |
| `teacher_payments` | Pagamento mensal aos professores |
| `school_config` | Configurações da escola (linha única) |

**Campo adicional em `students`:**
```sql
ALTER TABLE students ADD COLUMN status_atrasado_desde timestamptz;
-- Setado quando status muda para 'Atrasado', zerado ao sair desse status.
-- Usado para filtro "Risco de inativação" (>20 dias) e cron de inativação (>30 dias).
```

**Lógica de atualização de `status_atrasado_desde`:**
- Ao marcar aluno como 'Atrasado': `SET status_atrasado_desde = now()`
- Ao mudar de 'Atrasado' para qualquer outro status: `SET status_atrasado_desde = null`
- Implementar via trigger Postgres ou na Server Action de atualização de status.

**Schema de `school_config`:**
```sql
CREATE TABLE public.school_config (
  id                        int primary key default 1 check (id = 1), -- garante linha única
  nome_instituicao          text not null default 'English School LTDA',
  dias_uteis_atraso         int not null default 5,
  dias_inativacao           int not null default 30,
  comprovante_obrigatorio   boolean not null default true,
  notificar_rejeicao        boolean not null default true,
  atualizado_por            uuid references public.users_profile(id),
  atualizado_em             timestamptz not null default now()
);

-- Inserir linha inicial:
INSERT INTO school_config (id) VALUES (1);

-- RLS: apenas Admin pode SELECT e UPDATE
ALTER TABLE school_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_admin_only" ON school_config
  USING (public.get_perfil() = 'Administrador');
```

### 17.2 Índices Críticos

```sql
CREATE UNIQUE INDEX ON payment_receipts(hash_sha256); -- antifraude
CREATE INDEX ON payments(student_id, competencia_date);
CREATE INDEX ON payments(status);
CREATE INDEX ON audit_logs(criado_em DESC);
CREATE INDEX ON agenda(teacher_id, start_at);
CREATE INDEX ON student_teachers(student_id);
CREATE INDEX ON student_teachers(teacher_id);
```

### 17.3 RLS — Resumo por Tabela

| Tabela | Admin | Secretário | Professor |
|--------|-------|-----------|-----------|
| `students` | Full | Full | SELECT via student_teachers (seus alunos apenas) |
| `payments` | Full | Full | Sem acesso |
| `payment_receipts` | Full | Full | Sem acesso |
| `teachers` | Full | Full | SELECT (próprio registro) |
| `audit_logs` | SELECT + INSERT | INSERT apenas (via função server) | INSERT apenas |
| `users_profile` | Full | SELECT (próprio + professores para exibir criado_por) | SELECT (próprio) |
| `agenda` | Full | Full | Full (próprios eventos via teacher_id) |
| `teacher_payments` | Full | Full | Sem acesso |

**Função helper RLS:**
```sql
CREATE FUNCTION public.get_perfil() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT perfil FROM users_profile WHERE id = auth.uid()
$$;
```

**Política adicional de users_profile para Secretário (leitura de criado_por):**
```sql
-- Secretário pode ler nomes de usuários para exibir "criado por" e "aprovado por"
CREATE POLICY "users_profile_readonly_names" ON public.users_profile FOR SELECT
  USING (
    public.get_perfil() = 'Secretário'
    -- acesso somente a leitura para resolver referências de nome
  );
```
⚠️ Esta policy permite que Secretário veja todos os `users_profile`. Avaliar se restringir apenas às colunas `id` e `nome` via view, dependendo do requisito de privacidade.

---

## 18. Storage — Comprovantes

**Bucket:** `comprovantes` (privado)

**Estrutura de path:** `comprovantes/{payment_id}/{hash_sha256}.{ext}`

**Acesso:** apenas usuários autenticados com perfil Admin ou Secretário.

**Download como PDF:** imagens PNG/JPG devem ser convertidas para PDF antes do download.
Usar Supabase Edge Function com `pdf-lib` ou equivalente, acionada no momento do download.

**Política de upload:** validar no servidor (Server Action) — nunca confiar no client-side para validação de hash.

---

## 19. Emails Transacionais

**Provider:** Brevo SMTP. Configurar em `lib/email.ts`.

| Template | Gatilho | Quem recebe |
|---------|---------|------------|
| `boas_vindas` | Criação de usuário | Novo usuário |
| `recuperacao_senha` | Esqueci minha senha | Usuário solicitante |
| `rejeicao_comprovante` | Rejeição de comprovante | Aluno (email do student) |
| `lembrete_vencimento` | Dia do vencimento (PIX/Boleto) | Aluno |
| `cobranca_pos_vencimento` | Diariamente pós-vencimento | Aluno inadimplente |

Lembretes e cobranças: disparar via Vercel Cron + query de vencimentos do dia.

---

## 20. Auditoria — Helper Centralizado

**Arquivo:** `lib/audit.ts`

```typescript
// Interface padrão — usar em todos os Server Actions
async function insertAuditLog({
  usuarioId,   // auth.uid() ou null para ações automáticas
  perfil,      // do users_profile
  acao,        // string descritiva
  entidade,    // 'Aluno' | 'Financeiro' | 'Usuário' | etc.
  entidadeId,  // UUID da entidade afetada
  dadosAntes,  // JSON (optional)
  dadosDepois, // JSON (optional)
  ip,          // request headers
  userAgent,   // request headers
})
```

**Capturar IP e UserAgent:** em Server Actions, via `headers()` do Next.js.

---

## 21. Regras de Negócio Críticas para Implementação

Estas regras devem ser verificadas **no servidor** (Server Actions / RLS) — nunca apenas no frontend.

| Regra | Onde verificar |
|-------|---------------|
| Comprovante obrigatório (PIX/Boleto) | Server Action de criação de payment |
| Hash SHA256 único | `payment_receipts.hash_sha256` UNIQUE INDEX |
| Pagamento parcial proibido para alunos | Server Action: `valor_pago` deve igual `valor_previsto` |
| Pagamento parcial permitido para professores | Sem restrição |
| Admin não pode inativar a si mesmo | Server Action com verificação de `auth.uid()` |
| Aluno inativo não pode ser agendado | Server Action de criação de agenda |
| Perfil de usuário não é editável | Coluna `perfil` sem UPDATE na policy do Secretário |
| Auditoria imutável | RLS: sem UPDATE, sem DELETE em `audit_logs` |
| Professor só vê seus alunos | RLS via `student_teachers` |
| Secretário não vê métricas financeiras globais | Controle no Server Component (não executar query) |

---

## 22. Decisões Técnicas Fixadas

| Decisão | Escolha |
|---------|---------|
| Bloqueio após 5 tentativas | Delegado ao Supabase Auth — não implementar custom |
| Gráficos | SVG puro conforme design — sem Recharts, sem Chart.js |
| Exportação para PDF | Server-side via Edge Function |
| SHA256 de comprovante | Web Crypto API client-side + verificação server-side |
| DemoAccordion no login | Remover em produção |
| Sessão | Supabase Auth cookies — não usar JWT manual |
| Cron de inativação | Vercel Cron diário às 02:00 UTC |
| Internacionalização | Somente Português do Brasil — sem i18n library |
