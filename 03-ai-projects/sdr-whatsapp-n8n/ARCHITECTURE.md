# ARCHITECTURE.md — SDR Escola de Inglês
## Desenho Arquitetural Completo — Pré-Implementação

**Versão**: 2.0
**Data**: 2026-05-19
**Status**: REVISADO — Abordagem anti-overengineering (sessão Fase 2)
**Workflow de referência**: R9ANaIMASulKJxcL (~130 nodes únicos reais, 0 subworkflows)

> ⚠️ **ATENÇÃO**: A v1.0 deste documento propunha 10 subworkflows (SW-01 a SW-10).
> Após revisão arquitetural madura, a decisão é: **apenas 3 subworkflows reais**.
> O restante é limpeza e hardening no monolito. Veja seção "Revisão v2.0" para detalhes.

> Este documento é o blueprint da nova arquitetura.
> Nada aqui deve ser implementado até aprovação explícita.

---

## DIAGNÓSTICO INICIAL: O QUE O SCAN REVELOU

Antes de propor, é necessário entender o que de fato existe hoje.

### Padrão de duplicação confirmado

O re-scan revelou que praticamente todos os nodes aparecem duas vezes:
- 2 agentes `Camis - Agente SDR`
- 2 `memoryRedisChat`
- 10 `googleCalendarTool` (2 sets de 5)
- 4 webhooks EVO
- 8 nodes OpenRouter
- Todos os nodes de disabled aparecem em pares

**Conclusão**: O fluxo principal está inteiro duplicado no mesmo workflow. Não existe razão operacional aparente. É puro crescimento descontrolado.

### Nodes desabilitados (22 = 11 únicos × 2)

| Node | Categoria | O que significa |
|------|-----------|-----------------|
| Cria Tabela Documentos | DB Setup | Rodou uma vez, nunca mais |
| Cria função Busca em Vetor | DB Setup | Idem |
| Cria Extensão Vetor | DB Setup | Idem |
| Criar tabela de Custos | DB Setup | Idem |
| Criar tabela de Leads1 | DB Setup | Idem |
| Criar tabela de mensagens | DB Setup | Idem |
| Criar tabela de historico_mensagens | DB Setup | Idem |
| Valida WhiteList | Acesso | Feature pausada |
| Se estiver na lista não ativa o bot | Acesso | Feature pausada |
| Limpa Memória da Conversa1 | Sessão | Não conectado |
| No Operation, do nothing | Placeholder | Deadcode |

**Conclusão**: 7 nodes são de inicialização de banco (devem existir em workflow separado de setup, executado uma única vez). Os demais são features pausadas ou deadcode.

---

# ENTREGÁVEL 1 — MAPA DE RESPONSABILIDADES

## Domínio 01 — ENTRADA WhatsApp

**Responsabilidade**: Receber, validar e normalizar o payload bruto da Evolution API antes de qualquer processamento.

**Inputs**:
```json
{
  "message": { "chat_id", "content_type", "content", "Content_URL", "event" },
  "instance": { "Name", "Apikey", "Server_url" }
}
```

**Outputs**:
```json
{
  "phone": "5511999999999",
  "instance_name": "nome_instancia",
  "message_type": "text|audio|image|document",
  "raw_content": "...",
  "media_url": "...|null",
  "is_from_me": false,
  "event_type": "messages.upsert"
}
```

**Dependências**: Evolution API, variáveis de configuração da instância

**Riscos**:
- Mensagens do próprio bot sendo processadas (loop infinito)
- Payloads malformados da Evolution API
- Rate limit da Evolution API
- Mensagens de grupos WhatsApp

**Nodes atuais envolvidos**:
- `Webhook EVO` (×4 — duplicados)
- `Variáveis do Fluxo` (Set node — configuração de instância)
- `Valida se Humano está enviando mensagem` (IF — anti-loop)
- `Valida WhiteList` (desabilitado — anti-spam)

**Anti-patterns atuais**:
- Webhook duplicado sem motivo
- Variáveis de configuração hardcodadas no Set node em vez de variáveis n8n globais
- Whitelist desabilitada — risco de spam sem proteção

---

## Domínio 02 — PROCESSAMENTO DE MENSAGEM

**Responsabilidade**: Converter qualquer formato de entrada (áudio, imagem, documento, texto) em texto puro para o agente consumir.

**Inputs**: `media_url`, `raw_content`, `message_type`

**Outputs**:
```json
{
  "mensagem_normalizada": "string",
  "tipo_original": "text|audio|image|document",
  "metadata_midia": {}
}
```

**Dependências**: OpenAI Whisper (áudio), OpenAI Vision (imagem), extratores de arquivo

**Riscos**:
- Falha no Whisper → agente recebe mensagem vazia
- Imagens com conteúdo inadequado sem filtro
- PDFs corrompidos ou protegidos
- Áudio muito longo → custo excessivo e timeout

**Nodes atuais envolvidos**:
- `Identifica o Tipo de Mensagem` (Switch)
- `Mensagem de Texto`, `Mensagem Extendida`, `Mensagem de Audio`, `Mensagem com Imagem`, `Mensagem com Documento`, `Mensagem de Erro`
- `Converte Audio base64 para File`, `Converte Imagem Base64 para File`, `Convert Documento base64 para Arquivo`
- `Transcreve Audio com OpenAI` (Whisper)
- `Traduz Imagem em Texto` (Vision + LLM Chain)
- `Extrai Dados do PDF` (extractFromFile)

**Anti-patterns atuais**:
- Conversão de base64 duplicada (dois caminhos fazem a mesma coisa)
- Erros de transcrição não tratados (se Whisper falha, fluxo continua com conteúdo vazio)
- Custo de Vision disparado sem controle

---

## Domínio 03 — SESSÃO E MEMÓRIA

**Responsabilidade**: Gerenciar o estado da conversa por número de telefone. Debounce de mensagens rápidas. Estado do bot (ativo/inativo). Registro e recuperação da memória conversacional.

**Inputs**: `phone`, `mensagem_normalizada`, `instance_name`

**Outputs**:
```json
{
  "pode_processar": true,
  "bot_ativo": true,
  "lead_id": "uuid",
  "historico_recente": "últimas N mensagens comprimidas"
}
```

**Dependências**: Redis (memória operacional), Supabase (persistência longa)

**Riscos**:
- Redis offline → toda memória conversacional perdida
- Debounce via Wait node acumula execuções paralelas
- Memória Redis sem TTL → crescimento infinito
- Race condition: duas mensagens simultâneas do mesmo número
- Memória longa sem compressão → contexto estourado no LLM

**Nodes atuais envolvidos**:
- `Busca Memória da Conversa1` (Redis)
- `Valida se Bot Esta Ativo` (IF + Redis)
- `Memória Temporária` (Redis — debounce flag)
- `Espera Tempo Definido` (Wait — debounce delay)
- `Busca mensagens da Memória` (Redis)
- `Verifica se houve troca de mensagem` (IF)
- `Limpa a Memória Temporária` (Redis)
- `Seta Mensagem para o Agente` (Set)
- `Adiciona Texto/Audio/Imagem/Documento/Erro na Memoria` (Redis ×5)
- `Memória do Agente` (memoryRedisChat — LangChain)

**Anti-patterns atuais**:
- Debounce com Wait node é frágil: execuções ficam suspensas na fila, o n8n mantém cada uma em memória
- Múltiplos `redis.get` e `redis.set` para construir o que deveria ser uma operação atômica
- Memória LangChain (memoryRedisChat) e memória manual (redis) são dois sistemas separados sem sincronização

