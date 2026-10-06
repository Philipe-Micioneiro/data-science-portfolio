# PRD — Sistema de Gestão Escolar
## Escola de Inglês
### Versão 1.1 — Atualizado em 03/06/2026

> **Changelog v1.1:**
> - Adicionado módulo de Gestão de Usuários (§8 e §11)
> - Adicionado fluxo de Recuperação de Senha (§7)
> - Adicionado fluxo de Rejeição com Motivo Obrigatório (§17)
> - Adicionado fluxo de Inativação de Aluno com motivo (§9 e §12)
> - Adicionado fluxo de Edição de Aluno com controle por perfil (§9)
> - Adicionado alerta de Alunos em Risco de Inativação (§8 e §19)
> - Adicionado módulo de Agenda de Aulas (§33) — incorporado ao escopo oficial
> - Adicionado módulo de Financeiro de Professores (§34) — incorporado ao escopo oficial
> - Corrigido: Auditoria restrita a Administrador (removida do Secretário)
> - Adicionada regra de bloqueio de agendamento para alunos inativos
> - Esclarecido: Professor pode ver status operacional, mas não dados financeiros

---

# 1. Visão do Produto

O Sistema de Gestão Escolar é uma plataforma web desenvolvida para centralizar toda a operação administrativa, financeira e operacional da escola de inglês.

O produto nasce para substituir o processo atual baseado em planilhas Excel compartilhadas, reduzindo erros operacionais, aumentando a governança dos dados e oferecendo uma visão consolidada da saúde financeira e operacional da escola.

A plataforma foi projetada com foco em simplicidade, velocidade de uso e baixa carga cognitiva, permitindo que usuários com pouca familiaridade tecnológica consigam executar suas atividades sem necessidade de treinamento complexo.

## O sistema atende cinco necessidades principais:

### Controle de alunos

Permitir o gerenciamento completo dos alunos da escola, incluindo:

- cadastro e edição com controle por perfil
- vínculo com professores
- acompanhamento de status (operacional e financeiro)
- histórico operacional e financeiro
- fluxo de inativação e reativação

### Controle financeiro

Permitir acompanhar:

- pagamentos recebidos
- pagamentos pendentes
- inadimplência
- histórico financeiro por competência
- comprovantes de pagamento com antifraude

### Gestão de agenda

Permitir o agendamento, controle e histórico de aulas entre alunos e professores.

### Gestão financeira de professores

Permitir o controle do pagamento aos professores com base nas aulas realizadas no mês.

### Governança operacional

Garantir rastreabilidade completa das ações realizadas dentro da plataforma através de auditoria forense detalhada.

---

# 2. Objetivo do Produto

Criar uma plataforma única para gestão administrativa da escola que permita:

- eliminar dependência de planilhas Excel
- centralizar dados em um único ambiente
- reduzir erros operacionais
- controlar inadimplência
- acompanhar crescimento da operação
- melhorar rastreabilidade
- simplificar o trabalho administrativo

O sistema deve ser capaz de operar toda a rotina da escola através de uma interface simples e altamente visual.

---

# 3. Personas e Papéis

O sistema possui exatamente três perfis de usuário.

Toda regra de acesso, visualização e permissão deve ser baseada nesses papéis.

---

## 3.1 Administrador

### Quem é

Responsável máximo pela operação.

Normalmente representa:

- proprietário
- gestor da escola
- responsável financeiro

### Como nasce

Criado manualmente no sistema (setup inicial).

Possui acesso irrestrito.

### O que pode fazer

- visualizar todos os dados
- criar usuários (secretários e professores)
- editar usuários
- inativar usuários
- resetar senhas de usuários
- cadastrar alunos
- editar todos os campos dos alunos (inclusive valor da mensalidade)
- inativar e reativar alunos
- registrar pagamentos
- validar comprovantes (aprovar e rejeitar com motivo)
- acessar dashboards financeiros completos (receita global, inadimplência)
- acessar auditoria completa
- exportar relatórios
- alterar status de alunos
- visualizar histórico financeiro
- gerenciar agenda
- visualizar e registrar pagamento de professores
- acessar configurações do sistema

### O que não pode

Nenhuma restrição funcional na V1.

---

## 3.2 Secretário

### Quem é

Responsável pela operação administrativa diária.

### Como nasce

Criado pelo administrador.

Recebe senha temporária.

É obrigado a trocar a senha no primeiro acesso.

### O que pode fazer

- cadastrar alunos
- editar alunos (exceto valor da mensalidade)
- inativar e reativar alunos
- cadastrar professores
- editar professores
- inativar professores
- registrar pagamentos
- anexar comprovantes
- validar comprovantes (aprovar e rejeitar com motivo)
- visualizar histórico financeiro operacional
- alterar status dos alunos
- exportar dados operacionais
- gerenciar agenda
- visualizar e registrar pagamento de professores

### O que não pode fazer

