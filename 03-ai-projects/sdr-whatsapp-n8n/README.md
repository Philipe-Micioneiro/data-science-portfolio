# SDR automatizado via WhatsApp (n8n + IA) / Automated WhatsApp SDR (n8n + AI)

**PT:** Arquitetura e requisitos de um agente de **SDR com IA** que atende leads de uma escola de inglês pelo WhatsApp: resposta imediata 24/7, roteiro de qualificação (objetivo, nível, urgência, disponibilidade), base de conhecimento com **RAG**, processamento de áudio, imagem e PDF, agendamento no Google Calendar, registro em CRM e **handoff** contextualizado para o closer. A ideia central: não substituir o closer, mas entregar leads quentes e bem preparados.

**EN:** Architecture and requirements for an **AI SDR agent** that handles English-school leads over WhatsApp: instant 24/7 replies, a qualification script (goal, level, urgency, availability), a **RAG** knowledge base, audio/image/PDF processing, Google Calendar scheduling, CRM logging and a context-rich **handoff** to the closer. Core idea: not replacing the closer, but delivering warm, well-prepared leads.

## Documentos / Documents

- [`PRD.md`](PRD.md) — requisitos do produto / product requirements
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — domínios, subworkflows e desenho técnico / domains, sub-workflows and technical design
- [`system-prompt-micioneira.md`](system-prompt-micioneira.md) — prompt de sistema do agente / agent system prompt

## Stack

n8n · LLMs · RAG · WhatsApp · Google Calendar · Google Sheets · MCP (n8n)