---

## Domínio 04 — CADASTRO E GESTÃO DE LEADS

**Responsabilidade**: Identificar se o número já é lead/cliente. Cadastrar novos leads. Manter dados do lead atualizados.

**Inputs**: `phone`, `instance_name`

**Outputs**:
```json
{
  "lead_id": "uuid",
  "lead_exists": true,
  "lead_data": { "nome", "telefone", "status", "score", "temperatura" }
}
```

**Dependências**: Supabase (tabela `leads`)

**Riscos**:
- Duplicação de leads por diferença de formato de número (+55 vs 55 vs 0055)
- Lead cadastrado sem normalização de telefone
- Lookup sem índice → latência em escala

**Nodes atuais envolvidos**:
- `Busca se o Lead é Cliente` (Supabase SELECT)
- `Verifica se encontrou o cliente` (IF)
- `Cadastra Lead` (Supabase INSERT)
- `Junta Retorno` (Merge)
- `Remove Cliente` (utilitário de sessão)

**Anti-patterns atuais**:
- Cadastro de lead inline no fluxo principal (deveria ser assíncrono ou em subworkflow)
- Sem normalização do número de telefone antes do lookup

---

## Domínio 05 — ORQUESTRAÇÃO

**Responsabilidade**: Decidir o que acontece com cada mensagem. É o "router" central que direciona para o agente, para resposta automática ou para encerramento.

**Inputs**: Dados do lead, mensagem processada, estado da sessão, flags de configuração

**Outputs**: `acao` (processar_com_agente | encerrar | fallback | handoff)

**Dependências**: todos os domínios anteriores

**Riscos**:
- Lógica de orquestração espalhada em múltiplos IF nodes sem documentação
- Flags de configuração misturadas com lógica de negócio

**Nodes atuais envolvidos**:
- `Variáveis do Fluxo` (Set — flags: usarElevenLabs, humanizadorMensagem, gerarHistoricoConversa, etc.)
- Vários `if` espalhados sem nomeação clara

**Anti-patterns atuais**:
- Orquestração sem estado explícito — não existe um campo "estado_conversa" (saudação, qualificação, agendamento, etc.)
- Decisões de roteamento hardcodadas em IF nodes inline

---

## Domínio 06 — AGENTE SDR (core)

**Responsabilidade**: Conduzir a conversa comercial. Qualificar o lead. Usar tools de agenda e CRM quando necessário.

**Inputs**: `mensagem_normalizada`, `historico_conversa`, `lead_data`, `estado_conversa`

**Outputs**:
```json
{
  "resposta_texto": "string",
  "acao_tomada": "resposta|agendamento|handoff|encerramento",
  "tool_calls": [],
  "tokens_usados": { "input": 0, "output": 0 }
}
```

**Dependências**: OpenRouter (LLM), Redis (memória), Supabase Vector (RAG), Google Calendar, Google Sheets

**Riscos**:
- System prompt errado (ainda menciona Imobiliária)
- Sem estado explícito da conversa → agente pode regredir
- 10 tools sobrecarregam o contexto e aumentam custo
- Sem limite de turns por sessão → conversa infinita
- Hallucination sem groundtruth no RAG

**Nodes atuais envolvidos**:
- `Camis - Agente SDR` (agent ×2 — duplicados)
- `OpenRouter Chat Model` (LLM)
- `Memória do Agente` (memoryRedisChat)
- `Base Conhecimento SUPABASE` (vectorStoreSupabase tool)
- `Listar`, `Agendar`, `Verificar Disponibilidade`, `Reagendar`, `Cancelar` (googleCalendarTool ×10)
- `Gravar no CRM` (googleSheetsTool)
- `Desativar Agente` (redisTool)
- `Calculator`, `Think` (utilitários)

**Anti-patterns atuais**:
- Agente duplicado (mesmo node, mesma posição, duas vezes no JSON)
- 10 Calendar tools = 2 agentes × 5 ferramentas: se há dois agentes, deveriam ter responsabilidades distintas
- Sem gestão de estado de conversação → o agente não sabe em que etapa está

---

## Domínio 07 — QUALIFICAÇÃO

**Responsabilidade**: Avaliar a temperatura do lead com base nos sinais coletados durante a conversa. Atualizar o score no CRM.

**Inputs**: `historico_conversa`, `lead_data`, `tool_calls` (o que o agente fez)

**Outputs**:
```json
{
  "score": 75,
  "temperatura": "quente",
  "criterios_atingidos": ["objetivo_claro", "urgencia_alta", "engajamento_alto"],
  "criterios_faltando": ["disponibilidade_financeira"]
}
```

**Dependências**: Supabase (update lead), OpenRouter (LLM para extração de sinais)

**Riscos**:
- **Este domínio não existe no workflow atual** — a qualificação depende apenas do julgamento do agente sem critérios estruturados
- Score não persiste entre sessões

**Nodes atuais envolvidos**: nenhum — ausente

---

## Domínio 08 — BASE DE CONHECIMENTO (RAG)

**Responsabilidade**: Ingestão e atualização contínua de documentos da escola. Indexação vetorial para consulta do agente.

**Inputs**: Documentos do Google Drive (PDF, TXT, Excel, Docs)

**Outputs**: Embeddings no Supabase Vector Store

**Dependências**: Google Drive, Google Docs, OpenAI Embeddings, Supabase Vector

**Riscos**:
- Triggers de ingestão desabilitados → base desatualizada
- Dois pipelines de ingestão paralelos com lógica diferente (eram Pinecone + Supabase, agora ambos são Supabase mas com código diferente)
- Sem controle de versão de documentos → ingere duplicados
- Sem teste de qualidade do RAG (retrieval sem avaliação)

**Nodes atuais envolvidos**:
- `Novos Arquivos`, `Novas Atualizações`, `File Created`, `File Updated` (googleDriveTrigger — todos desabilitados)
- `Enhanced Default Data Loader 1, 2`
- `Recursive Character Text Splitter 1, 2`
- `Embeddings OpenAI 1, 3, 4`
- `Itera sobre os arquivos`, `Itera sobre os arquivos1`
- `Baixa o arquivo`, `Baixa o Arquivo`
- `Identifica o tipo`, `Valida o tipo` (Switch — duplicados)
- `Extrai Dados do Arq PDF`, `Extrai dados de um Arq TXT`, `Extrai Dados de um Excel`
- `Extrai dados de PDF`, `Extrai dados de TXT`, `Extrai Dados de Excel` (duplicados dos anteriores)
- `Converte para Google Docs`, `Converte para Google Docs1`
- `Agrega Dados da Planilha`, `Agrega os dados`
- `Sumariza Dados`, `Sumariza`
- `Insere na Vector do Supabase`, `Insere no Supabase Vector`
- `Cria Tabela Documentos`, `Cria função Busca em Vetor`, `Cria Extensão Vetor` (desabilitados — setup)

**Anti-patterns atuais**:
- Pipeline inteiro duplicado sem diferença funcional
- Setup de banco (CREATE TABLE, CREATE EXTENSION) misturado com pipeline operacional
- Triggers desabilitados → ingestão manual

---

## Domínio 09 — OUTPUT / FORMATAÇÃO DE RESPOSTA

**Responsabilidade**: Pegar a resposta bruta do agente, formatar humanamente, dividir em mensagens curtas e enviar pelo canal correto.

**Inputs**: `resposta_agente_raw`

**Outputs**: N mensagens enviadas ao WhatsApp (texto ou áudio)

**Dependências**: OpenRouter (humanizador), ElevenLabs (TTS), Evolution API