- acessar métricas financeiras globais (receita consolidada, inadimplência em valor total)
- visualizar faturamento consolidado
- alterar permissões do sistema
- gerenciar administradores
- acessar a auditoria do sistema
- alterar valor da mensalidade dos alunos

---

## 3.3 Professor

### Quem é

Responsável exclusivamente pelo acompanhamento dos alunos vinculados a ele.

### Como nasce

Criado pelo administrador ou secretário.

Recebe senha temporária.

É obrigado a trocar a senha no primeiro acesso.

### O que pode fazer

- visualizar seus próprios alunos (dados cadastrais, status operacional, observações)
- consultar dados cadastrais dos seus alunos
- acompanhar situação operacional dos seus alunos (Ativo / Inativo)
- visualizar sua própria agenda de aulas
- visualizar e editar seus dados pessoais

### O que não pode fazer

- visualizar pagamentos
- visualizar comprovantes
- visualizar faturamento
- visualizar inadimplência financeira
- visualizar valor de mensalidade dos alunos
- editar dados dos alunos
- cadastrar alunos
- cadastrar usuários
- exportar dados financeiros
- visualizar alunos de outros professores
- acessar a auditoria

---

# 4. Estrutura do Domínio

A estrutura principal do sistema é composta pelas seguintes entidades:

Professor ↔ Aluno ↔ Pagamento ↔ Comprovante

Complementadas por:

- Usuários
- Auditoria
- Histórico Financeiro
- Agenda de Aulas
- Pagamento de Professores

---

## 4.1 Aluno

Representa uma pessoa matriculada na escola.

Cada aluno possui:

- dados cadastrais
- informações financeiras
- histórico de pagamentos
- vínculo com professores
- histórico de agenda

---

## 4.2 Professor

Representa um professor da escola.

Um professor pode possuir múltiplos alunos.

Possui dados financeiros próprios (valor hora/aula, forma de pagamento).

---

## 4.3 Pagamento

Representa uma mensalidade referente a uma competência específica.

Exemplos:

- Janeiro/2026
- Fevereiro/2026
- Março/2026

Cada pagamento possui ciclo próprio.

---

## 4.4 Comprovante

Documento utilizado para validar um pagamento.

Formatos aceitos: PDF, JPG, PNG.

Obrigatório para pagamentos manuais (PIX e Boleto).

---

## 4.5 Usuário

Representa qualquer pessoa que acessa o sistema.

Tipos: Administrador / Secretário / Professor.

---

## 4.6 Auditoria

Registro permanente e imutável de ações realizadas dentro da plataforma.

---

## 4.7 Agenda de Aulas

Representa os eventos de aula entre alunos e professores.

Permite rastrear frequência, aulas realizadas e cancelamentos.

---

## 4.8 Pagamento de Professores

Representa o valor devido a cada professor no mês, calculado automaticamente com base nas aulas realizadas multiplicado pelo valor hora/aula.

---

# 5. Entidades Principais

## 5.1 Students

Tabela principal de alunos.

Campos obrigatórios:

| Campo             | Tipo      |
| ----------------- | --------- |
| id                | UUID      |
| nome              | Texto     |
| telefone          | Texto     |
| email             | Texto     |
| plano             | Texto     |
| nivel_ingles      | Texto     |
| valor_mensalidade | Monetário |
| dia_vencimento    | Inteiro   |
| data_entrada      | Data      |
| carga_horaria     | Texto     |
| observacoes       | Texto     |
| status            | Enum      |
| motivo_inativacao | Texto     |
| criado_por        | UUID      |
| criado_em         | Timestamp |
| atualizado_em     | Timestamp |

### Status possíveis

#### Ativo

Aluno com situação financeira regularizada.

#### Atrasado

Mais de 5 dias úteis após vencimento sem pagamento validado.

#### Pendente de Validação

Existe comprovante anexado aguardando aprovação.

#### Inativo

Mais de 30 dias sem regularização.

Também pode ser definido manualmente (com motivo opcional).

---

## 5.2 Teachers

Tabela de professores.

Campos:

| Campo            | Tipo      |
| ---------------- | --------- |
| id               | UUID      |
| user_id          | UUID      |
| nome             | Texto     |
| email            | Texto     |
| telefone         | Texto     |
| valor_hora       | Monetário |
| forma_pagamento  | Enum      |
| obs_financeiras  | Texto     |
| status           | Enum      |
| criado_em        | Timestamp |
| atualizado_em    | Timestamp |

---

## 5.3 Student_Teachers

Relacionamento N:N.

Permite:

- um aluno possuir vários professores
- um professor possuir vários alunos

---

## 5.4 Payments

Histórico financeiro.

Campos:

| Campo              | Tipo           |
| ------------------ | -------------- |
| id                 | UUID           |
| student_id         | UUID           |
| competencia        | Texto (mês/ano)|
| competencia_date   | Data           |
| valor_previsto     | Monetário      |
| valor_pago         | Monetário      |
| forma_pagamento    | Enum           |
| vencimento         | Data           |
| status             | Enum           |
| aprovado_por       | UUID           |
| aprovado_em        | Timestamp      |
| motivo_rejeicao    | Texto          |
| criado_por         | UUID           |
| criado_em          | Timestamp      |
| atualizado_em      | Timestamp      |

---

## 5.5 Payment_Receipts

Comprovantes.

Campos:

| Campo        | Tipo      |
| ------------ | --------- |
| id           | UUID      |
| payment_id   | UUID      |
| arquivo_url  | Texto     |
| hash_sha256  | Texto     |
| formato      | Enum      |
| enviado_por  | UUID      |
| enviado_em   | Timestamp |

---

## 5.6 Users_Profile

Perfis de usuário (extensão do Supabase Auth).

Campos:

| Campo                | Tipo      |
| -------------------- | --------- |
| id                   | UUID      |
| nome                 | Texto     |
| perfil               | Enum      |
| status               | Enum      |
| precisa_trocar_senha | Boolean   |
| ultimo_acesso        | Timestamp |
| criado_em            | Timestamp |
| atualizado_em        | Timestamp |

---

## 5.7 Audit_Logs

Auditoria forense.

Campos:

| Campo        | Tipo      |
| ------------ | --------- |
| id           | UUID      |
| usuario_id   | UUID      |
| perfil       | Texto     |
| acao         | Texto     |
| entidade     | Texto     |
| entidade_id  | UUID      |
| dados_antes  | JSON      |
| dados_depois | JSON      |
| ip           | Texto     |
| user_agent   | Texto     |
| criado_em    | Timestamp |

---

## 5.8 Agenda

Eventos de aula.

Campos:

| Campo         | Tipo      |
| ------------- | --------- |
| id            | UUID      |
| student_id    | UUID      |
| teacher_id    | UUID      |
| start_at      | Timestamp |
| duracao_min   | Inteiro   |
| observacoes   | Texto     |
| status        | Enum      |
| criado_por    | UUID      |
| criado_em     | Timestamp |
| atualizado_em | Timestamp |

Status de aula: Agendada / Realizada / Cancelada

---

## 5.9 Teacher_Payments

Pagamento mensal de professores.

Campos:

| Campo         | Tipo      |
| ------------- | --------- |
| id            | UUID      |
| teacher_id    | UUID      |
| competencia   | Texto     |
| horas         | Decimal   |
| valor_hora    | Monetário |
| valor_devido  | Monetário |
| valor_pago    | Monetário |
| status        | Enum      |
| criado_em     | Timestamp |
| atualizado_em | Timestamp |

Status: Pago / Parcial / Pendente

**Nota:** pagamento parcial É permitido para professores.

---

# 6. Relacionamentos

## Professor ↔ Aluno

Relacionamento muitos para muitos.

---

## Aluno ↔ Pagamento

Relacionamento um para muitos.

---

## Pagamento ↔ Comprovante

Relacionamento um para um.

Todo pagamento manual deve possuir exatamente um comprovante.

---

## Usuário ↔ Auditoria

Relacionamento um para muitos.

Toda ação gera registros auditáveis.

---

## Professor ↔ Agenda

Relacionamento um para muitos.

---

## Aluno ↔ Agenda

Relacionamento um para muitos.

---

# 7. Autenticação e Controle de Acesso

## 7.1 Modelo de Autenticação

A plataforma utiliza autenticação própria baseada em:

- e-mail
- senha

Não utiliza: login social, OAuth, Google, Microsoft.

---

## 7.2 Primeiro Acesso

Todo usuário criado recebe:

- login por e-mail
- senha temporária

No primeiro acesso:

```text
precisa_trocar_senha = true
```

O sistema bloqueia o acesso até a troca da senha.

A senha temporária deve ser exibida no momento da criação do usuário (dentro do sistema, para o Admin ou Secretário que criou), com opção de copiar.

---

## 7.3 Regras de Senha

Senha obrigatoriamente deve possuir:

- mínimo 8 caracteres
- 1 letra maiúscula
- 1 letra minúscula
- 1 número

Validação em tempo real no frontend com indicadores visuais.

---

## 7.4 Recuperação de Senha

Fluxo completo:

1. Usuário informa e-mail na tela de login
2. Sistema envia link temporário via Brevo SMTP
3. Link redireciona para /redefinir-senha?token=xxx
4. Usuário define nova senha (com validação das regras)
5. Token é invalidado após uso
6. Sistema registra evento na auditoria
7. Se token expirado: exibir tela de erro com opção de solicitar novo link

---

## 7.5 Sessão

Requisitos mínimos:

- sessão segura via Supabase Auth
- cookies HttpOnly
- HTTPS obrigatório em produção
- expiração automática por inatividade
- refresh automático transparente

