# §0 — Decisões Explícitas e Divergências Design × PRD

> **Leitura obrigatória antes de qualquer sprint.**
> Onde o design e o PRD divergem, este arquivo é a fonte de verdade.

---

## §0.1 — Criação de Aulas na Agenda — PRD prevalece sobre o Design

**O design** (`screens-agenda.jsx`) restringe `canEdit = isProf` (apenas Professor cria aulas).
**O PRD** (§20.2) define: Admin ✅, Secretário ✅, Professor ❌ para criação de aulas.

**Decisão:** seguir o PRD. Na implementação:
- Admin e Secretário podem criar, reagendar e cancelar aulas
- Professor tem visualização somente leitura da sua própria agenda
- Ajustar `canEdit` na implementação para `perfil !== 'Professor'`

---

## §0.2 — Agendamento para Alunos com Status "Atrasado"

**O design** bloqueia agendamento para "Inativo" E "Atrasado".
**O PRD** (§20.3) bloqueia apenas "Inativo".

**Decisão:** seguir o PRD. Apenas alunos com `status = 'Inativo'` bloqueiam novo agendamento. "Atrasado" exibe aviso amber mas permite agendar. Ajustar `isBlocked` para verificar somente `'Inativo'`.

---

## §0.3 — Módulo Relatórios — Acesso do Secretário

**O design** e o Middleware da SPEC anterior definiam `/relatorios` como Admin exclusivo.
**O PRD** (§23) permite que Secretário exporte Base de alunos, Lançamentos e Inadimplência, mas NÃO Trilha de auditoria.

**Decisão:** seguir o PRD.
- Secretário acessa `/relatorios` e vê: Base de alunos, Lançamentos financeiros, Inadimplência, Professores
- Admin vê todos + Trilha de auditoria
- Ajustar Middleware para permitir Secretário em `/relatorios`
- Controlar visibilidade do card "Trilha de auditoria" via verificação de perfil no Server Component

---

## §0.4 — Campo "Risco de Inativação" — Coluna `status_desde`

O campo `atualizado_em` em `students` é atualizado a cada edição, não apenas na mudança de status. Usar como proxy de tempo em atraso é impreciso.

**Decisão:** adicionar campo `status_atrasado_desde` (timestamptz, nullable) na tabela `students`. Esse campo é setado quando o status muda para 'Atrasado' e zerado ao sair desse status. O widget "Risco de Inativação" filtra `status_atrasado_desde < now() - interval '20 days'`.

---

## §0.5 — Elementos do Design a Remover na Implementação

Os seguintes elementos existem no design por razões de prototipagem e **NÃO devem ser implementados em produção**:

| Elemento | Arquivo de Design | Ação |
|----------|------------------|------|
| `DemoAccordion` (acessos de demonstração) | `screens-auth.jsx` | Remover completamente |
| Campo "Idioma" em Minha Conta | `screens-audit.jsx` → `MinhaContaScreen` | Remover — sistema é somente PT-BR |
| Ícone de sino (notificações) no Topbar | `layout.jsx` → `Topbar` | Remover — sem sistema de notificações in-app na V1 |
| Mock data (`window.ESM`) | `data.js` | Substituir por queries Supabase reais |

---

## §0.6 — Senha Temporária — Algoritmo Padrão

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

---

## §0.7 — Mensagem de Hash Duplicado — Deve Incluir Contexto

**PRD §16.5:** "Este comprovante já foi utilizado para [Nome do Aluno] na competência [mês/ano]."

O Server Action de upload deve retornar, ao detectar duplicata:
```typescript
{ error: 'DUPLICATE_HASH', context: { alunoNome: string, competencia: string } }
```
O frontend usa `context` para popular a mensagem exibida no estado `duplicata` do `ComprovanteUploader`.