**Riscos**:
- 2 chamadas LLM em série por mensagem (agente + humanizador) → latência dobrada
- TTS na mesma execução síncrona → latência triplicada
- Loop de envio sem tratamento de falha: se uma mensagem falha, as outras não são enviadas
- `Seta Personalidade do Assistente` + LLM extra: adiciona custo e latência sem valor claro para SDR

**Nodes atuais envolvidos**:
- `Saida do Agente` (Set)
- `Verifica se deve humizar` (IF)
- `Estrutura da Mensagem de Retorno` (chainLlm — humanizador)
- `Seta o Tipo de Retorno JSON` (Set)
- `Ajusta o Parse do JSON` (Set)
- `Quebra Mensagens em várias Linhas` (splitOut)
- `Itera sobre cada mensagem` (splitInBatches)
- `Verifica se deve gerar audio` (IF)
- `Se o retorno for menos de 300 caracteres gera voz` (IF)
- `Seta Voz via ElevenLabs` (httpRequest)
- `Converte mp3 pra Base64` (convertToFile)
- `Formata Mensagem para Áudio` (Set)
- `Envia Audio para o WhatsApp` (httpRequest)
- `Não gera Voz`, `Não gera audio` (noOp)
- `Espera 2 segundos` (Wait)
- `Seta Personalidade do Assistente` (Set)
- `LLM ChatGPT` (OpenRouter — wrapper de personalidade)
- `Enviar Mensagem no WhatsApp`, `Enviar Mensagem para o WhatsApp` (httpRequest — dois nodes diferentes para a mesma função?)

**Anti-patterns atuais**:
- `Seta Personalidade do Assistente` + chamada LLM extra: para SDR de inglês, isso é overhead desnecessário
- Wait de 2s hardcodado: deveria ser configurável
- Dois nodes de envio de mensagem de texto com nomes diferentes → confusão

---

## Domínio 10 — BILLING E TOKENS

**Responsabilidade**: Rastrear consumo de tokens e custo por conversa.

**Inputs**: `tokens_input`, `tokens_output`, `modelo`, `lead_id`

**Outputs**: Registro no Supabase (tabela `costs`)

**Dependências**: Supabase

**Riscos**:
- Billing inline no caminho principal adiciona latência
- Sem alertas de gasto excessivo
- Sem rollup diário/semanal

**Nodes atuais envolvidos**:
- `Calcula Tokens - Tools` (node de cálculo)
- `Grava Billing do Agent no Supabase` (Supabase INSERT)

**Anti-patterns atuais**:
- Billing síncrono no fluxo principal — deveria ser fire-and-forget assíncrono

---

## Domínio 11 — HISTÓRICO DE MENSAGENS

**Responsabilidade**: Persistir cada mensagem enviada/recebida para rastreabilidade e analytics futuros.

**Inputs**: `mensagem`, `phone`, `direcao` (entrada/saída), `timestamp`

**Outputs**: Registro no Supabase (tabela `mensagens` / `historico_mensagens`)

**Dependências**: Supabase

**Riscos**:
- Inline no fluxo principal → adiciona latência
- Dois fluxos de histórico que parecem fazer a mesma coisa

**Nodes atuais envolvidos**:
- `Verifica se gera histórico mensagem` (IF — controlado por flag)
- `Busca Dados` (Supabase SELECT)
- `Verifica se encontrou` (IF)
- `Adiciona Mensagem` (Supabase INSERT)
- `Atualiza Mensagem` (Supabase UPDATE)
- `Cria Mensagem no Supabase` (Supabase INSERT)

---

## Domínio 12 — HANDOFF PARA CLOSER

**Responsabilidade**: Quando um lead atinge temperatura "Quente", notificar o closer com contexto completo e prioridade.

**Inputs**: `lead_data`, `score`, `historico_conversa`, `evento_agenda`

**Outputs**: Notificação ao closer + atualização no CRM

**Dependências**: WhatsApp (closer), Google Sheets (CRM)

**Riscos**:
- **Este domínio não existe no workflow atual** — o agente agenda mas o closer não recebe notificação estruturada
- Sem fila de priorização
- Closer não recebe resumo automático da conversa

**Nodes atuais envolvidos**: nenhum — ausente

---

## Domínio 13 — SETUP / INFRAESTRUTURA

**Responsabilidade**: Inicialização única do sistema: criar tabelas, configurar Evolution API, gerar QR Code.

**Inputs**: Configurações de instância

**Outputs**: Instância Evolution configurada, tabelas criadas, webhook registrado

**Dependências**: Evolution API, Supabase/Postgres

**Riscos**:
- Setup misturado com fluxo operacional — se executado acidentalmente pode destruir dados
- QR Code expira: precisa de refresh manual

**Nodes atuais envolvidos**:
- `Pagina do QR Code` (html)
- `criar-instancia-evolution`, `Criar instancia evolution 1, 2` (httpRequest)
- `Atualiza qr code` (httpRequest)
- `GeraPáginaQRCode`, `ConvertBase64paraFile`, `SetaBase64`, `SetaBase`, `ConverteBase64paraFile`
- `Seta WebHook`, `Atualiza WebHook`, `Seta Settings` (httpRequest)
- `Criar tabela de Custos`, `Criar tabela de Leads1`, `Criar tabela de mensagens`, `Criar tabela de historico_mensagens`
- `Cria Tabela Documentos`, `Cria função Busca em Vetor`, `Cria Extensão Vetor` (postgres)

**Anti-patterns atuais**:
- 13 nodes de setup misturados no workflow operacional
- Setup de banco desabilitado mas presente — risco de reativação acidental

---

## Domínio 14 — GESTÃO DE SESSÃO (controle do bot)

**Responsabilidade**: Ativar/desativar o bot por número. Gerenciar inatividade. Limpar memória ao encerrar.

**Inputs**: `phone`, `comando` (ativar/desativar/limpar)

**Outputs**: Estado do bot alterado no Redis

**Dependências**: Redis, Evolution API (para notificar usuário)

**Nodes atuais envolvidos**:
- `Desativar Agente` (redisTool — via tool do agente)
- `Envia mensagem de Agente Parado` (httpRequest)
- `Envia Mensagem de Agente Iniciado` (httpRequest)
- `Limpa Memória` (redis)
- `Adiciona na Memória` (redis)
- `Limpa Memória da Conversa1` (desabilitado)

---

## Domínio 15 — OBSERVABILIDADE (ausente)

**Responsabilidade**: Emitir logs estruturados, métricas de performance e alertas de falha.

**Status**: **Não existe no workflow atual.**

---

---

# ENTREGÁVEL 2 — PROPOSTA DE SUBWORKFLOWS

## Princípios de modularização

1. Cada subworkflow tem uma única responsabilidade
2. Comunicação por executeWorkflow com inputs/outputs documentados
3. Subworkflows não conhecem seus chamadores
4. Falhas retornam erro estruturado, nunca quebram silenciosamente
5. Subworkflows podem ser testados isoladamente

---

## [SW-01] SDR — Entrada e Validação
**Gatilho**: Webhook (Evolution API)
**Objetivo**: Receber, validar e normalizar o payload bruto

**Inputs**:
- payload HTTP da Evolution API

**Outputs**:
```json
{
  "phone": "string",
  "instance_name": "string",
  "server_url": "string",
  "apikey": "string",
  "message_type": "text|audio|image|document|error",
  "raw_content": "string|null",
  "media_url": "string|null",
  "is_from_me": "boolean",
  "message_id": "string"
}
```