---

## 7.6 Controle de Permissões

Todas as rotas do sistema devem ser protegidas por perfil.

Validação obrigatória em dois níveis:
1. Middleware Next.js (frontend — UX)
2. RLS Supabase (backend — segurança real)

| Perfil | Nível de acesso |
|--------|----------------|
| Administrador | Acesso total |
| Secretário | Acesso operacional (sem financeiro global, sem auditoria) |
| Professor | Acesso apenas aos seus alunos e sua agenda |

---

## 7.7 Auditoria de Autenticação

Toda autenticação gera eventos:

- login bem sucedido
- login falho
- logout
- redefinição de senha
- troca de senha (primeiro acesso)
- recuperação de senha

---

# 8. Gestão de Usuários

## 8.1 Visão Geral

Módulo exclusivo do Administrador para gerenciar todos os usuários do sistema.

Rota: `/admin/usuarios`

---

## 8.2 KPIs da Tela de Usuários

- Total de usuários
- Administradores
- Secretários
- Professores
- Inativos

---

## 8.3 Listar Usuários

Visualizar:

- nome
- e-mail
- perfil
- status
- último acesso

Filtros:

- Todos / Administrador / Secretário / Professor / Inativo

Busca por nome ou email.

---

## 8.4 Criar Usuário

Campos:

- nome
- e-mail
- perfil (Secretário ou Professor — Admin não cria outro Admin por este fluxo)

O sistema:

- gera senha temporária
- exibe a senha temporária no modal para o Admin copiar
- envia e-mail com credenciais via Brevo SMTP
- força troca de senha no primeiro login (precisa_trocar_senha = true)

---

## 8.5 Editar Usuário

Permite alterar:

- nome
- e-mail
- status (Ativo / Inativo)

Não permite alterar:

- perfil (para mudar perfil: inativar e criar novo usuário)
- histórico
- auditoria

---

## 8.6 Inativar / Reativar Usuário

Soft delete.

O usuário:

- perde acesso
- mantém histórico
- mantém auditoria

Administrador não pode inativar a si mesmo.

---

## 8.7 Resetar Senha

O Administrador pode gerar nova senha temporária para qualquer usuário.

A nova senha temporária é exibida no modal para o Admin copiar.

O sistema define `precisa_trocar_senha = true` novamente.

---

# 9. Área da Secretaria e Admin

## 9.1 Gestão de Alunos

Rota: `/alunos`

---

### Listar Alunos

Colunas:

- nome + email
- telefone
- professor(es)
- data de cadastro
- mensalidade
- vencimento
- status
- situação financeira

Filtros:

- Todos / Ativo / Atrasado / Pendente de validação / Inativo / **Risco de inativação**

Busca por nome, telefone ou e-mail.

---

### 9.2 Cadastro de Alunos

Campos obrigatórios:

- nome
- telefone
- e-mail
- plano
- nível de inglês
- valor da mensalidade
- dia do vencimento
- data de entrada
- professor(es)

Campos opcionais:

- observações
- carga horária

---

### 9.3 Edição de Alunos

Campos editáveis por perfil:

| Campo | Administrador | Secretário |
|-------|--------------|-----------|
| Telefone / Email | ✅ | ✅ |
| Plano | ✅ | ✅ |
| Nível | ✅ | ✅ |
| Valor da mensalidade | ✅ | ❌ (bloqueado com cadeado) |
| Dia de vencimento | ✅ | ✅ |
| Carga horária | ✅ | ✅ |
| Professor(es) | ✅ | ✅ |
| Observações | ✅ | ✅ |

Nome e data de entrada são campos imutáveis após o cadastro.

Toda alteração gera auditoria com dados_antes e dados_depois.

---

### 9.4 Inativação de Alunos

Não existe exclusão física.

Fluxo:

1. Selecionar aluno
2. Clicar em "Inativar aluno"
3. Sistema exibe modal de confirmação com resumo do aluno
4. Informar motivo (opcional)
5. Confirmar inativação

O histórico permanece preservado.

O aluno inativado não pode ter novas aulas agendadas.

---

### 9.5 Reativação de Alunos

Fluxo:

1. Selecionar aluno inativo
2. Clicar em "Reativar aluno"
3. Confirmação rápida inline
4. Status volta para "Ativo"

---

## 9.6 Gestão de Professores

Rota: `/professores`

---

### Criar Professor

Campos:

- nome
- e-mail (obrigatório)
- telefone
- valor hora/aula
- forma de pagamento (PIX, Transferência, Boleto)
- observações financeiras

Sistema:

- gera senha temporária
- exibe senha no modal para cópia
- envia credenciais via Brevo SMTP
- força troca de senha

---

### Editar Professor

Permite alterar:

- nome
- telefone
- e-mail
- valor hora/aula
- forma de pagamento
- observações financeiras

---

### Inativar Professor

