# PRD — SDR Automatizado para Escola de Inglês via WhatsApp
**Product Requirements Document**

**Versão**: 2.0 (alinhamento estratégico + estado pós-Fase 0)
**Data**: 2026-05-19
**Autor**: Análise via Claude Code + MCP n8n

---

## ⭐ DIRETRIZ CENTRAL

> **"O objetivo da Micioneira não é substituir o closer. O objetivo é entregar leads quentes, contextualizados e emocionalmente preparados para que o closer tenha máxima taxa de conversão."**

---

## 1. Visão Geral do Produto

### 1.1 O que é

Um sistema de SDR (Sales Development Representative) automatizado baseado em IA que opera via WhatsApp para escolas de inglês. A agente Micioneira recebe leads, conduz um roteiro de qualificação empático e agenda reuniões com closers humanos — entregando contexto completo para que o fechamento seja eficiente.

### 1.2 Problema que resolve

- Alto volume de leads entrando via WhatsApp sem atendimento imediato (velocidade)
- Closers perdendo tempo fazendo triagem ao invés de fechar vendas (eficiência)
- Leads "quentes" sendo perdidos por demora no primeiro contato (conversão)
- Closer chegando à reunião sem contexto sobre o lead (qualidade do handoff)
- Falta de dados estruturados sobre motivação real e objeções do lead (inteligência comercial)

### 1.3 O que o sistema FAZ e NÃO FAZ

**FAZ:**
- Responde imediatamente (24/7) a leads via WhatsApp
- Conduz roteiro de qualificação empático (objetivo → nível → urgência → disponibilidade)
- Responde dúvidas sobre a escola usando base de conhecimento (RAG)
- Agenda reunião no Google Calendar com closer
- Grava dados do lead no CRM (Google Sheets)
- Envia briefing contextualizado ao closer *(SW-C — a construir)*
- Processa áudio (Whisper), imagem (Vision) e PDF

**NÃO FAZ:**
- Fechar vendas — isso é o closer humano
- Negociar preços finais ou condições especiais
- Gerir agenda de alunos existentes
- Disparar campanhas de marketing
- Substituir o relacionamento humano no fechamento

### 1.4 Público-alvo real e perfil emocional

- **Leads (alunos potenciais)**: chegam com sonhos reais (viagem, promoção, mudança de país, aprovação em exame). Frequentemente inseguros com o próprio nível de inglês. Respondem a acolhimento e encorajamento — não a urgência artificial ou pressão de vendas. **Empatia converte mais do que argumentação**.
- **Closers**: recebem leads já qualificados, com contexto completo. Não fazem triagem. Chegam à reunião sabendo exatamente quem é o lead e qual é sua motivação real.
- **Operadores da escola**: monitoram pipeline, ajustam roteiro, expandem a base de conhecimento.

### 1.5 O papel do closer — arquiteturalmente crítico

O closer **não é fallback. Não é exceção. Não é "quando o bot falha".**

O closer é a etapa central de conversão. A Micioneira existe para alimentar o closer com qualidade, não para substituí-lo. O sucesso do sistema se mede pela taxa de fechamento do closer — não pela capacidade do agente de responder bem.

---

## 2. Estado Atual — Análise Técnica do Workflow Existente

### 2.1 Identificação do Workflow

| Campo | Valor |
|-------|-------|
| **ID** | R9ANaIMASulKJxcL |
| **Nome** | SDR - Agente de Prospecção de Leads |
| **Status** | Inativo (em refatoração) |
| **Criado em** | 2026-04-26 |
| **Última atualização** | 2026-05-19 |
| **Total de nodes** | ~217 nodes |
| **Subworkflows** | 0 (ZERO) |
| **Nodes desabilitados** | 17 |

### 2.2 Arquitetura Atual — Mapa Completo

#### Gatilhos (Triggers)
```
[Webhook EVO]          → WhatsApp (Evolution API) — ATIVO
[Novos Arquivos]       → Google Drive Trigger — DESABILITADO
[Novas Atualizações]   → Google Drive Trigger — DESABILITADO
[File Created]         → Google Drive Trigger — DESABILITADO
[File Updated]         → Google Drive Trigger — DESABILITADO
[Webhook QR Code]      → Setup instância — utilitário
```

#### Fluxo principal de entrada (caminho feliz)

