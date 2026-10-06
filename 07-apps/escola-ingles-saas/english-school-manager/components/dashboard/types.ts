/**
 * Tipos compartilhados entre os componentes do Dashboard.
 * Refletem exatamente as shapes retornadas pelas queries do servidor.
 */

export interface KpiCounts {
  total: number;
  ativos: number;
  atrasados: number;
  inativos: number;
  pendentes: number;
}

export interface FinanceMonth {
  receitaPrevista: number;
  receitaRecebida: number;
  inadimplencia: number;
}

export interface SerieAluno {
  label: string; // "Jan", "Fev" ...
  value: number;
}

export interface SerieFinanceiro {
  label: string;
  prevista: number;
  recebida: number;
}

/**
 * Calculado a partir de students.dia_vencimento (não de payments — a tabela
 * payments só ganha linhas quando um pagamento é de fato registrado).
 * Só entram alunos Ativos com plano='Recorrente'. Ordenado pela próxima
 * data de cobrança (rolling: mês atual se o dia ainda não passou, senão
 * o mês seguinte).
 */
export interface ProximoVencimento {
  id: string;
  nome: string;       // student.nome
  vencimento: string; // próxima data de cobrança calculada (YYYY-MM-DD)
  valor: number;       // students.valor_mensalidade
  forma_pagamento: string | null; // não disponível em students — sempre null
}

export interface PagamentoPendente {
  id: string;
  nome: string;       // student.nome via join
  competencia: string;
  forma_pagamento: string | null;
}

export interface AuditLogEntry {
  id: string;
  acao: string;
  alvo: string | null;   // entidade_id or referência human-readable
  usuario_nome: string;  // joined from users
  criado_em: string;
}

/**
 * Widget "Vencimento de acessos" — alunos Ativos cujo acesso no CRM externo
 * (tabela crm_access, vinculada via student_id) está mais próximo de ser
 * revogado. Não tem relação com status_atrasado_desde/pagamento.
 */
export interface AcessoVencendo {
  id: string;         // crm_access.student_id — usado para navegar até /alunos?aluno=<id>
  nome: string;        // student.nome via join
  removido_em: string; // crm_access.removido_em (ISO timestamp)
}

/** Aluno para a tabela do Professor — sem colunas financeiras */
export interface ProfessorAluno {
  id: string;
  nome: string;
  email: string;
  nivel_ingles: string;
  plano: string;
  carga_horaria: string;
  data_entrada: string;
  status: string;
}