Soft delete. O histórico e agenda permanecem preservados.

---

# 10. Área do Professor

## 10.1 Dashboard do Professor

Cards (apenas dos seus alunos):

- total de alunos
- alunos ativos
- alunos atrasados + pendentes de validação (agrupados como "pendência operacional")
- alunos inativos

Nota: o professor visualiza o status operacional dos alunos para fins de acompanhamento, mas não visualiza valores financeiros, comprovantes, receita ou inadimplência em termos monetários.

---

## 10.2 Lista de Alunos

Rota: `/meus-alunos`

Exibe apenas alunos vinculados ao professor logado.

Informações disponíveis:

- nome
- telefone
- e-mail
- plano
- nível
- status operacional

Informações ocultas (sem exceção):

- pagamentos
- comprovantes
- valor de mensalidade
- inadimplência financeira
- faturamento
- receita

---

## 10.3 Agenda do Professor

Rota: `/agenda`

Exibe apenas as aulas do professor logado.

Não pode criar, editar ou cancelar aulas (apenas visualizar).

---

# 11. Alertas Operacionais

## 11.1 Alunos em Risco de Inativação

Definição: alunos com status "Atrasado" há mais de 20 dias (entre 20 e 30 dias de atraso — faixa crítica antes da inativação automática em 30 dias).

Onde aparece:

- Dashboard do Administrador: widget dedicado
- Dashboard do Secretário: widget dedicado
- Tela de Alunos: chip de filtro "Risco de inativação" com contador

---

## 11.2 Comprovantes Pendentes

Badge numérico no item "Validações" do menu lateral.

Atualizado em tempo real (ou a cada navegação).

---

## 11.3 Próximos Vencimentos

Lista de mensalidades a vencer nos próximos 10 dias com status diferente de "Pago".

---

# 12. Ciclo de Vida do Aluno

## Fluxo principal:

```
Cadastro
↓
Ativo
↓
Atrasado (após 5 dias úteis sem pagamento)
↓
Pendente de Validação (ao anexar comprovante)
↓
Ativo (ao aprovar pagamento)
```

## Ou:

```
Cadastro
↓
Ativo
↓
Atrasado
↓
Risco de inativação (>20 dias)
↓
Inativo (automático após 30 dias ou manual)
```

## Reativação:

```
Inativo
↓
Reativar manualmente (Admin ou Secretário)
↓
Ativo
```

---

## 12.1 Alteração Automática de Status

### Ativo

Pagamento validado.

### Atrasado

Mais de 5 dias úteis após vencimento sem pagamento validado.

### Pendente de Validação

Comprovante anexado. Aguardando análise.

### Inativo

Mais de 30 dias sem regularização (rotina diária automatizada).

---

# 13. Fluxos Operacionais

## Fluxo 1 — Novo Aluno

1. Admin ou Secretário cria aluno
2. Vincula professor(es)
3. Salva cadastro
4. Sistema registra auditoria

## Fluxo 2 — Recebimento de Comprovante

1. Aluno envia comprovante (via WhatsApp ou Email)
2. Secretário localiza aluno
3. Secretário abre "Registrar pagamento"
4. Seleciona aluno, forma de pagamento, sobe comprovante
5. Sistema calcula SHA256 e verifica duplicidade
6. Se duplicado: exibe erro contextual ("Já utilizado para [aluno] na competência [mês]")
7. Se válido: sistema cria registro com status "Pendente de Validação"

## Fluxo 3 — Aprovação de Pagamento

1. Secretário ou Administrador abre "Validações"
2. Seleciona comprovante da fila
3. Visualiza preview do comprovante (PIX ou Boleto)
4. Verifica dados (valor, competência, pagador)
5. Clica "Aprovar"
6. Sistema: altera pagamento para "Pago", aluno para "Ativo", atualiza métricas, registra auditoria

## Fluxo 4 — Rejeição de Pagamento

1. Secretário ou Administrador abre "Validações"
2. Visualiza comprovante
3. Clica "Rejeitar"
4. Sistema exibe modal com campo de motivo (obrigatório, mínimo 20 caracteres)
5. Confirma rejeição
6. Sistema: mantém pagamento como "Atrasado", registra motivo, envia email de notificação ao aluno, registra auditoria

## Fluxo 5 — Inativação Manual de Aluno

1. Admin ou Secretário abre detalhe do aluno
2. Clica "Inativar aluno"
3. Sistema exibe modal de confirmação com resumo do aluno
4. Informa motivo opcional
5. Confirma
6. Sistema: altera status para "Inativo", registra motivo_inativacao, registra auditoria, bloqueia agendamento de novas aulas

## Fluxo 6 — Inativação Automática de Aluno

Sistema executa rotina diária (cron):

- Se atraso > 30 dias: altera status para "Inativo"
- Registra motivo: "Inativação automática — 30 dias sem regularização"
- Registra auditoria
- Atualiza dashboard

