# Dashboard executivo de vendas / Executive sales dashboard

**PT:** Dashboard em Power BI com **modelo estrela** (fato de pedidos + dimensões de itens, clientes, metas e calendário), medidas **DAX** (faturamento, ticket médio, crescimento MoM, YTD, top 5 produtos, atingimento de meta) e interatividade com **parâmetros de campo** (alternância entre valores absolutos e percentuais) e **bookmarks** (alternância de gráficos). Inclui uma página de conclusão com leitura de negócio. **Os dados são fictícios.**

**EN:** Power BI dashboard with a **star schema** (orders fact + items, customers, targets and calendar dimensions), **DAX** measures (revenue, average ticket, MoM growth, YTD, top 5 products, target attainment) and interactivity through **field parameters** (absolute vs. percentage toggle) and **bookmarks** (chart switch). Includes a closing page with business insights. **All data is synthetic.**

## Conteúdo / Contents

- `AB.pbip` — projeto do Power BI (abrir no Power BI Desktop) / Power BI project (open in Power BI Desktop)
- `AB.SemanticModel/` — modelo semântico em TMDL (tabelas, relacionamentos, medidas) / semantic model in TMDL
- `AB.Report/` — definição do relatório / report definition

## Destaques técnicos / Highlights

- Faturamento correto por pedido: a coluna de receita se repete por item, então a medida desduplica por `order_id` antes de somar.
- Correct revenue per order: the revenue column repeats per line item, so the measure de-duplicates by `order_id` before summing.