```
1. [Webhook EVO] ← recebe mensagem WhatsApp via Evolution API
   ↓
2. [Variáveis do Fluxo] ← configura todas as variáveis da sessão (Set node)
   Variáveis: nomeDoLead, usarElevenLabs, apiKey_eleven, voiceIdElevenLabs,
              TempoInatividadeAgente, modeloTemperatura, humanizadorMensagem,
              EsperaMemoria, AppName, botPhoneNumber, gerarHistoricoConversa
   ↓
3. [Valida se Humano está enviando mensagem] ← IF: filtra mensagens do bot
   ↓ (sim, é humano)
4. [Valida WhiteList] ← Google Sheets — DESABILITADO
   ↓
5. [Busca Memória da Conversa1] ← Redis: busca estado atual da sessão
   ↓
6. [Valida se Bot Esta Ativo] ← IF: verifica se bot está ativo para este número
   ↓ (bot ativo)
7. [Busca se o Lead é Cliente] ← Supabase: lookup de lead existente
   ↓
8. [Verifica se encontrou o cliente] ← IF
   ├── (não encontrou) → [Cadastra Lead] ← Supabase: cria novo registro
   └── (encontrou) → continua
   ↓ [Junta Retorno] ← Merge
9. [Identifica o Tipo de Mensagem] ← Switch (roteamento por tipo)
```

#### Roteamento por tipo de mensagem (Switch)

```
[Identifica o Tipo de Mensagem]
   ├── Texto → [Mensagem de Texto]
   │           → [Adiciona Texto na Memoria] ← Redis
   ├── ExtendedText → [Mensagem Extendida de Texto]
   │                 → [Adiciona Texto na Memoria]
   ├── Audio → [Mensagem de Audio]
   │           → [Converte Audio base64 para File]
   │           → [Transcreve Audio com OpenAI] ← Whisper
   │           → [Adiciona Audio Na Memória] ← Redis
   ├── Imagem → [Mensagem com Imagem] (MensagemImagem)
   │            → [Converte Imagem Base64 para File]
   │            → [Traduz Imagem em Texto] ← LLM Vision
   │            → [Adiciona Imagem na Memória] ← Redis
   ├── Documento → [Mensagem com Documento]
   │               → [Convert Documento base64 para Arquivo]
   │               → [Extrai Dados do PDF]
   │               → [Adiciona Documento na Memória] ← Redis
   └── Erro → [Mensagem de Erro - Formato não suportado]
              → [Adiciona Erro na Memória] ← Redis
```

#### Sistema de debounce (anti-flood)

```
[Adiciona {tipo} na Memória] ← Redis
   ↓
[Memória Temporária] ← Redis: marca "processando"
   ↓
[Espera Tempo Definido] ← Wait node (configurable)
   ↓
[Busca mensagens da Memória] ← Redis
   ↓
[Verifica se houve troca de mensagem] ← IF
   ├── (houve troca - nova mensagem chegou) → [Se houve não faz nada e aguarda]
   └── (sem troca - pode processar)
       ↓
   [Limpa a Memória Temporária] ← Redis
       ↓
   [Seta Mensagem para o Agente] ← Set
```

#### O Agente IA (core)

```
[Camis - Agente SDR] ← @n8n/n8n-nodes-langchain.agent
   ├── LLM: [4o-mini] ← OpenAI GPT-4o-mini
   ├── Memória: [Memória do Agente] ← Redis Chat Memory
   └── Tools (11):
       ├── [Calculator] — cálculos
       ├── [Think] — raciocínio interno (LangChain Think Tool)
       ├── [Base de Conhecimento] — Pinecone RAG (ATIVO)
       ├── [Base Conhecimento SUPABASE] — Supabase RAG (DESABILITADO)
       ├── [Listar] — Google Calendar: listar eventos
       ├── [Agendar] — Google Calendar: criar evento
       ├── [Verificar Disponibilidade] — Google Calendar: checar slots
       ├── [Reagendar] — Google Calendar: reagendar evento
       ├── [Cancelar] — Google Calendar: cancelar evento
       ├── [Gravar no CRM] — Google Sheets Tool: salvar lead
       └── [Desativar Agente] — Redis Tool: desligar bot
```

#### Pipeline de saída (pós-agente)