## Fluxo 7 — Exportação

1. Usuário aplica filtros na tela desejada
2. Clica "Exportar"
3. Sistema gera XLSX ou CSV apenas com os registros filtrados
4. Registra na auditoria: usuário, filtros aplicados, total de registros, formato

## Fluxo 8 — Criação de Usuário

1. Admin abre "Usuários"
2. Clica "Novo usuário"
3. Informa nome, email, perfil
4. Sistema gera senha temporária
5. Exibe senha no modal (Admin copia)
6. Sistema envia email com credenciais via Brevo
7. Usuário faz primeiro login → é obrigado a trocar a senha

## Fluxo 9 — Agendamento de Aula

1. Admin ou Secretário cria evento de aula
2. Seleciona professor e aluno
3. Se aluno estiver "Inativo": sistema exibe aviso e bloqueia confirmação
4. Se aluno ativo: define data, horário e duração
5. Sistema cria evento com status "Agendada"

---

# 14. Gestão Financeira

## 14.1 Filosofia Financeira

O sistema trabalha com dois conceitos distintos:

### Receita Prevista

Valor esperado para recebimento na competência atual.

Fórmula: soma de valor_mensalidade de todos os alunos com registros de pagamento na competência.

### Receita Recebida

Valor efetivamente aprovado (status = "Pago") na competência.

### Inadimplência

```
Receita Prevista - Receita Recebida
```

---

## 14.2 Histórico Financeiro

Todo aluno possui histórico permanente por competência.

Nunca existe sobrescrita de dados financeiros.

Mudanças futuras de mensalidade não alteram competências anteriores.

---

# 15. Pagamentos

## 15.1 Formas de Pagamento

### Cartão

- Sem comprovante (automático)
- Marcado como "Pago" ao registrar

### PIX

- Comprovante obrigatório
- Status inicial: "Pendente de Validação"
- Requer validação humana

### Boleto

- Comprovante obrigatório
- Status inicial: "Pendente de Validação"
- Requer validação humana

---

## 15.2 Pagamento Parcial

**Alunos: NÃO permitido.**

A mensalidade é considerada paga ou não paga. Sem estados intermediários.

**Professores: PERMITIDO.**

O pagamento aos professores pode ser parcial, registrado como "Parcial" com o valor pago e o saldo restante.

---

## 15.3 Competência

Cada pagamento pertence obrigatoriamente a uma competência (mês/ano).

O sistema utiliza essa informação para cálculo de receita, inadimplência, histórico e dashboards.

---

# 16. Comprovantes

## 16.1 Obrigatoriedade

Todo pagamento via PIX ou Boleto exige comprovante.

Sem comprovante: não é permitido concluir o registro.

## 16.2 Formatos Aceitos

- PDF
- JPG / JPEG
- PNG

Qualquer outro formato deve ser rejeitado.

## 16.3 Armazenamento

Supabase Storage.

Estrutura: `comprovantes/{payment_id}/{hash_sha256}.{ext}`

## 16.4 Download

Independentemente do formato original, o download deve ser disponibilizado em PDF.

Imagens PNG/JPG são convertidas para PDF no servidor antes de disponibilizar para download.

## 16.5 Antifraude — Hash SHA256

Todo arquivo enviado gera um hash SHA256 calculado no cliente (Web Crypto API).

O sistema verifica duplicidade antes do upload:

**Se o hash já existir:**

- Upload bloqueado
- Mensagem contextual exibida: "Este comprovante já foi utilizado para [Nome do Aluno] na competência [mês/ano]."
- Tentativa registrada na auditoria

O feedback visual inclui:

1. Estado "Verificando" (loading 1-2 segundos simulando verificação)
2. Estado "Aprovado" (exibe hash truncado: SHA256: a3f2...9c1d)
3. Estado "Duplicata detectada" (erro contextual com nome do aluno e competência)

---

# 17. Fluxo de Validação Financeira

## 17.1 Fila de Validação

Tela dedicada (Validações) com fila de comprovantes pendentes.

Interface em dois painéis: lista de pendentes à esquerda, detalhe + ações à direita.

## 17.2 Aprovação

Ao aprovar:

- Pagamento → "Pago"
- Aluno → "Ativo"
- Métricas atualizadas
- Auditoria registrada

## 17.3 Rejeição

Ao rejeitar:

- Modal exigindo motivo (obrigatório, mínimo 20 caracteres)
- Após confirmar: pagamento permanece "Atrasado"
- Motivo registrado no pagamento e na auditoria
- Email automático enviado ao aluno via Brevo
- Aluno permanece em situação irregular

---

# 18. Cobrança e Inadimplência

## 18.1 Lembrete de Vencimento

Aplicável para PIX e Boleto.

No dia do vencimento: sistema envia e-mail automático.

## 18.2 Cobrança Pós-Vencimento

