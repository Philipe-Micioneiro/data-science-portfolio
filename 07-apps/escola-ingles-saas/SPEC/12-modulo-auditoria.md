# §12 — Módulo: Auditoria (Admin exclusivo)

**Design:** `screens-audit.jsx` → `AuditoriaScreen`
**Rota:** `/auditoria`

---

## Dados

```sql
SELECT al.*, up.nome AS usuario_nome, up.perfil AS usuario_perfil
FROM audit_logs al
LEFT JOIN users_profile up ON up.id = al.usuario_id
ORDER BY al.criado_em DESC
LIMIT 500; -- paginação ou scroll infinito em produção
```

## Filtros (server-side)

- `usuario_id`
- `acao`
- `entidade`
- período (date range)
- busca livre (`acao ILIKE '%x%'` ou `alvo ILIKE '%x%'`)
- `ip` (`ILIKE '%x%'`)

## RLS

Apenas Admin pode fazer SELECT em `audit_logs`. Ver `17-banco-de-dados-schema.md §17.3`.

## Imutabilidade

Sem UPDATE, sem DELETE em `audit_logs`. Garantido via RLS (apenas INSERT permitido via função server-side).

## Export

`insertAuditLog({ acao: 'Trilha de auditoria exportada', dados_depois: { filtros } })`.
