import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import SecretariaDashboard from "@/components/dashboard/SecretariaDashboard";
import ProfessorDashboard from "@/components/dashboard/ProfessorDashboard";
import type {
  KpiCounts,
  FinanceMonth,
  SerieAluno,
  SerieFinanceiro,
  ProximoVencimento,
  PagamentoPendente,
  AuditLogEntry,
  AcessoVencendo,
  ProfessorAluno,
} from "@/components/dashboard/types";

/**
 * Calcula a próxima data de cobrança a partir do dia de vencimento (1-31).
 * Regra: se o dia deste mês ainda não passou, usa este mês; senão, o mês
 * seguinte. Dias > último dia do mês (ex: 31 em fevereiro) são ajustados
 * para o último dia real do mês (sem rollover para o mês seguinte).
 */
function proximaCobranca(diaVencimento: number, referencia: Date): string {
  const ano = referencia.getFullYear();
  const mes = referencia.getMonth();
  const diaHoje = referencia.getDate();

  const clamp = (a: number, m: number) => {
    const ultimoDia = new Date(a, m + 1, 0).getDate();
    return Math.min(diaVencimento, ultimoDia);
  };

  let anoAlvo = ano;
  let mesAlvo = mes;
  if (diaVencimento < diaHoje) {
    mesAlvo += 1;
    if (mesAlvo > 11) {
      mesAlvo = 0;
      anoAlvo += 1;
    }
  }
  const diaAlvo = clamp(anoAlvo, mesAlvo);
  const mm = String(mesAlvo + 1).padStart(2, "0");
  const dd = String(diaAlvo).padStart(2, "0");
  return `${anoAlvo}-${mm}-${dd}`;
}