Após vencimento: sistema envia e-mail diariamente até pagamento ser aprovado.

## 18.3 Atraso

Mais de 5 dias úteis sem pagamento aprovado: aluno torna-se "Atrasado".

## 18.4 Risco de Inativação

Entre 20 e 30 dias de atraso: aluno entra em "Risco de inativação".

Alerta visual no dashboard e filtro dedicado na tela de alunos.

## 18.5 Inativação Automática

Mais de 30 dias sem regularização: aluno torna-se "Inativo".

---

# 19. Dashboard Principal

## 19.1 Filosofia

Dashboard-first. A tela inicial deve responder: "Como está minha escola agora?" sem exigir navegação adicional.

## 19.2 Dashboard — Administrador

### KPIs Operacionais (5 cards)

- Total de alunos
- Ativos
- Atrasados
- Pendentes de validação
- Inativos

### KPIs Financeiros (3 cards)

- Receita prevista do mês
- Receita recebida
- Inadimplência

### Gráficos

- Crescimento de alunos (linha, últimos 12 meses)
- Crescimento financeiro (barras, previsto vs recebido, últimos 12 meses)

### Widgets (listagens rápidas)

- Próximos vencimentos
- Pagamentos pendentes de validação
- Últimas validações
- **Alunos em risco de inativação** (entre 20-30 dias de atraso)

## 19.3 Dashboard — Secretário

### KPIs (4 cards)

- Total de alunos
- Ativos
- Atrasados
- Pendentes de validação

Sem KPIs financeiros globais (receita, inadimplência em valor).

### Widgets

- Pagamentos pendentes de validação
- Próximos vencimentos
- Validações recentes
- **Alunos em risco de inativação**

## 19.4 Dashboard — Professor

### KPIs (4 cards, apenas seus alunos)

- Total de alunos
- Ativos
- Pendência operacional (atrasados + pendentes — sem valor financeiro)
- Inativos

### Lista de alunos

Tabela simplificada dos seus alunos sem colunas financeiras.

---

# 20. Agenda de Aulas

## 20.1 Visão Geral

Módulo de agendamento e controle de aulas entre alunos e professores.

## 20.2 Acesso por Perfil

| Ação | Admin | Secretário | Professor |
|------|-------|-----------|-----------|
| Ver todas as aulas | ✅ | ✅ | ❌ |
| Ver suas aulas | ✅ | N/A | ✅ |
| Criar aula | ✅ | ✅ | ❌ |
| Cancelar aula | ✅ | ✅ | ❌ |
| Marcar como realizada | ✅ | ✅ | ❌ |

## 20.3 Regra de Agendamento

Alunos com status "Inativo" não podem ter novas aulas agendadas.

Ao tentar selecionar aluno inativo: sistema exibe aviso e bloqueia confirmação.

## 20.4 Distribuição de Carga

Tela de professores exibe ranking de carga de alunos e aulas para equilibrar a distribuição.

---

# 21. Financeiro de Professores

## 21.1 Visão Geral

Módulo de pagamento mensal aos professores baseado nas aulas realizadas.

## 21.2 Cálculo

```
Valor Devido = Horas realizadas no mês × Valor hora/aula
```

Aulas canceladas não são contabilizadas.

## 21.3 Status de Pagamento ao Professor

- Pendente
- Parcial (pagamento parcial permitido)
- Pago

## 21.4 Acesso

Apenas Administrador e Secretário.

---

# 22. KPIs

## 22.1 Alunos

- Total de alunos
- Ativos
- Atrasados
- Pendentes de Validação
- Inativos
- **Em Risco de Inativação** (20-30 dias de atraso)

## 22.2 Financeiro (Administrador)

- Receita prevista
- Receita recebida
- Receita pendente
- Inadimplência (valor e percentual)

## 22.3 Operação

- Comprovantes aguardando validação
- Vencimentos próximos (próximos 10 dias)
- Alunos atrasados
- Alunos próximos da inativação

---

# 23. Relatórios

## Filosofia

A V1 prioriza dashboards, filtros e exportações.

Toda exportação respeita os filtros ativos.

## Relatórios Disponíveis

| Relatório | Admin | Secretário |
|-----------|-------|-----------|
| Base de alunos | ✅ | ✅ (sem campos financeiros globais) |
| Lançamentos financeiros | ✅ | ✅ |
| Inadimplência | ✅ | ✅ |
| Professores (alunos vinculados) | ✅ | ✅ |
| Trilha de auditoria | ✅ | ❌ |

Formatos: XLSX, CSV.

Toda exportação gera registro de auditoria.

---

# 24. Auditoria Forense

## 24.1 Acesso

**Exclusivo do Administrador.**

O Secretário não tem acesso ao módulo de auditoria.

## 24.2 Objetivo

Garantir rastreabilidade completa de todas as ações realizadas dentro da plataforma.

## 24.3 Eventos Auditados

### Autenticação