```
[Camis - Agente SDR]
   ├── → [Calcula Tokens - Tools] → [Grava Billing do Agent no Supabase]
   └── → [Saida do Agente] ← Set: extrai campo "texto" da resposta
           ↓
       [Verifica se deve humizar] ← IF (flag humanizadorMensagem)
           ├── (sim) → [Estrutura da Mensagem de Retorno] ← LLM Chain (OpenRouter)
           │            Prompt: divide mensagem longa em partes naturais
           │            Output Parser: JSON estruturado
           └── (não) → continua direto
           ↓
       [Seta o Tipo de Retorno JSON] ← Set
           ↓
       [Ajusta o Parse do JSON]
           ↓
       [Quebra Mensagens em várias Linhas] ← SplitOut
           ↓
       [Itera sobre cada mensagem] ← SplitInBatches
           ↓
       [Verifica se deve gerar audio] ← IF (flag usarElevenLabs)
           ├── (sim) → [Se o retorno for menos de 300 chars gera voz] ← IF
           │           ├── (< 300 chars)
           │           │   → [Seta Voz via ElevenLabs] ← HTTP Request (ElevenLabs API)
           │           │   → [Converte mp3 pra Base64]
           │           │   → [Formata Mensagem para Áudio] ← Set
           │           │   → [Envia Audio para o WhatsApp] ← HTTP Request (Evolution API)
           │           └── (>= 300 chars)
           │               → [Não gera Voz]
           │               → [Espera 2 segundos] ← Wait
           │               → [Seta Personalidade do Assistente] ← Set
           │               → [LLM ChatGPT] ← OpenRouter
           │               → [Enviar Mensagem no WhatsApp] ← HTTP Request (Evolution API)
           └── (não) → [Não gera audio]
                       → [Espera 2 segundos] ← Wait
                       → [Seta Personalidade do Assistente]
                       → [LLM ChatGPT] ← OpenRouter
                       → [Enviar Mensagem no WhatsApp]
```

#### Base de conhecimento (ingestão)

```
[Google Drive Trigger: Novos Arquivos / Novas Atualizações] ← DESABILITADO
   ↓
[Conhecimento] → [Insere no Pinecone]
   ├── [Default Data Loader] ← Enhanced Document Loader
   ├── [Recursive Character Text Splitter]
   └── [Embeddings OpenAI2]

[Supabase Vector Pipeline] (parallel, ativos mas desconectados)
   [Google Drive Trigger] → download → identify type →
   → extract (PDF/TXT/Excel/GoogleDocs) → aggregate → summarize →
   → [Insere no Supabase Vector]
```

#### Funcionalidades utilitárias

```
[Setup / QR Code]
   [Webhook] → [Pagina do QR Code] ← HTML
   [Webhook] → [criar-instancia-evolution] ← HTTP
   [Webhook] → [Atualiza qr code]
   [Webhook] → [Seta WebHook] / [Atualiza WebHook] / [Seta Settings]

[Gerenciamento de Sessão]
   [Desativar Agente] ← Redis Tool (via agente)
   [Limpa Memória da Conversa1]
   [Envia mensagem de Agente Parado]
   [Envia Mensagem de Agente Iniciado]
   [Remove Cliente]

[Histórico de Mensagens] (Supabase)
   [Verifica se gera histórico mensagem]
   → [Busca Dados] → [Verifica se encontrou]
   → [Adiciona Mensagem] ou [Atualiza Mensagem]
   → [Cria Mensagem no Supabase]
```

### 2.3 System Prompt Atual (Camis SDR)

**PROBLEMA CRÍTICO**: O prompt atual está configurado para vender bots de IA para imobiliárias. Precisa ser completamente reescrito para escola de inglês.

**Resumo do prompt atual:**
- Identidade: "Camis, SDR especialista em bots para Imobiliárias"
- Objetivo: vender bot de WhatsApp para imobiliárias
- Fluxo: apresentação → desafios do lead → qualificação → fechar venda do bot
- Regras: máx 500 chars, uma pergunta por vez, usar tools de agenda

### 2.4 LLMs em uso

| Node | Modelo | Provider | Uso |
|------|--------|----------|-----|
| 4o-mini | GPT-4o-mini | OpenAI | Agente principal |
| LLM ChatGPT | (configurar) | OpenRouter | Personalidade de resposta final |
| Estrutura da Mensagem de Retorno | (configurar) | OpenRouter | Humanizador/formatador |
| OpenAI Chat Model1 | GPT-4o | OpenAI | Base de conhecimento Pinecone |
| GPT 4o-min | GPT-4o-mini | OpenRouter | DESABILITADO |
| Jarvis (template) | (irrelevante) | - | Outro workflow |