/**
 * Dashboard Page — Server Component.
 *
 * Responsabilidades:
 * - Lê o perfil do usuário logado via Supabase (tabela `users`).
 * - Executa queries paralelas via Promise.all conforme o perfil.
 * - Admin e Secretário: queries operacionais + widgets.
 *   Admin também executa queries financeiras; Secretário NÃO.
 * - Professor: apenas seus alunos via student_teachers.
 * - Passa dados puros como props para os Client Components.
 *
 * Nenhum dado financeiro é enviado para Secretário ou Professor.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  /* ---- Sessão e perfil ---- */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: userRow } = await supabase
    .from("users_profile")
    .select("nome, perfil")
    .eq("id", user.id)
    .single();

  const perfil: string = userRow?.perfil ?? "Professor";
  const nomeUsuario: string = userRow?.nome ?? user.email ?? "Usuário";

  /* ================================================================
     PROFESSOR — apenas alunos vinculados
  ================================================================ */
  if (perfil === "Professor") {
    // Busca o teacher_id a partir do user_id
    const { data: teacherRow } = await supabase
      .from("teachers")
      .select("id")
      .eq("user_id", user.id)
      .single();

    let alunos: ProfessorAluno[] = [];

    if (teacherRow?.id) {
      const { data: alunosData } = await supabase
        .from("students")
        .select(
          `
          id,
          nome,
          email,
          nivel_ingles,
          plano,
          carga_horaria,
          data_entrada,
          status,
          student_teachers!inner(teacher_id)
        `
        )
        .eq("student_teachers.teacher_id", teacherRow.id)
        .order("nome");

      if (alunosData) {
        alunos = alunosData.map((a) => ({
          id: a.id as string,
          nome: a.nome as string,
          email: (a.email ?? "") as string,
          nivel_ingles: (a.nivel_ingles ?? "—") as string,
          plano: (a.plano ?? "—") as string,
          carga_horaria: (a.carga_horaria ?? "—") as string,
          data_entrada: (a.data_entrada ?? "") as string,
          status: (a.status ?? "Inativo") as string,
        }));
      }
    }

    return <ProfessorDashboard nomeProf={nomeUsuario} alunos={alunos} />;
  }

  /* ================================================================
     ADMIN / SECRETÁRIO — queries operacionais paralelas
  ================================================================ */

  // Queries comuns a Admin e Secretário
  const [
    kpisResult,
    pendentesResult,
    pendentesCountResult,
    vencimentosResult,
    validacoesResult,
    acessosVencendoResult,
  ] = await Promise.all([
    /* KPIs operacionais */
    supabase
      .from("students")
      .select("status"),

    /* Pagamentos pendentes de validação — últimos 6 para o widget */
    supabase
      .from("payments")
      .select(
        `
        id,
        competencia,
        forma_pagamento,
        students!inner(nome)
      `
      )
      .eq("status", "Pendente de Validação")
      .order("criado_em", { ascending: false })
      .limit(6),

    /* COUNT exato de pendentes para o KPI card */
    supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("status", "Pendente de Validação"),

    /* Próximos vencimentos — quem cobrar: alunos Ativos, plano Recorrente,
       ordenados pela proximidade do dia de cobrança (calculado em JS abaixo,
       não vem de payments — essa tabela só tem linha após pagamento registrado) */
    supabase
      .from("students")
      .select("id, nome, valor_mensalidade, dia_vencimento")
      .eq("status", "Ativo")
      .eq("plano", "Recorrente")
      .not("dia_vencimento", "is", null),

    /* Últimas validações (audit_logs) — últimos 6 */
    supabase
      .from("audit_logs")
      .select("id, acao, entidade_id, usuario_id, criado_em")
      .or("acao.ilike.%aprovado%,acao.ilike.%rejeitado%")
      .order("criado_em", { ascending: false })
      .limit(6),

    /* Vencimento de acessos — alunos Ativos cujo acesso no CRM externo
       (crm_access.removido_em) está mais próximo de ser revogado */
    supabase
      .from("crm_access")
      .select("student_id, removido_em, students!inner(nome, status)")
      .not("removido_em", "is", null)
      .eq("students.status", "Ativo")
      .order("removido_em", { ascending: true })
      .limit(6),
  ]);

  /* ---- Montar KpiCounts a partir dos resultados de students ---- */
  const statusRows = kpisResult.data ?? [];
  const kpis: KpiCounts = {
    total: statusRows.length,
    ativos: statusRows.filter((r) => r.status === "Ativo").length,
    atrasados: statusRows.filter((r) => r.status === "Atrasado").length,
    inativos: statusRows.filter((r) => r.status === "Inativo").length,
    pendentes: pendentesCountResult.count ?? 0,
  };

  /* ---- Pagamentos pendentes ---- */
  const pagamentosPendentes: PagamentoPendente[] = (
    pendentesResult.data ?? []
  ).map((p) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const student = p.students as any;
    return {
      id: p.id as string,
      nome: student?.nome ?? "—",
      competencia: (p.competencia as string) ?? "—",
      forma_pagamento: (p.forma_pagamento as string | null) ?? null,
    };
  });

  /* ---- Próximos vencimentos (Recorrente, calculado a partir de dia_vencimento) ---- */
  const agora = new Date();
  const proximosVencimentos: ProximoVencimento[] = (vencimentosResult.data ?? [])
    .map((s) => ({
      id: s.id as string,
      nome: s.nome as string,
      vencimento: proximaCobranca(s.dia_vencimento as number, agora),
      valor: (s.valor_mensalidade as number) ?? 0,
      forma_pagamento: null,
    }))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .slice(0, 6);

  /* ---- Últimas validações — enriquecer com nome do usuário ---- */
  const validacoesRaw = validacoesResult.data ?? [];
  const validacoesUserIds = [
    ...new Set(
      validacoesRaw
        .map((l) => l.usuario_id as string | null)
        .filter((id): id is string => id !== null)
    ),
  ];

  // Busca nomes em users_profile (FK uuid para auth.users — mesmos IDs)
  const userNomeMap: Record<string, string> = {};
  if (validacoesUserIds.length > 0) {
    const { data: userProfiles } = await supabase
      .from("users_profile")
      .select("id, nome")
      .in("id", validacoesUserIds);

    for (const up of userProfiles ?? []) {
      if (up.id && up.nome) {
        userNomeMap[up.id as string] = up.nome as string;
      }
    }
  }

  const ultimasValidacoes: AuditLogEntry[] = validacoesRaw.map((l) => ({
    id: l.id as string,
    acao: l.acao as string,
    alvo: (l.entidade_id as string | null) ?? null,
    usuario_nome: (l.usuario_id ? userNomeMap[l.usuario_id as string] : null) ?? "Sistema",
    criado_em: l.criado_em as string,
  }));

  /* ---- Vencimento de acessos (crm_access, alunos Ativos) ---- */
  const acessosVencendo: AcessoVencendo[] = (acessosVencendoResult.data ?? []).map(
    (r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const student = r.students as any;
      return {
        id: r.student_id as string,
        nome: student?.nome ?? "—",
        removido_em: r.removido_em as string,
      };
    }
  );

  /* ================================================================
     SECRETÁRIO — retorna sem dados financeiros
  ================================================================ */
  if (perfil === "Secretário") {
    return (
      <SecretariaDashboard
        kpis={kpis}
        proximosVencimentos={proximosVencimentos}
        pagamentosPendentes={pagamentosPendentes}
        ultimasValidacoes={ultimasValidacoes}
        acessosVencendo={acessosVencendo}
      />
    );
  }

  /* ================================================================
     ADMIN — executa queries financeiras adicionais
  ================================================================ */

  const [serieAlunosResult, serieFinanceiroResult, financeAtualResult] =
    await Promise.all([
      /* Série histórica de alunos — últimos 12 meses */
      supabase.rpc("dashboard_serie_alunos"),

      /* Série financeira — últimos 12 meses */
      supabase.rpc("dashboard_serie_financeiro"),

      /* Financeiro do mês atual */
      supabase.rpc("dashboard_finance_mes"),
    ]);

  /* ---- Série histórica de alunos ---- */
  // Esperado: [{ mes: "2026-05", total: 42 }, ...]
  const serieAlunos: SerieAluno[] = (() => {
    const rows = serieAlunosResult.data ?? [];
    if (rows.length === 0) return [];
    return (rows as Array<{ mes: string; total: number }>)
      .reverse()
      .map((r) => ({
        label: new Date(r.mes + "-01").toLocaleDateString("pt-BR", {
          month: "short",
        }),
        value: r.total,
      }));
  })();

  /* ---- Série financeira ---- */
  // Esperado: [{ mes: "2026-05", prevista: 5000, recebida: 3200 }, ...]
  const serieFinanceiro: SerieFinanceiro[] = (() => {
    const rows = serieFinanceiroResult.data ?? [];
    if (rows.length === 0) return [];
    return (
      rows as Array<{ mes: string; prevista: number; recebida: number }>
    )
      .reverse()
      .map((r) => ({
        label: new Date(r.mes + "-01").toLocaleDateString("pt-BR", {
          month: "short",
        }),
        prevista: r.prevista ?? 0,
        recebida: r.recebida ?? 0,
      }));
  })();

  /* ---- Financeiro do mês atual ---- */
  // Esperado: { receita_prevista: 5000, receita_recebida: 3200, inadimplencia: 800 }
  const financeData = financeAtualResult.data as {
    receita_prevista: number;
    receita_recebida: number;
    inadimplencia: number;
  } | null;

  const finance: FinanceMonth = {
    receitaPrevista: financeData?.receita_prevista ?? 0,
    receitaRecebida: financeData?.receita_recebida ?? 0,
    inadimplencia: financeData?.inadimplencia ?? 0,
  };

  return (
    <AdminDashboard
      kpis={kpis}
      finance={finance}
      serieAlunos={serieAlunos}
      serieFinanceiro={serieFinanceiro}
      proximosVencimentos={proximosVencimentos}
      pagamentosPendentes={pagamentosPendentes}
      ultimasValidacoes={ultimasValidacoes}
      acessosVencendo={acessosVencendo}
    />
  );
}
