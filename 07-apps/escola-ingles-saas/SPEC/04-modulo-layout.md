# §4 — Módulo: Layout Autenticado

**Design:** `layout.jsx`

---

## §4.1 — Sidebar

**Componente design:** `Sidebar`

Dados necessários da sessão:
- `user.perfil` → determina qual `NAV` renderizar
- `pendingCount` → quantidade de pagamentos com `status = 'Pendente de Validação'` na competência atual

**Query para badge de Validações:**
```sql
SELECT COUNT(*) FROM payments WHERE status = 'Pendente de Validação';
```
Ideal: Supabase Realtime subscription para atualização em tempo real do badge.

---

## §4.2 — Topbar

**Componente design:** `Topbar`

Dados: `user.nome`, `user.perfil` (da sessão). Sem query adicional.

Toggle dark mode: persistir em `localStorage` + `data-theme` no `<html>`.

**Ícone de sino:** remover em produção. Ver `00-decisoes-e-divergencias.md §0.5`.