**Nodes internos**:
- Webhook (trigger)
- Set (normalizar campos)
- IF (filtrar is_from_me)
- IF (filtrar event type)
- Respond to Webhook (200 OK imediato)
- Execute Workflow → SW-02

**Nodes atuais a mover**: `Webhook EVO`, `Variáveis do Fluxo`, `Valida se Humano está enviando mensagem`

**Nodes a remover**: Webhook duplicado, `Valida WhiteList` (deadcode — ou reativar com lógica)

**Reutilizável para**: múltiplas instâncias WhatsApp

---

## [SW-02] SDR — Processamento de Mensagem
**Gatilho**: executeWorkflow (chamado por SW-01)
**Objetivo**: Converter qualquer tipo de mídia em texto puro

**Inputs**: output do SW-01

**Outputs**:
```json
{
  "mensagem_texto": "string",
  "tipo_original": "text|audio|image|document",
  "custo_processamento": { "tokens": 0, "servico": "whisper|vision|none" }
}
```

**Nodes internos**:
- Switch (type routing)
- httpRequest + openAi (Whisper para áudio)
- chainLlm + openAi (Vision para imagem)
- extractFromFile (PDF/TXT/Excel)
- Set (consolidar em mensagem_texto)
- IF (erro de processamento → mensagem de fallback)

**Nodes atuais a mover**: `Identifica o Tipo de Mensagem`, `Converte Audio/Imagem/Documento`, `Transcreve Audio`, `Traduz Imagem em Texto`, `Extrai Dados do PDF`

**Nodes a remover**: conversores duplicados

**Reutilizável para**: qualquer workflow que precise normalizar mensagens WhatsApp

---

## [SW-03] SDR — Sessão e Debounce
**Gatilho**: executeWorkflow (chamado por SW-01 após processamento)
**Objetivo**: Gerenciar estado da sessão, anti-flood e verificar se pode processar

**Inputs**: `phone`, `instance_name`, `mensagem_texto`

**Outputs**:
```json
{
  "pode_processar": "boolean",
  "bot_ativo": "boolean",
  "motivo_bloqueio": "string|null"
}
```

**Lógica de debounce correta**:
- Em vez de Wait node (frágil), usar Redis com timestamp:
  1. Gravar `debounce:{phone}` = `{mensagem, timestamp_agora}`
  2. Retornar `pode_processar: false` imediatamente
  3. Um Cron/Schedule separado ou polling via Redis keyspace notification verifica se `now - timestamp > EsperaMemoria`
  4. Somente então dispara o agente

**Nodes internos**:
- Redis GET (estado do bot)
- Redis GET (debounce flag)
- Redis SET (marcar mensagem + timestamp)
- IF (bot ativo?)
- IF (debounce passou?)

**Nodes atuais a mover**: `Busca Memória da Conversa1`, `Valida se Bot Esta Ativo`, `Memória Temporária`, `Espera Tempo Definido`, `Busca mensagens da Memória`, `Verifica se houve troca de mensagem`, `Limpa a Memória Temporária`, `Seta Mensagem para o Agente`

**Nodes a remover**: Wait node frágil

---

## [SW-04] SDR — Gestão de Leads
**Gatilho**: executeWorkflow (chamado por SW-03)
**Objetivo**: Identificar ou criar o lead no Supabase

**Inputs**: `phone`

**Outputs**:
```json
{
  "lead_id": "uuid",
  "is_new": "boolean",
  "lead_data": { "nome", "telefone", "status", "score", "temperatura", "etapa_conversa" }
}
```

**Nodes internos**:
- Supabase SELECT (lookup por telefone normalizado)
- IF (encontrou?)
- Supabase INSERT (novo lead)
- Merge

**Nodes atuais a mover**: `Busca se o Lead é Cliente`, `Verifica se encontrou o cliente`, `Cadastra Lead`, `Junta Retorno`

**Reutilizável para**: qualquer ponto do fluxo que precise de dados do lead

---

## [SW-05] SDR — Agente Camis (Escola de Inglês)
**Gatilho**: executeWorkflow (chamado pelo orquestrador principal)
**Objetivo**: Conduzir a conversa comercial, qualificar e agendar

**Inputs**:
```json
{
  "mensagem_texto": "string",
  "lead_id": "uuid",
  "lead_data": {},
  "etapa_conversa": "saudacao|descoberta|qualificacao|agendamento|encerramento",
  "historico_comprimido": "string"
}
```

**Outputs**:
```json
{
  "resposta": "string",
  "nova_etapa": "string",
  "acao": "continuar|agendar|handoff|encerrar|desativar",
  "score_delta": 0,
  "tool_calls_realizados": [],
  "tokens": {}
}
```

**Nodes internos**:
- Set (construir prompt com contexto)
- agent (Camis SDR)
- LLM (OpenRouter)
- memoryRedisChat
- Tools: Listar, Agendar, Verificar Disponibilidade, Reagendar, Cancelar, Gravar no CRM, Base Conhecimento SUPABASE, Desativar Agente, Think
- Set (estruturar output)

**Nodes a remover**: Calculator (desnecessário para SDR de inglês), agente duplicado

**Notas**:
- System prompt a reescrever completamente para escola de inglês
- Reduzir de 10 tools para 7: remover Calculator, remover ferramenta duplicada de RAG
- Adicionar campo `etapa_conversa` no contexto do agente

---

## [SW-06] SDR — Output e Envio
**Gatilho**: executeWorkflow (chamado após SW-05)
**Objetivo**: Formatar a resposta, dividir em mensagens e enviar

**Inputs**:
```json
{
  "resposta_raw": "string",
  "phone": "string",
  "instance_name": "string",
  "server_url": "string",
  "apikey": "string",
  "usar_tts": "boolean"
}
```

**Outputs**: Mensagens enviadas ao WhatsApp

**Lógica interna**:
1. Dividir resposta em partes ≤ 200 chars (sem LLM extra — usar lógica de splitting por pontuação)
2. Para cada parte:
   - Se `usar_tts` e parte ≤ 300 chars → ElevenLabs → enviar áudio
   - Senão → enviar texto diretamente
3. Delay configurável entre mensagens (não hardcodado)

**Nodes a remover**:
- `Seta Personalidade do Assistente` + `LLM ChatGPT` (OpenRouter extra desnecessário)
- `Estrutura da Mensagem de Retorno` (chainLlm humanizador) — **substituir por lógica de splitting sem LLM**
- Nodes duplicados de envio (`Enviar Mensagem no WhatsApp` vs `Enviar Mensagem para o WhatsApp`)

**Reutilizável para**: qualquer workflow que precise enviar mensagens formatadas via Evolution API

---

## [SW-07] SDR — Qualificação e Scoring
**Gatilho**: executeWorkflow (chamado após cada resposta do agente)
**Objetivo**: Calcular/atualizar o score do lead com base nos sinais da conversa

**Inputs**:
```json
{
  "lead_id": "uuid",
  "historico_recente": "string",
  "tool_calls_realizados": [],
  "etapa_conversa": "string"
}
```

**Outputs**:
```json
{
  "score": 75,
  "temperatura": "quente",
  "delta": 15,
  "criterios": {}
}
```

**Lógica**: LLM extrai sinais do histórico → fórmula de scoring → atualiza Supabase

**Nodes internos**:
- chainLlm (extrator de sinais estruturados)
- outputParserStructured (JSON score)
- Set (calcular score final)
- Supabase UPDATE (persistir score)
- IF (temperatura mudou? → trigger handoff se quente)

**Nodes atuais a mover**: nenhum — este subworkflow não existe ainda