---

## 3. Diagnóstico Crítico

### 3.1 Riscos de Produção

#### CRÍTICO — Impede uso correto em produção

| # | Risco | Descrição | Impacto |
|---|-------|-----------|---------|
| R1 | **Identidade errada** | System prompt fala de imobiliárias, não inglês | Experiência de usuário incorreta |
| R2 | **Sem qualificação estruturada** | Não há score de lead, sem temperatura | Closer não sabe priorizar |
| R3 | **Sem handoff para closer** | Agendamento vai para calendário mas closer não é notificado com contexto | Leads quentes sem ação |
| R4 | **Workflow monolítico** | 217 nodes em um fluxo, zero subworkflows | Impossível manter/evoluir |

#### ALTO — Compromete confiabilidade

| # | Risco | Descrição |
|---|-------|-----------|
| R5 | **Race condition no debounce** | Wait node pode acumular execuções paralelas com múltiplas mensagens rápidas |
| R6 | **Redis como SPOF** | Memória conversacional e estado do bot dependem exclusivamente de Redis |
| R7 | **Ingestão de conhecimento quebrada** | Google Drive triggers desabilitados — base de conhecimento não se atualiza automaticamente |
| R8 | **Nodes desabilitados com status ambíguo** | 17 nodes desabilitados sem documentação de motivo |

#### MÉDIO — Compromete escalabilidade e custo

| # | Risco | Descrição |
|---|-------|-----------|
| R9 | **Múltiplos LLMs sem orquestração clara** | 4 modelos diferentes sem documentação de uso |
| R10 | **ElevenLabs sem controle de custo** | TTS disparado por volume de mensagens sem teto |
| R11 | **Dois vector stores ativos** | Pinecone e Supabase concorrem sem estratégia clara |
| R12 | **11 tools em um único agente** | Sobrecarga de contexto, latência aumentada, maior custo |

### 3.2 Gargalos de Performance

1. **Pipeline de resposta com 2 LLMs em série**: agente (GPT-4o-mini) + humanizador (OpenRouter) + personalidade (OpenRouter) = latência de 3 chamadas LLM
2. **Wait node de debounce** bloqueia execuções em fila
3. **Transcriçao de áudio + vision sempre síncronos** no caminho principal
4. **ElevenLabs síncrono** na mesma execução da resposta textual

### 3.3 Oportunidades de Simplificação

1. **Remover LLM de personalidade final**: OpenRouter chamado para "personalidade Jarvis" na mensagem de saída — isso não faz sentido para SDR de inglês
2. **Consolidar vector stores**: escolher Pinecone OU Supabase, não ambos
3. **Separar TTS em subworkflow assíncrono**: não bloquear resposta textual
4. **Consolidar múltiplos Redis nodes** em operações atômicas

---

## 4. Proposta de Nova Arquitetura

### 4.1 Princípios de Design

1. **Responsabilidade única por workflow**: cada subworkflow faz uma coisa
2. **Stateless onde possível**: workflows não carregam estado desnecessário
3. **Falha explícita**: toda falha deve ser tratada e registrada
4. **Observabilidade por design**: todo workflow emite eventos de monitoramento
5. **Custo controlado**: TTS e LLM extras sempre condicionais e mensurados

### 4.2 Mapa de Subworkflows Propostos