- login, logout, falha de login
- redefinição de senha, troca de senha, recuperação de senha

### Usuários

- criação, edição, inativação, reativação, reset de senha

### Alunos

- criação, edição (campos alterados com antes/depois), inativação, reativação

### Financeiro

- criação de pagamento
- upload de comprovante (incluindo tentativa de hash duplicado)
- aprovação, rejeição (com motivo)
- download de comprovante

### Agenda

- criação, cancelamento de aula

### Exportações

- tipo, filtros aplicados, total de registros, formato, usuário

### Professores

- criação, edição, inativação, reativação

## 24.4 Imutabilidade

A auditoria não pode ser editada, removida ou sobrescrita.

O histórico deve permanecer preservado permanentemente.

## 24.5 Filtros da Tela de Auditoria

- Usuário
- Perfil
- Ação
- Entidade
- Período (hoje / 7 dias / 30 dias / todo o período)
- Busca livre (ação, usuário, alvo)
- IP

---

# 25. Riscos Operacionais e Antifraude

## 25.1 Reutilização de Comprovantes

Mitigação: hash SHA256 verificado antes do upload.

Resultado: upload bloqueado com mensagem contextual.

Auditoria registra tentativa.

## 25.2 Aprovação Indevida

Toda aprovação registra: usuário, data, hora, IP, dispositivo.

## 25.3 Exclusão Indevida

A plataforma não utiliza exclusão física. Toda entidade trabalha com ativo/inativo.

## 25.4 Alteração Indevida de Histórico

Pagamentos aprovados não podem ser sobrescritos.

Rejeições registram motivo permanentemente.

---

# 26. Segurança

## 26.1 HTTPS

A plataforma opera exclusivamente em HTTPS.

## 26.2 Senhas

- Mínimo 8 caracteres
- 1 letra maiúscula, 1 minúscula, 1 número
- Hash seguro no banco (Supabase Auth — bcrypt)

## 26.3 Sessões

- Cookies HttpOnly + Secure
- Expiração automática
- Refresh token transparente

## 26.4 Controle de Permissões

Validação em dois níveis obrigatórios:

1. Middleware Next.js (UX / experiência)
2. RLS Supabase (segurança real — nenhuma rota depende apenas do frontend)

## 26.5 Bloqueio de Tentativas

Delegado ao Supabase Auth. Não implementado como feature customizada na V1.

---

# 27. Infraestrutura

## 27.1 Frontend

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS

## 27.2 Backend

- Supabase (banco + auth + storage)

## 27.3 Email

- Brevo SMTP (primário)
- Gmail SMTP (fallback)

## 27.4 Deploy

- Vercel (frontend)
- Supabase (banco e storage)

## 27.5 Backup

Semanal (Supabase backup automático).

## 27.6 Responsividade

Desktop First. Mobile-friendly obrigatório.

---

# 28. Módulos Fora do Escopo V1

| Módulo | Versão prevista |
|--------|----------------|
| Integração bancária | V2 |
| Emissão automática de boletos | V2 |
| OCR de comprovantes | V2 |
| WhatsApp automático | V2 |
| CRM comercial | Fora do roadmap |
| Aplicativo mobile nativo | Fora do roadmap |
| Analytics avançado | V3 |
| Detecção de fraude via IA | V3 |
| Multiempresa | Fora do roadmap |

---

# 29. Roadmap

## V2

- OCR de comprovantes (leitura automática de valor, data, banco)
- Notificações avançadas (WhatsApp)
- Automações operacionais via n8n
- Conciliação financeira básica

## V3

- Analytics avançado
- Detecção de fraude baseada em IA
- Dashboards executivos avançados
- Insights financeiros preditivos

---

# 30. Idioma e Naming

Toda interface utiliza Português do Brasil.

Nomenclatura preferencial:

- alunos, professores, pagamentos, comprovantes, auditoria, inadimplência

Evitar termos técnicos para usuários finais.

---

# 31. Glossário

| Termo | Definição |
|-------|-----------|
| Aluno | Pessoa matriculada na escola |
| Professor | Responsável pelo acompanhamento dos alunos |
| Secretário | Usuário responsável pela operação administrativa |
| Administrador | Usuário com acesso total à plataforma |
| Competência | Mês de referência de uma mensalidade (ex: Junho/2026) |
| Comprovante | Documento que valida um pagamento |
| Receita Prevista | Valor esperado para recebimento |
| Receita Recebida | Valor efetivamente aprovado |
| Inadimplência | Diferença entre receita prevista e recebida |
| Auditoria | Registro permanente das ações no sistema |
| Soft Delete | Inativação sem exclusão física (ativo/inativo) |
| Risco de Inativação | Aluno com >20 dias de atraso, próximo da inativação automática |
| Hash SHA256 | Impressão digital do arquivo de comprovante para detectar duplicatas |
| Competência | Mês/ano de referência do pagamento |