---

## [SW-08] SDR — Handoff para Closer
**Gatilho**: executeWorkflow (chamado quando score ≥ 61 E evento agendado)
**Objetivo**: Notificar closer com briefing completo do lead

**Inputs**:
```json
{
  "lead_id": "uuid",
  "evento_id": "string",
  "score": 75
}
```

**Outputs**: Notificação enviada, CRM atualizado

**Nodes internos**:
- Supabase SELECT (buscar dados completos do lead + histórico)
- chainLlm (gerar resumo executivo da conversa)
- Google Sheets UPDATE (marcar lead como "Aguardando Closer")
- httpRequest → Evolution API (WhatsApp do closer)
- Set (construir mensagem de briefing)

**Nodes atuais a mover**: nenhum — não existe

---

## [SW-09] SDR — Ingestão de Conhecimento
**Gatilho**: Google Drive Trigger (reativar) + Schedule (varredura periódica)
**Objetivo**: Manter a base de conhecimento vetorial atualizada

**Inputs**: Evento do Google Drive (arquivo criado/modificado)

**Outputs**: Chunks no Supabase Vector Store

**Nodes internos**:
- googleDriveTrigger (trigger)
- googleDrive (download)
- Switch (tipo de arquivo)
- extractFromFile / openAi (Docs) / Google Docs converter
- textSplitter
- embeddingsOpenAi
- vectorStoreSupabase (upsert)
- Postgres (atualizar metadados do documento)

**Nodes atuais a mover**: todo o cluster de ingestão (Novos Arquivos, Enhanced Data Loader, etc.)

**Nodes a remover**: pipeline duplicado de ingestão (Baixa o arquivo vs Baixa o Arquivo — mesma lógica duplicada)

---

## [SW-10] SDR — Setup e Infraestrutura
**Gatilho**: Manual (executado uma única vez)
**Objetivo**: Configurar Evolution API, criar tabelas, registrar webhooks

**Inputs**: Configurações de instância

**Nodes internos**: todos os nodes de setup/inicialização atuais

**Nodes a mover**: `Criar tabela de *`, `Cria Tabela Documentos`, `Cria função Busca em Vetor`, `Cria Extensão Vetor`, `criar-instancia-evolution`, `Seta WebHook`, `Atualiza WebHook`, `Seta Settings`, QR Code flow

---

## Resumo de movimentação de nodes

| Ação | Qtd estimada | Destino |
|------|-------------|---------|
| Mover para SW-01 (Entrada) | ~8 nodes | SW-01 |
| Mover para SW-02 (Processamento) | ~15 nodes | SW-02 |
| Mover para SW-03 (Sessão) | ~10 nodes | SW-03 |
| Mover para SW-04 (Leads) | ~5 nodes | SW-04 |
| Mover para SW-05 (Agente) | ~15 nodes | SW-05 |
| Mover para SW-06 (Output) | ~18 nodes | SW-06 |
| Criar SW-07 (Qualificação) | ~8 nodes novos | SW-07 |
| Criar SW-08 (Handoff) | ~6 nodes novos | SW-08 |
| Mover para SW-09 (Ingestão) | ~30 nodes | SW-09 |
| Mover para SW-10 (Setup) | ~20 nodes | SW-10 |
| **Remover** (duplicatas, deadcode) | **~150 nodes** | — |
| **Total esperado após refatoração** | **~100 nodes distribuídos** | 10 SWs |

---

---

# ENTREGÁVEL 3 — FLUXO IDEAL DO SDR

## Estados da conversa

```
[IDLE]
   ↓ primeira mensagem do lead
[SAUDACAO]
   - Objetivo: apresentar a escola e o agente
   - Coletar: nome do lead
   - Critério de avanço: lead respondeu com nome
   - Fallback (sem resposta em 24h): mensagem automática de follow-up
   ↓
[DESCOBERTA]
   - Objetivo: entender o porquê do inglês
   - Coletar: objetivo (trabalho, viagem, exame, etc.)
   - Critério de avanço: objetivo identificado
   - Fallback: reformular a pergunta de forma mais simples
   ↓
[PERFIL]
   - Objetivo: entender o ponto de partida
   - Coletar: nível atual (iniciante, básico, intermediário, avançado)
   - Critério de avanço: nível identificado
   ↓
[QUALIFICACAO]
   - Objetivo: mapear urgência e comprometimento
   - Coletar: urgência (timeline), disponibilidade de horas semanais
   - Score sendo calculado silenciosamente
   - Critério de avanço: respostas suficientes para score
   - Bifurcação por temperatura:
     * Frio (0-30): → [NURTURING]
     * Morno (31-60): → [AQUECIMENTO]
     * Quente (61-100): → [PROPOSTA]
   ↓
[AQUECIMENTO] (apenas Morno)
   - Objetivo: elevar engajamento e urgência
   - Apresentar social proof (depoimentos, resultados de alunos)
   - Fazer perguntas de implicação (consequências de não aprender agora)
   - Critério de avanço para [PROPOSTA]: engajamento sobe score ≥ 61
   - Critério para [NURTURING]: sem engajamento após 2 mensagens
   ↓
[PROPOSTA] (Quente)
   - Objetivo: apresentar opção de aula experimental / reunião com closer
   - Não apresentar preço ainda — o closer fecha
   - Critério de avanço: aceite do agendamento
   ↓
[AGENDAMENTO]
   - Objetivo: marcar horário com closer
   - Verificar disponibilidade via Google Calendar
   - Confirmar data, hora e formato (Google Meet link)
   - Critério de conclusão: evento criado
   ↓
[CONFIRMACAO]
   - Enviar resumo do agendamento
   - Lembrete de preparação ("separe suas dúvidas")
   - Trigger: handoff para closer (SW-08)
   ↓
[AGUARDANDO_REUNIAO]
   - Estado passivo — bot monitorando
   - Lembrete automático D-1 e H-1 (futuro)
   ↓
[ENCERRADO]
   - Lead desqualificado ou reunião realizada
   - Bot desativado para este número (ou em modo follow-up)

[NURTURING] (Frio/sem engajamento)
   - Sequência automática de mensagens em intervalos
   - Conteúdo de valor (dicas de inglês, curiosidades)
   - Sem pressão de venda
   - Reavaliar score a cada resposta

[HANDOFF_HUMANO] (qualquer estado)
   - Ativado quando: lead pede para falar com humano OU comportamento negativo
   - Bot desativado via Redis
   - Closer notificado imediatamente (mesmo que lead seja Frio)
```

---

## Critérios de transição

| Transição | Critério |
|-----------|---------|
| IDLE → SAUDACAO | Primeira mensagem recebida |
| SAUDACAO → DESCOBERTA | Lead forneceu nome |
| DESCOBERTA → PERFIL | Objetivo identificado pelo agente |
| PERFIL → QUALIFICACAO | Nível identificado |
| QUALIFICACAO → PROPOSTA | Score ≥ 61 |
| QUALIFICACAO → AQUECIMENTO | 31 ≤ Score < 61 |
| QUALIFICACAO → NURTURING | Score < 31 |
| AQUECIMENTO → PROPOSTA | Score sobe para ≥ 61 |
| PROPOSTA → AGENDAMENTO | Lead aceita agendar |
| AGENDAMENTO → CONFIRMACAO | Evento criado no Calendar |
| CONFIRMACAO → AGUARDANDO_REUNIAO | Mensagem de confirmação enviada |
| qualquer → HANDOFF_HUMANO | Lead pede humano OU comportamento negativo |

---

---