```
┌─────────────────────────────────────────────────────────────┐
│                    CAMADA DE ENTRADA                         │
│                                                              │
│  [SDR-01: Entrada WhatsApp]                                 │
│  Trigger: Webhook Evolution API                             │
│  Responsabilidade: receber, validar, normalizar mensagem    │
│  Outputs: tipo_mensagem, conteudo_normalizado, lead_id      │
└──────────────────────┬──────────────────────────────────────┘
                       ↓ executeWorkflow
┌─────────────────────────────────────────────────────────────┐
│                 CAMADA DE PROCESSAMENTO                      │
│                                                              │
│  [SDR-02: Processamento de Mensagem]                        │
│  Responsabilidade: transcrever áudio, descrever imagem,     │
│  extrair texto de documentos, consolidar em texto           │
│  Outputs: mensagem_texto (sempre texto)                     │
└──────────────────────┬──────────────────────────────────────┘
                       ↓ executeWorkflow
┌─────────────────────────────────────────────────────────────┐
│                   CAMADA DE SESSÃO                           │
│                                                              │
│  [SDR-03: Gerenciamento de Sessão]                          │
│  Responsabilidade: debounce, cadastro de lead,              │
│  estado do bot, histórico de mensagens                      │
│  Outputs: lead_data, pode_processar (bool)                  │
└──────────────────────┬──────────────────────────────────────┘
                       ↓ executeWorkflow
┌─────────────────────────────────────────────────────────────┐
│                   CAMADA DO AGENTE                           │
│                                                              │
│  [SDR-04: Agente SDR Escola de Inglês]                      │
│  Responsabilidade: conversa, qualificação, agendamento      │
│  LLM: GPT-4o-mini                                          │
│  Tools: calendar, CRM, knowledge base, think, disable       │
│  Outputs: resposta_texto, lead_score, acao_tomada           │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
              ┌────────┴────────┐
              ↓                 ↓
┌─────────────────┐   ┌────────────────────────┐
│ [SDR-05: Output] │   │ [SDR-06: Qualificação] │
│ Envio de msg    │   │ Scoring + Handoff      │
│ (texto ou TTS)  │   │ (quando lead qualifica)│
└─────────────────┘   └────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               CAMADAS DE SUPORTE                             │
│                                                              │
│  [SDR-07: Ingestão de Conhecimento]                         │
│  Trigger: Google Drive → embeddings → Pinecone              │
│                                                              │
│  [SDR-08: Billing e Observabilidade]                        │
│  Registra tokens, custos, métricas                          │
│                                                              │
│  [SDR-09: Setup / Manutenção]                               │
│  QR Code, instância Evolution, configurações                │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Sistema de Qualificação de Leads

#### Modelo de Scoring (0–100 pontos)

| Dimensão | Peso | Critérios |
|----------|------|-----------|
| **Interesse explícito** | 25 pts | Mencionou querer aprender inglês (5), perguntou sobre preço/plano (10), pediu para se matricular (25) |
| **Urgência / Timeline** | 20 pts | "Sem pressa" (0), "Em algum momento" (5), "Este mês" (15), "Esta semana" (20) |
| **Objetivo claro** | 20 pts | Vago (5), viagem/trabalho/exame (15), TOEFL/certificação/promoção (20) |
| **Disponibilidade financeira** | 20 pts | Perguntou condições de pagamento pós-explicação (10), afirmou poder investir (20) |
| **Engajamento na conversa** | 15 pts | Monossilábico (0), respostas completas (8), faz perguntas próprias (15) |

#### Temperatura por Score
- **0–30**: 🧊 Frio → sequência de nurturing automático (3-5 dias)
- **31–60**: 🌡 Morno → notificação para closer em 48h
- **61–100**: 🔥 Quente → agendamento imediato + notificação urgente para closer

#### Gatilhos automáticos de reclassificação
- Lead Frio que responde nurturing → reavalia score
- Lead Morno que agenda → vira Quente automaticamente
- Lead Quente sem ação do closer em 4h → alerta de urgência

### 4.4 System Prompt Proposto (Escola de Inglês)

```
### IDENTIDADE

Você é [Nome da Agente], SDR da [Nome da Escola], escola de inglês.
Sua personalidade é calorosa, motivacional e profissional.
Você acredita genuinamente que inglês muda vidas.

### OBJETIVO

1. Entender o objetivo do lead com o inglês
2. Entender o momento atual (nível, disponibilidade, urgência)
3. Apresentar a escola e metodologia de forma contextualizada
4. Qualificar o lead com base nas respostas
5. Para leads qualificados: agendar aula experimental com closer
6. Para leads não qualificados: manter relacionamento com nurturing

### ROTEIRO DE QUALIFICAÇÃO (em sequência)

Etapa 1 — Quebra-gelo e objetivo:
"Para te ajudar da melhor forma, me conta: por que você quer aprender inglês agora?"

Etapa 2 — Nível atual:
"Você já teve contato com inglês antes? Como descreveria seu nível hoje?"

Etapa 3 — Urgência:
"Você tem algum prazo em mente — uma viagem, entrevista de emprego, exame?"

Etapa 4 — Disponibilidade:
"Quantas horas por semana você conseguiria dedicar aos estudos?"

Etapa 5 — Apresentação contextualizada:
[adaptar com base nas respostas anteriores]

Etapa 6 — Proposta:
"Que tal conhecer nossa metodologia numa aula experimental gratuita?
Posso verificar horários disponíveis para você."

### REGRAS

