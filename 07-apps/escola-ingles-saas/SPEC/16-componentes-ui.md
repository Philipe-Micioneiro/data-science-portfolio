# §16 — Componentes UI — Mapeamento do Design

**Design:** `ui.jsx`

Todos os componentes abaixo devem ser implementados **pixel-perfect** conforme o design. Não usar bibliotecas de componentes externas para estes primitivos — replicar do JSX.

---

## Mapeamento Completo

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

---

## Export Helpers

`exportCSV` e `exportXLSX` do design (`ui.jsx`) funcionam no browser. Em Next.js, usar como Client Component utilities. Para dados grandes, redirecionar para Server Action que retorna blob.