# ENTREGÁVEL 4 — SISTEMA DE QUALIFICAÇÃO

## Modelo de Lead Scoring (0–100 pontos)

### Dimensão 1 — Objetivo com o inglês (0–25 pts)

| Sinal | Pontos |
|-------|--------|
| Não soube responder / vago ("quero aprender inglês") | 5 |
| Objetivo pessoal (viagem de lazer, curtir séries) | 10 |
| Objetivo profissional (trabalho, reuniões, entrevistas) | 18 |
| Objetivo crítico (TOEFL, certificação, promoção confirmada, mudança de país) | 25 |

### Dimensão 2 — Urgência / Timeline (0–20 pts)

| Sinal | Pontos |
|-------|--------|
| "Sem pressa", "um dia", sem prazo | 0 |
| "Esse ano" | 5 |
| "Nos próximos 3 meses" | 12 |
| "Este mês" ou prazo explícito iminente | 20 |

### Dimensão 3 — Engajamento na conversa (0–20 pts)

| Sinal | Pontos |
|-------|--------|
| Respostas monossilábicas ("ok", "sim", "não") | 0 |
| Respostas completas mas passivas | 8 |
| Faz perguntas próprias sobre o curso | 15 |
| Demonstra entusiasmo explícito, menciona experiências | 20 |

### Dimensão 4 — Disponibilidade e comprometimento (0–20 pts)

| Sinal | Pontos |
|-------|--------|
| "Não tenho tempo" / menos de 2h/semana | 0 |
| 2–4 horas por semana | 10 |
| 5+ horas por semana OU disposto a alterar agenda | 20 |

### Dimensão 5 — Indicadores financeiros implícitos (0–15 pts)

| Sinal | Pontos |
|-------|--------|
| Perguntou se tem desconto antes de entender o produto | 0 |
| Perguntou sobre preço como segunda ou terceira pergunta | 5 |
| Não perguntou sobre preço (interesse no valor, não no custo) | 12 |
| Mencionou orçamento disponível ou comparou com outros cursos | 15 |

---

## Sinais negativos (dedução de pontos)

| Sinal | Dedução |
|-------|---------|
| "Só quero informação por curiosidade" | -15 |
| Levou mais de 24h para responder repetidamente | -10 |
| Reclamação ou comparação negativa com a escola | -10 |
| Pediu para ser contactado depois (sem prazo) | -5 |
| Cancelou agendamento sem reagendar | -20 |

---

## Temperatura

| Faixa | Temperatura | Ação |
|-------|-------------|------|
| 0–30 | 🧊 Frio | Nurturing automático. Revisitar em 3, 7, 14 dias |
| 31–60 | 🌡 Morno | Aquecimento ativo. Closer notificado em 48h para ação |
| 61–100 | 🔥 Quente | Agendamento imediato. Handoff urgente ao closer |

---

## Extração de sinais (como implementar)

O scoring **não depende de pergunta explícita**. O agente extrai sinais implícitos do histório de conversa via LLM estruturado (chainLlm + outputParserStructured):

```json
{
  "objetivo_nivel": "critico|profissional|pessoal|vago",
  "urgencia_nivel": "imediata|trimestral|anual|indefinida",
  "engajamento": 0-20,
  "disponibilidade_horas": "number|null",
  "sinal_financeiro": "positivo|neutro|negativo",
  "sinais_negativos": ["lista"]
}
```

Este LLM call acontece em SW-07 (Qualificação), **fora do caminho crítico** da resposta.

---

---

# ENTREGÁVEL 5 — ESTRATÉGIA DE MEMÓRIA

## Diagnóstico do uso atual

### Problema 1 — Dois sistemas de memória sem sincronização

- **Redis manual**: o fluxo grava mensagens brutas em Redis key `conversa:{phone}` via múltiplos `redis.set`
- **LangChain memoryRedisChat**: o agente usa Redis como chat history via LangChain

Esses dois sistemas **não conversam entre si**. O agente LangChain enxerga apenas o que foi dito diretamente a ele. O contexto de "imagem recebida" ou "áudio transcrito" adicionado manualmente ao Redis pode não estar disponível no contexto LangChain.

### Problema 2 — Memória sem limite (crescimento infinito)

Não existe TTL ou compressão. Conversa de 100 mensagens → 100 entradas no Redis → estoura o context window do LLM silenciosamente.

### Problema 3 — Memória sem checkpoint comercial

O agente não sabe que já coletou `objetivo`, `nível`, `urgência`. Se o Redis for limpo, o agente recomeça do zero e pergunta tudo de novo.

### Problema 4 — Debounce via Wait node é perigoso

Com 100 leads simultâneos, 100 execuções ficam suspensas no n8n aguardando o Wait terminar. Isso consome memória do n8n e pode causar instabilidade.

---

## Proposta de arquitetura de memória em 3 camadas

### Camada 1 — Memória de Curto Prazo (Redis, TTL 2h)

**O que armazena**: Últimas 20 mensagens da conversa atual + estado da sessão

```
redis key: session:{phone}
{
  "messages": [...últimas 20],
  "bot_ativo": true,
  "etapa_conversa": "qualificacao",
  "debounce_ts": 1716146400,
  "last_message_id": "abc123"
}
```

**Usado por**: SW-03 (Sessão), SW-05 (Agente)
**TTL**: 2 horas de inatividade → limpar e mover para Camada 2

### Camada 2 — Memória de Médio Prazo (Supabase, 30 dias)

**O que armazena**: Histórico completo de mensagens + snapshot comercial

```sql
-- tabela: conversas
lead_id, phone, etapa, score, temperatura, 
resumo_conversa (TEXT), -- gerado por LLM ao fim de cada sessão
objetivos_coletados (JSONB),
ultima_interacao (TIMESTAMP)
```

**Quando é gerada**: Ao fim de cada sessão (TTL Redis expirou ou bot desativado)
Um LLM call resume as últimas N mensagens em ~200 tokens.

**Usado por**: SW-04 (Leads), SW-07 (Qualificação), SW-08 (Handoff)

### Camada 3 — Memória Comercial (Supabase, permanente)

**O que armazena**: Decisões e marcos do lead

```sql
-- tabela: lead_timeline
lead_id, tipo_evento (TEXT), -- "objetivo_coletado", "score_atualizado", "agendamento_criado"
dados (JSONB),
timestamp (TIMESTAMP)
```

**Nunca limpa**. É o audit trail do lead.

---

## Compressão conversacional

Ao transferir da Camada 1 para a Camada 2:

```
chainLlm prompt:
"Resuma esta conversa em máximo 200 tokens, preservando:
- Nome do lead
- Objetivo com inglês
- Nível atual
- Urgência declarada
- Disponibilidade de horas
- Tom emocional (entusiasmado, hesitante, indiferente)
- Objeções levantadas
- Próximo passo combinado"
```

Esse resumo é injetado no contexto do agente na **próxima** sessão, antes do histórico recente.

---

## Injeção de contexto no agente (prompt estruturado)

```
=== CONTEXTO DO LEAD ===
Nome: {nome}
Etapa atual: {etapa_conversa}
Score atual: {score}/100 ({temperatura})

=== MEMÓRIA COMERCIAL ===
{resumo_sessao_anterior}

=== HISTÓRICO RECENTE ===
{últimas 10 mensagens}

=== MISSÃO DESTA SESSÃO ===
{instrução baseada na etapa: coletar objetivo | agendar | reengajar}
```

---

---

# ENTREGÁVEL 6 — HANDOFF PARA CLOSER

## O problema atual