1. Máximo 300 caracteres por mensagem
2. Uma pergunta de cada vez
3. Adapte o tom ao perfil do lead
4. Nunca force uma venda — gere interesse genuíno
5. Use as tools de agenda apenas após etapas 1-4 completas
6. Se o lead pedir para falar com humano → desative o agente
```

### 4.5 Fluxo de Handoff para Closer

```
[Agente detecta lead qualificado (score ≥ 61)]
   ↓
[Agendar] → cria evento no Google Meet com closer
   ↓
[Gravar no CRM] → Google Sheets com:
   - nome, telefone, objetivo, nível, urgência
   - score de qualificação
   - temperatura (Quente)
   - resumo da conversa (últimas N mensagens)
   - link do evento Google Meet
   ↓
[SDR-06: Handoff] → notifica closer via:
   - WhatsApp pessoal do closer (Evolution API)
   - Linha na planilha "Leads Quentes Hoje"
   
[Mensagem para o lead]
"Ótimo! Agendei sua aula experimental para [data/hora].
Você vai falar com [nome do closer], nosso consultor especialista.
Até lá! 🎯"
```

### 4.6 Infraestrutura e Integrações (manter)

| Componente | Decisão | Motivo |
|-----------|---------|--------|
| WhatsApp | Evolution API | Já integrado e funcionando |
| LLM principal | GPT-4o-mini | Custo/benefício adequado para SDR |
| Memória conversacional | Redis | Baixa latência, já implementado |
| CRM | Google Sheets | Simples, time da escola já usa |
| Agendamentos | Google Calendar | Nativo do n8n, já integrado |
| Vector store | Pinecone | Ativo e integrado — manter como canônico |
| Supabase | Banco de dados | Billing, leads, histórico de mensagens |
| TTS | ElevenLabs | Feature diferenciadora — manter como opcional |

---

## 5. Roteiro de Conteúdo para Base de Conhecimento

### Documentos a criar para o Pinecone

1. **FAQ — Escola de Inglês**
   - Metodologia de ensino
   - Duração dos cursos
   - Modalidades (presencial/online/híbrido)
   - Certificados emitidos
   - Turmas e horários disponíveis

2. **Planos e Preços**
   - Tabela de preços por modalidade
   - Condições de pagamento
   - Descontos disponíveis
   - Política de cancelamento

3. **Provas de nível**
   - Como funciona a prova de nivelamento
   - O que esperar da aula experimental

4. **Cases e Depoimentos**
   - Histórias de ex-alunos
   - Resultados obtidos (promoções, viagens, aprovações em exames)

5. **Diferencial da escola**
   - Por que escolher esta escola vs concorrentes
   - Metodologia exclusiva

---

## 6. Requisitos Não-Funcionais

### 6.1 Performance
- Tempo de resposta do agente: < 8 segundos (sem TTS)
- Tempo de resposta com TTS: < 15 segundos
- Disponibilidade: 99.5% em horário comercial

### 6.2 Escalabilidade
- Suportar até 100 conversas simultâneas
- Redis com TTL configurado para evitar acúmulo de memória
- Debounce de 3-5 segundos configurável por variável

### 6.3 Observabilidade
- Log de todas as mensagens recebidas/enviadas (Supabase)
- Rastreamento de custo por conversa (tokens × preço)
- Alertas quando custo diário superar threshold
- Métricas: taxa de qualificação, taxa de agendamento, leads por temperatura

### 6.4 Segurança
- API keys nunca hardcodadas — sempre via credenciais n8n
- Whitelist de números (quando ativada)
- Rate limiting por número (Max X mensagens/hora)
- Logs de auditoria para conformidade

### 6.5 Manutenibilidade
- Cada subworkflow deve ter README próprio (Sticky Notes)
- Variáveis configuráveis expostas em Set node no início do workflow
- Versioning dos prompts documentado no CHECKPOINT.md

---

## 7. Métricas de Sucesso

| Métrica | Baseline atual | Meta 3 meses |
|---------|---------------|--------------|
| Taxa de resposta < 10s | ? | > 90% |
| Taxa de qualificação de leads | 0% (sem sistema) | > 30% |
| Taxa de agendamento de quentes | 0% (sem sistema) | > 60% |
| Custo por conversa | ? | < R$ 0.50 |
| CSAT leads (quando implementado) | N/A | > 4.0/5.0 |

---

## 8. Fora do Escopo (v1.0)

- Integração com sistema de gestão escolar (ERP)
- Pagamento via WhatsApp
- Emissão automática de contratos
- Dashboard de métricas em tempo real
- App para closers
- Múltiplos idiomas (além de PT-BR)
- Integração com Instagram/Telegram (apenas WhatsApp)

---

## 9. Riscos do Projeto

| Risco | Probabilidade | Impacto | Mitigação |
|-------|-------------|---------|-----------|
| Redis indisponível | Média | Alto | Fallback para Supabase como memória |
| OpenAI com instabilidade | Baixa | Alto | OpenRouter como fallback |
| Evolution API rate limit | Média | Médio | Queue de mensagens + retry |
| Custo de LLM acima do esperado | Média | Médio | Billing tracker + alerts |
| Leads recebendo mensagens duplicadas | Alta | Alto | Idempotency key por mensagem |

---

## 10. Decisões Abertas (Pendentes)

| # | Decisão | Opções | Quem decide |
|---|---------|--------|-------------|
| D1 | Nome da agente SDR | Camis / outro nome | Usuário |
| D2 | Nome da escola | ? | Usuário |
| D3 | Roteiro exato de qualificação | Proposta neste PRD / personalizado | Usuário |
| D4 | Critérios de "lead quente" | Score ≥ 61 proposto / ajustar | Usuário |
| D5 | Canal de notificação do closer | WhatsApp / Email / ambos | Usuário |
| D6 | Nodes desabilitados | Remover ou reativar | Usuário |
| D7 | TTS obrigatório ou opcional | Manter como toggle / sempre texto | Usuário |
| D8 | Supabase vector store | Remover / manter como backup | Usuário |

---

## Apêndice A — Inventário completo de nodes do workflow atual

### Nodes por categoria

| Categoria | Nodes | Qtd |
|-----------|-------|-----|
| **IA / LangChain** | agent, lmChatOpenAi (3), lmChatOpenRouter (2), chainLlm (2), memoryRedisChat, vectorStorePinecone (2), vectorStoreSupabase (3), toolVectorStore (2), embeddingsOpenAi (5), textSplitter (3), documentLoader (3), outputParser (2), toolCalculator, toolThink | ~35 |
| **Controle de fluxo** | if (11), switch (4), merge (1), splitOut (1), splitInBatches (3), noOp (7), limit (1) | ~28 |
| **Dados** | set (14), supabase (8), postgres (7), redis (12), googleSheets (1) | ~42 |
| **HTTP / Integrações** | httpRequest (12), webhook (5), respondToWebhook (4) | ~21 |
| **Google** | googleDriveTrigger (4), googleDrive (5), googleCalendarTool (5), googleSheetsTool (1) | ~15 |
| **Arquivos** | extractFromFile (8), convertToFile (5), aggregate (2), summarize (2) | ~17 |
| **IA Utilitários** | openAi (3) — Whisper/Vision | ~3 |
| **UI** | stickyNote (54), html (1), wait (2) | ~57 |
| **Total** | | **~217+** |

### Nodes desabilitados identificados

1. Novos Arquivos (googleDriveTrigger)
2. Novas Atualizações (googleDriveTrigger)
3. File Created (googleDriveTrigger)
4. File Updated (googleDriveTrigger)
5. Valida WhiteList (googleSheets)
6. Base Conhecimento SUPABASE (vectorStoreSupabase — tool do agente)
7. GPT 4o-min (lmChatOpenRouter)
8. Outros 10 nodes não identificados individualmente

---

## Apêndice B — Fluxo de Mensagens Técnico (Evolution API)

```
Entrada (body do webhook):
{
  "message": {
    "message_id": "...",
    "chat_id": "5511999999999@s.whatsapp.net",
    "content_type": "text|audio|image|document",
    "content": "mensagem de texto",
    "Content_URL": "url do arquivo (se mídia)",
    "event": "messages.upsert"
  },
  "instance": {
    "Name": "nome_instancia",
    "Apikey": "...",
    "Server_url": "..."
  }
}

Saída (envio de mensagem de texto):
POST {Server_url}/message/sendText/{instance_name}
Headers: apikey: {Apikey}
Body: { "number": "{chat_id}", "text": "{mensagem}" }

Saída (envio de áudio):
POST {Server_url}/message/sendWhatsAppAudio/{instance_name}
Headers: apikey: {Apikey}
Body: { "number": "{chat_id}", "audio": "{base64_mp3}" }
```
