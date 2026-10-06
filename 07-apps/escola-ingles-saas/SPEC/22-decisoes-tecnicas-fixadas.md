# §22 — Decisões Técnicas Fixadas

> Estas decisões são imutáveis para a V1. Não questionar — implementar conforme definido.

---

| Decisão | Escolha |
|---------|---------|
| Bloqueio após 5 tentativas de login | Delegado ao Supabase Auth — não implementar custom |
| Gráficos | SVG puro conforme design (`ui.jsx`) — sem Recharts, sem Chart.js |
| Exportação de comprovante para PDF | Server-side via Edge Function com `pdf-lib` |
| SHA256 de comprovante | Web Crypto API client-side + verificação server-side obrigatória |
| DemoAccordion no login | Remover em produção |
| Sessão | Supabase Auth cookies — não usar JWT manual |
| Cron de inativação | Vercel Cron diário às 02:00 UTC |
| Internacionalização | Somente Português do Brasil — sem i18n library |
| Senha temporária | Algoritmo fixado em `00-decisoes-e-divergencias.md §0.6` |
| Comprovante obrigatório (PIX/Boleto) | Verificado server-side, não apenas frontend |
| Admin criando Admin | Bloqueado — apenas Secretário e Professor podem ser criados pelo fluxo de usuários |