O agente agenda no Google Calendar mas o closer não recebe:
- Nenhuma notificação ativa
- Nenhum contexto da conversa
- Nenhuma priorização
- Nenhum briefing de objeções

O closer descobre a reunião apenas abrindo o calendário.

---

## Briefing ideal do closer (o que receber)

### Mensagem WhatsApp para o closer

```
🔥 LEAD QUENTE - [nome do lead]
📱 WhatsApp: +55 11 99999-9999
📅 Reunião: Amanhã, 14h — Google Meet

🎯 Score: 87/100 | Temperatura: QUENTE

--- OBJETIVO ---
Aprovação no TOEFL para pós-graduação nos EUA. 
Prazo: 4 meses.

--- PERFIL ---
Nível: intermediário (já teve 2 anos de curso)
Disponibilidade: 8h/semana
Sinal financeiro: neutro (não perguntou sobre preço)

--- ENGAJAMENTO ---
Alta. Fez 3 perguntas próprias sobre metodologia.
Mencionou que um colega já é aluno.

--- OBJEÇÕES ---
"Já tentei outros cursos e não avancei"
→ Agente contornou com case de aluno com perfil similar.

--- PRÓXIMO PASSO ---
Demonstrar metodologia. Lead quer entender por que este 
curso seria diferente dos anteriores.

[Ver conversa completa]  [Confirmar reunião]
```

### Planilha "Leads Quentes Hoje" (Google Sheets)

| Nome | Telefone | Score | Temperatura | Reunião | Objetivo | Objeção principal | Status |
|------|---------|-------|-------------|---------|---------|------------------|--------|
| Maria S. | 11999 | 87 | 🔥 | 14h amanhã | TOEFL (4 meses) | "Já tentei outros cursos" | Aguardando |

---

## Estratégia de fila e priorização

### Prioridade de atendimento do closer

```
P1 (atender em até 2h): Score ≥ 80 + reunião agendada para hoje/amanhã
P2 (atender em até 24h): Score 61-79 + reunião agendada
P3 (atender esta semana): Score 61+ sem reunião (morno que aqueceu)
P4 (nurturing automático): Score < 61
```

### Distribuição entre closers (futuro, v2)

- Round-robin simples por Google Calendar disponível
- Verificar `Verificar Disponibilidade` antes de atribuir
- Se todos ocupados → colocar em fila e avisar lead sobre novo horário

### SLA

| Evento | SLA |
|--------|-----|
| Lead Quente → notificação ao closer | ≤ 2 minutos |
| Lead Quente sem resposta do closer em 4h | Alerta de escalação |
| Reunião sem confirmação do closer em D-1 | Alerta automático |
| Lead não aparece na reunião | Re-engajamento automático em 24h |

### Re-engajamento pós-no-show

Se o lead não aparecer na reunião:
1. Bot reativa automaticamente em 2h
2. Mensagem empática: "Tudo bem? Vi que não conseguiu comparecer..."
3. Oferecer reagendamento
4. Closer mantém em P2 por mais 48h

---

---

# ENTREGÁVEL 7 — OBSERVABILIDADE

## O que precisa ser rastreado

### Métricas de negócio

| Métrica | Fonte | Frequência |
|---------|-------|-----------|
| Leads entrando / dia | Supabase (leads) | Real-time |
| Taxa de qualificação (Frio/Morno/Quente) | Supabase (score) | Diária |
| Taxa de agendamento | Google Calendar | Diária |
| Taxa de show da reunião | Calendar + flag | Pós-reunião |
| Taxa de conversão (fechamento) | CRM | Semanal |
| Custo médio por lead qualificado | Supabase (billing) | Diária |

### Métricas técnicas

| Métrica | Fonte | Alerta |
|---------|-------|--------|
| Latência média de resposta | Log de execução | > 10s |
| Falhas de Whisper | Log de erro | > 5% das mensagens |
| Falhas de OpenRouter | Log de erro | qualquer falha |
| Redis timeout | Log de erro | qualquer |
| Custo diário de tokens | Supabase (billing) | > threshold |
| Mensagens sem resposta | Log de execução | > 2 por hora |
| Execuções suspensas (Wait nodes) | n8n execution log | > 50 |

### Onde o lead dropa (funil)

```
Entrada → Saudação: taxa de resposta D1
Saudação → Descoberta: % que respondeu ao primeiro contato
Descoberta → Perfil: % que completou o perfil
Perfil → Qualificação: % que chegou ao score
Qualificação → Proposta: % que foi Quente
Proposta → Agendamento: % que aceitou agendar
Agendamento → Show: % que compareceu
Show → Fechamento: % que comprou
```

---

## Estrutura de logs estruturados

Cada evento deve ser gravado no Supabase com esta estrutura:

```sql
-- tabela: eventos_sdr
id UUID,
lead_id UUID,
phone VARCHAR,
evento_tipo VARCHAR, -- 'mensagem_recebida', 'agente_respondeu', 'score_atualizado', 'handoff_enviado', 'erro_whisper', etc.
dados JSONB,
latencia_ms INTEGER,
tokens_input INTEGER,
tokens_output INTEGER,
custo_usd DECIMAL,
timestamp TIMESTAMPTZ
```

---

## Rastreamento de hallucination

O agente não deve inventar:
- Preços de cursos
- Datas de turmas
- Nomes de professores
- Garantias não existentes

**Detecção**: LLM judge após cada resposta (assíncrono, não bloqueia envio):

```
chainLlm prompt: "A resposta do agente abaixo contém alguma afirmação que não está
na base de conhecimento fornecida? Responda apenas JSON: {hallucination: bool, trecho: string}"
```

Se `hallucination: true` → gravar em tabela `hallucinations` para revisão.

---

## Dashboard operacional (proposta)

| Painel | Widgets |
|--------|---------|
| **Hoje** | Leads entrando, Leads qualificados, Reuniões agendadas, Custo total |
| **Funil** | Sankey: entrada → qualificado → agendado → fechado |
| **Fila do Closer** | Tabela de P1/P2/P3 com SLA countdown |
| **Saúde técnica** | Latência média, erros últimas 24h, Redis status |
| **Conversas ativas** | Leads em conversa agora, etapa, última mensagem |

---

---

# ENTREGÁVEL 8 — AUDITORIA DE DÍVIDA TÉCNICA

## Anti-patterns por severidade

---

### SEVERIDADE CRÍTICA — Risco de produção imediato

**DT-01: Fluxo inteiro duplicado**
- **O que é**: O workflow tem dois conjuntos idênticos de nodes (2 agentes, 10 calendar tools, 8 nodes OpenRouter, etc.)
- **Impacto**: Dobro de uso de recursos, comportamento imprevisível, impossível debugar qual "cópia" executou
- **Ação**: Remover a duplicata inteira. Mapear conexões antes para garantir que a cópia "boa" seja mantida.
- **Risco ao corrigir**: Alto — remover nodes errados pode quebrar o fluxo principal

**DT-02: System prompt incorreto em produção**
- **O que é**: Agente se apresenta como SDR de bots para imobiliárias, não escola de inglês
- **Impacto**: Todos os leads recebem pitch errado. Qualquer conversão é acidental.
- **Ação**: Reescrever o system prompt imediatamente (ou desativar o workflow até reescrever)

**DT-03: Wait node como mecanismo de debounce**
- **O que é**: Execuções ficam suspensas no n8n aguardando o timer do Wait
- **Impacto**: 100 leads simultâneos = 100 execuções suspensas consumindo memória do n8n. Em pico, o n8n pode ficar instável.
- **Ação**: Substituir por debounce via Redis timestamp (gravar timestamp, checar depois)

