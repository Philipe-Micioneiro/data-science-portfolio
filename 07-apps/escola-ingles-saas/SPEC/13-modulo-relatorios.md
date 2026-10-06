# §13 — Módulo: Relatórios

**Design:** `screens-audit.jsx` → `RelatoriosScreen`
**Rota:** `/relatorios`

> ⚠️ **Acesso do Secretário:** ver `00-decisoes-e-divergencias.md §0.3`. O Middleware permite Secretário em `/relatorios`, mas o card "Trilha de auditoria" é ocultado via verificação de perfil no Server Component.

---

## Relatórios disponíveis (cards com XLSX + CSV)

| Relatório | Query base | Quem vê |
|-----------|-----------|---------|
| Base de alunos | `SELECT * FROM students JOIN student_teachers...` | Admin + Secretário |
| Lançamentos financeiros | `SELECT * FROM payments JOIN students...` | Admin + Secretário |
| Inadimplência | `SELECT * FROM payments WHERE status='Atrasado' JOIN students...` | Admin + Secretário |
| Professores | `SELECT * FROM teachers LEFT JOIN student_teachers... LEFT JOIN students...` | Admin + Secretário |
| Trilha de auditoria | `SELECT * FROM audit_logs JOIN users_profile...` | **Apenas Admin** |

## Regras de Acesso

- Card "Trilha de auditoria": `perfil === 'Administrador'` no Server Component
- Middleware deve permitir Secretário em `/relatorios` (ajuste de `02-middleware-autenticacao.md`)

## Dados Exportados

Cada card exporta os dados completos da entidade sem filtros adicionais. Filtros das telas de origem (Alunos, Financeiro) não se aplicam aqui — esta tela é para exportações completas de cada módulo.

## Auditoria

Toda exportação registra:
```
insertAuditLog({ acao: 'Relatório exportado', dados_depois: { tipo_relatorio, formato, total_registros } })
```
