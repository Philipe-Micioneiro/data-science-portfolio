# §14 — Módulo: Configurações (Admin exclusivo)

**Design:** `screens-audit.jsx` → `ConfigScreen`
**Rota:** `/configuracoes`

---

## Dados

Buscar de uma tabela `school_config` com uma única linha.
Schema completo em `17-banco-de-dados-schema.md §17.1`.

## Campos

| Campo | Tipo | Default |
|-------|------|---------|
| `nome_instituicao` | texto | 'English School LTDA' |
| `dias_uteis_atraso` | inteiro | 5 |
| `dias_inativacao` | inteiro | 30 |
| `comprovante_obrigatorio` | boolean | true |
| `notificar_rejeicao` | boolean | true |

## Ação

```
UPDATE school_config SET nome_instituicao, dias_uteis_atraso, dias_inativacao, comprovante_obrigatorio, notificar_rejeicao, atualizado_por=auth.uid(), atualizado_em=now()
→ insertAuditLog({ acao: 'Configurações alteradas', dados_antes, dados_depois })
→ Toast de confirmação
```

## UI

**Toggles:** ver design `ConfigScreen` → componente `Toggle` inline. Replicar comportamento visual exatamente conforme `design: screens-audit.jsx`.