---

### SEVERIDADE ALTA — Degradação de qualidade e custo

**DT-04: Dois LLMs extra no pipeline de saída (humanizador + personalidade)**
- **O que é**: Após o agente responder, há 2 chamadas LLM adicionais antes de enviar a mensagem
- **Impacto**: +4 a 6 segundos de latência por mensagem, +30% de custo
- **Ação**: Eliminar `Seta Personalidade do Assistente` + `LLM ChatGPT`. O splitting de mensagens pode ser feito com lógica declarativa (dividir por pontuação, limite de chars)

**DT-05: Pipeline de ingestão de conhecimento desabilitado**
- **O que é**: 4 Google Drive Triggers desabilitados → base de conhecimento nunca é atualizada automaticamente
- **Impacto**: O agente responde com informações desatualizadas sobre a escola
- **Ação**: Reativar em subworkflow separado (SW-09)

**DT-06: Billing gravado síncronamente no caminho principal**
- **O que é**: `Grava Billing do Agent no Supabase` está no caminho crítico antes do envio da mensagem
- **Impacto**: Se o Supabase estiver lento, a resposta ao lead demora
- **Ação**: Mover para execução assíncrona (fire-and-forget via executeWorkflow sem aguardar)

**DT-07: Ausência total de qualificação estruturada**
- **O que é**: Não existe scoring. O agente toma decisões de qualificação sem critérios objetivos.
- **Impacto**: Leads quentes podem ser perdidos por subjetividade. Closer não tem priorização.
- **Ação**: Implementar SW-07 (Qualificação)

**DT-08: Sem handoff operacional para closer**
- **O que é**: O agente agenda mas o closer não recebe briefing
- **Impacto**: Reuniões acontecem sem contexto. Closer perde tempo repetindo triagem.
- **Ação**: Implementar SW-08 (Handoff)

---

### SEVERIDADE MÉDIA — Manutenção e escalabilidade

**DT-09: Código de setup de banco no workflow operacional**
- **O que é**: 7 nodes de `CREATE TABLE` / `CREATE EXTENSION` desabilitados mas presentes
- **Impacto**: Risco de reativação acidental. Poluição do workflow.
- **Ação**: Mover para SW-10 (Setup), remover do workflow operacional

**DT-10: Dois nodes de envio de mensagem de texto com nomes diferentes**
- **O que é**: `Enviar Mensagem no WhatsApp` e `Enviar Mensagem para o WhatsApp` — qual é qual?
- **Impacto**: Ambiguidade, um pode estar conectado incorretamente
- **Ação**: Unificar em função única no SW-06

**DT-11: Memória Redis sem TTL e sem compressão**
- **O que é**: Histórico de conversa cresce indefinidamente no Redis
- **Impacto**: Estouro de context window no LLM silenciosamente, custo crescente de tokens
- **Ação**: Implementar a estratégia de 3 camadas de memória (Entregável 5)

**DT-12: RAG sem avaliação de qualidade**
- **O que é**: O Supabase Vector Store é consultado mas não se sabe se está retornando resultados relevantes
- **Impacto**: Hallucination sem detecção, agente inventa respostas sobre a escola
- **Ação**: Implementar rastreamento de hallucination (Entregável 7)

**DT-13: Dois pipelines de ingestão com código diferente mas função igual**
- **O que é**: Dois clusters separados de ingestão (um era para Pinecone, outro para Supabase) com código duplicado
- **Impacto**: Manutenção dupla, inconsistência no chunking
- **Ação**: Unificar em SW-09 com um único pipeline parametrizável

**DT-14: Calculator como tool do agente SDR**
- **O que é**: O agente de SDR de inglês tem uma calculadora como ferramenta
- **Impacto**: Inútil para este contexto. Desperdiça espaço de contexto nas tools.
- **Ação**: Remover

**DT-15: Variáveis de configuração hardcodadas no Set node**
- **O que é**: `usarElevenLabs`, `apiKey_eleven`, etc. estão num Set node que qualquer editor pode alterar
- **Impacto**: Risco de vazar API keys, difícil de gerenciar entre ambientes
- **Ação**: Mover para Variáveis de Ambiente do n8n ou credentials

---

### SEVERIDADE BAIXA — Qualidade de código

**DT-16: 100 Sticky Notes sem estrutura de documentação**
- **O que é**: 100 nodes de anotação mas sem padrão — algumas em PT, algumas em EN, tamanhos variados
- **Ação**: Padronizar após refatoração

**DT-17: noOp nodes (14 no total)**
- **O que é**: 14 nodes "No Operation, do nothing" — muitos são placeholders de branches mortas
- **Ação**: Remover junto com as branches mortas

**DT-18: Postgres e Supabase misturados**
- **O que é**: 14 nodes postgres e 16 nodes supabase — para o mesmo banco
- **Impacto**: Dois drivers diferentes para o mesmo banco complica o gerenciamento de credenciais
- **Ação**: Unificar em um driver (preferencialmente Supabase que tem abstração melhor)

---

## Scorecard de dívida técnica

| Categoria | Débitos encontrados | Severidade média |
|-----------|--------------------|--------------------|
| Duplicação de código | 5 | Alta |
| Ausência de features críticas | 3 | Alta |
| Performance / latência | 4 | Alta |
| Manutenibilidade | 6 | Média |
| Qualidade de código | 3 | Baixa |
| **Total** | **21 débitos** | |

---

---

# PLANO DE MIGRAÇÃO INCREMENTAL

## Princípio: nunca quebrar produção

Cada fase pode ser executada independentemente. O workflow atual continua funcionando até a migração completa.

### Fase 0 — Hotfixes urgentes (sem refatoração)
**Duração estimada**: 1 sessão
- [ ] Corrigir system prompt (imobiliária → escola de inglês)
- [ ] Remover duplicata do fluxo principal (DT-01)
- [ ] Desativar/remover Calculator tool (DT-14)

### Fase 1 — Extração de setup
**Duração estimada**: 1 sessão
- [ ] Criar SW-10 (Setup) com todos os nodes de inicialização
- [ ] Remover do workflow principal

### Fase 2 — Subworkflows de processamento
**Duração estimada**: 2 sessões
- [ ] Criar SW-02 (Processamento de Mensagem) — isolar Whisper, Vision, extratores
- [ ] Criar SW-09 (Ingestão de Conhecimento) — reativar pipeline de RAG
- [ ] Testar isoladamente

### Fase 3 — Subworkflows de sessão e leads
**Duração estimada**: 1 sessão
- [ ] Criar SW-03 (Sessão e Debounce) — substituir Wait node por debounce Redis
- [ ] Criar SW-04 (Gestão de Leads)

### Fase 4 — Agente e output
**Duração estimada**: 2 sessões
- [ ] Criar SW-05 (Agente Camis) com novo system prompt
- [ ] Criar SW-06 (Output) — remover LLMs extras do pipeline de saída

### Fase 5 — Features novas
**Duração estimada**: 2-3 sessões
- [ ] Criar SW-07 (Qualificação e Scoring)
- [ ] Criar SW-08 (Handoff para Closer)
- [ ] Implementar memória em 3 camadas

### Fase 6 — Observabilidade
**Duração estimada**: 1-2 sessões
- [ ] Implementar logs estruturados
- [ ] Implementar tracking de funil
- [ ] Implementar rastreamento de hallucination

---

*Documento gerado em 2026-05-19. Nenhuma implementação deve ocorrer sem aprovação explícita de cada fase.*
