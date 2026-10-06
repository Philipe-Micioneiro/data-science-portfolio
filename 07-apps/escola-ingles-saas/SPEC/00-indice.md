# SPEC — English School Manager
## Índice de Arquivos
> Versão 2.1 — 03/06/2026 (pós-revisão crítica)

Esta pasta contém a SPEC técnica quebrada por módulo para facilitar a consulta dos agentes de desenvolvimento. Cada arquivo cobre exatamente uma seção da SPEC original.

**Como usar:**
- Consulte o arquivo específico do módulo que está implementando
- Antes de qualquer sprint, leia obrigatoriamente `00-decisoes-e-divergencias.md`
- Para banco de dados, consulte `17-banco-de-dados-schema.md`
- Para referências visuais, consulte os arquivos em `../English School SaaS-handoff/english-school-saas/project/`

---

| Arquivo | Conteúdo | Sprints que usam |
|---------|----------|-----------------|
| [00-decisoes-e-divergencias.md](00-decisoes-e-divergencias.md) | Decisões explícitas onde PRD prevalece sobre design + elementos a remover | TODAS |
| [01-stack-e-estrutura-geral.md](01-stack-e-estrutura-geral.md) | Tech stack, estrutura de pastas Next.js, design tokens, perfis e navegação | Sprint 0 |
| [02-middleware-autenticacao.md](02-middleware-autenticacao.md) | Guard de sessão, redirects por perfil, rotas restritas | Sprint 0 |
| [03-modulo-autenticacao.md](03-modulo-autenticacao.md) | Login, Primeiro Acesso, Recuperação e Redefinição de senha | Sprint 1A |
| [04-modulo-layout.md](04-modulo-layout.md) | Sidebar, Topbar, dark mode, badge Realtime | Sprint 1B |
| [05-modulo-dashboard.md](05-modulo-dashboard.md) | Admin Dashboard, Secretária Dashboard, Professor Dashboard | Sprint 2A |
| [06-modulo-usuarios.md](06-modulo-usuarios.md) | CRUD de usuários, criação com senha temp, reset de senha | Sprint 2B |
| [07-modulo-alunos.md](07-modulo-alunos.md) | Listagem, cadastro, detalhe/edição, inativação, cron automático | Sprint 3A |
| [08-modulo-professores.md](08-modulo-professores.md) | Listagem, criar/editar professor, detalhe, inativar/reativar | Sprint 2C |
| [09-modulo-agenda.md](09-modulo-agenda.md) | Visualização, criar/reagendar/cancelar aulas, permissões por perfil | Sprint 3B |
| [10-modulo-financeiro-alunos.md](10-modulo-financeiro-alunos.md) | Listagem pagamentos, registrar pagamento, upload SHA256, validações | Sprint 4A |
| [11-modulo-financeiro-professores.md](11-modulo-financeiro-professores.md) | Listagem e pagamento a professores com suporte parcial | Sprint 4B |
| [12-modulo-auditoria.md](12-modulo-auditoria.md) | Tela de auditoria, filtros, imutabilidade, export | Sprint 5 |
| [13-modulo-relatorios.md](13-modulo-relatorios.md) | Cards de relatório, queries, controle de acesso por perfil | Sprint 5 |
| [14-modulo-configuracoes.md](14-modulo-configuracoes.md) | school_config, campos, toggles, auditoria de alterações | Sprint 5 |
| [15-modulo-minha-conta.md](15-modulo-minha-conta.md) | Dados pessoais, troca de senha, Professor | Sprint 5 |
| [16-componentes-ui.md](16-componentes-ui.md) | Mapeamento de todos os primitivos UI de ui.jsx para Next.js | Sprint 1B |
| [17-banco-de-dados-schema.md](17-banco-de-dados-schema.md) | Schema completo, índices críticos, RLS por tabela, função get_perfil() | Sprint 0 |
| [18-storage-comprovantes.md](18-storage-comprovantes.md) | Bucket, estrutura de path, acesso, Edge Function PDF | Sprint 0 + Sprint 6 |
| [19-emails-transacionais.md](19-emails-transacionais.md) | Templates, gatilhos, provider Brevo SMTP | Sprint 6 |
| [20-auditoria-helper.md](20-auditoria-helper.md) | Interface insertAuditLog, captura de IP/UserAgent | Sprint 0 |
| [21-regras-negocio-criticas.md](21-regras-negocio-criticas.md) | Regras que devem ser verificadas no servidor (não só no frontend) | Sprint 7 |
| [22-decisoes-tecnicas-fixadas.md](22-decisoes-tecnicas-fixadas.md) | Tabela de decisões técnicas imutáveis para a V1 | Sprint 7 |
