import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import AlunosClient, {
  type AlunoRow,
  type ProfessorOpcao,
  type AgendaItem,
  type PagamentoItem,
} from "@/components/alunos/AlunosClient";

/**
 * F3A.1 — Listagem de Alunos
 *
 * Server Component.
 * Executa queries paralelas para contornar a limitação do Supabase JS
 * com GROUP BY (mesma estratégia do módulo professores).
 *
 * A página é acessível apenas por Admin e Secretário — proteção via proxy.ts.
 * Usa admin client para bypass de RLS.
 */

interface AlunosPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AlunosPage({ searchParams }: AlunosPageProps) {
  const params = await searchParams;
  const statusParam = typeof params.status === "string" ? params.status : undefined;
  const alunoParam = typeof params.aluno === "string" ? params.aluno : undefined;

  const admin = createAdminClient();

  // Perfil do usuário logado — para passar ao Client Component
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentUserPerfil = "Secretário";
  if (user) {
    const { data: profile } = await supabase
      .from("users_profile")
      .select("perfil")
      .eq("id", user.id)
      .single();
    currentUserPerfil = profile?.perfil ?? "Secretário";
  }

  // ── 1. Buscar todos os alunos ─────────────────────────────────────────────
  const { data: students, error: studentsError } = await admin
    .from("students")
    .select(
      "id, nome, telefone, email, plano, nivel_ingles, valor_mensalidade, dia_vencimento, data_entrada, carga_horaria, observacoes, status, motivo_inativacao, status_atrasado_desde, criado_em"
    )
    .order("nome");

  if (studentsError) {
    console.error("[AlunosPage] Erro ao buscar alunos:", studentsError.message);
    return (
      <div style={{ padding: 32, color: "var(--red-text)" }}>
        Erro ao carregar alunos. Tente recarregar a página.
      </div>
    );
  }

  const studentIds = (students ?? []).map((s) => s.id as string);

  // ── 2. Buscar vínculos student_teachers ───────────────────────────────────
  const { data: vinculosRaw } = await admin
    .from("student_teachers")
    .select("student_id, teacher_id")
    .in("student_id", studentIds.length > 0 ? studentIds : ["__none__"]);

  // ── 3. Buscar professores (nome + id) para montar nomes e picker ──────────
  const { data: teachersRaw } = await admin
    .from("teachers")
    .select("id, nome, status")
    .order("nome");

  const teacherMap: Record<string, string> = {};
  for (const t of teachersRaw ?? []) {
    teacherMap[t.id as string] = t.nome as string;
  }

  const professores: ProfessorOpcao[] = (teachersRaw ?? [])
    .filter((t) => t.status === "Ativo")
    .map((t) => ({ id: t.id as string, nome: t.nome as string }));

  // ── 4. Montar mapa de vínculos ────────────────────────────────────────────
  const profIdsByAluno: Record<string, string[]> = {};
  const profNomesByAluno: Record<string, string[]> = {};

  for (const v of vinculosRaw ?? []) {
    const sid = v.student_id as string;
    const tid = v.teacher_id as string;
    if (!profIdsByAluno[sid]) {
      profIdsByAluno[sid] = [];
      profNomesByAluno[sid] = [];
    }
    profIdsByAluno[sid].push(tid);
    profNomesByAluno[sid].push(teacherMap[tid] ?? tid);
  }

  // ── 4.5. Buscar vencimento de acesso (crm_access) por aluno ────────────────
  const { data: crmAccessRaw } = await admin
    .from("crm_access")
    .select("student_id, removido_em")
    .in("student_id", studentIds.length > 0 ? studentIds : ["__none__"])
    .not("removido_em", "is", null)
    .not("student_id", "is", null);

  // Se houver mais de um vínculo por aluno, mantém o vencimento mais próximo
  const acessoRemovidoEmPorAluno: Record<string, string> = {};
  for (const c of crmAccessRaw ?? []) {
    const sid = c.student_id as string;
    const removidoEm = c.removido_em as string;
    if (!acessoRemovidoEmPorAluno[sid] || removidoEm < acessoRemovidoEmPorAluno[sid]) {
      acessoRemovidoEmPorAluno[sid] = removidoEm;
    }
  }

  // ── 5. Montar AlunoRow[] ──────────────────────────────────────────────────
  const alunos: AlunoRow[] = (students ?? []).map((s) => ({
    id: s.id as string,
    nome: s.nome as string,
    telefone: s.telefone as string,
    email: s.email as string | null,
    plano: s.plano as string | null,
    nivel_ingles: s.nivel_ingles as string | null,
    valor_mensalidade: s.valor_mensalidade as number | null,
    dia_vencimento: s.dia_vencimento as number | null,
    data_entrada: s.data_entrada as string | null,
    carga_horaria: s.carga_horaria as string | null,
    observacoes: s.observacoes as string | null,
    status: s.status as string,
    motivo_inativacao: s.motivo_inativacao as string | null,
    status_atrasado_desde: s.status_atrasado_desde as string | null,
    criado_em: s.criado_em as string,
    professor_ids: profIdsByAluno[s.id as string] ?? [],
    professores_nomes: profNomesByAluno[s.id as string] ?? [],
    acesso_removido_em: acessoRemovidoEmPorAluno[s.id as string] ?? null,
  }));

  // ── 6. Agenda (próximas 3 aulas por aluno) — para modal de detalhe ────────
  const agendaPorAluno: Record<string, AgendaItem[]> = {};

  if (studentIds.length > 0) {
    const now = new Date().toISOString();
    const { data: agendaRaw } = await admin
      .from("agenda")
      .select("id, student_id, teacher_id, start_at, status")
      .in("student_id", studentIds)
      .gte("start_at", now)
      .neq("status", "Cancelada")
      .order("start_at");

    for (const a of agendaRaw ?? []) {
      const sid = a.student_id as string;
      if (!agendaPorAluno[sid]) agendaPorAluno[sid] = [];
      if (agendaPorAluno[sid].length < 3) {
        agendaPorAluno[sid].push({
          id: a.id as string,
          start_at: a.start_at as string,
          status: a.status as string,
          teacher_nome: a.teacher_id ? (teacherMap[a.teacher_id as string] ?? null) : null,
        });
      }
    }
  }

  // ── 7. Pagamentos (últimos 4 por aluno) — para modal de detalhe ───────────
  const pagamentosPorAluno: Record<string, PagamentoItem[]> = {};

  if (studentIds.length > 0) {
    const { data: pagsRaw } = await admin
      .from("payments")
      .select("id, student_id, competencia, valor, data_pagamento, status, forma_pagamento")
      .in("student_id", studentIds)
      .order("competencia", { ascending: false });

    for (const p of pagsRaw ?? []) {
      const sid = p.student_id as string;
      if (!pagamentosPorAluno[sid]) pagamentosPorAluno[sid] = [];
      if (pagamentosPorAluno[sid].length < 4) {
        pagamentosPorAluno[sid].push({
          id: p.id as string,
          competencia: p.competencia as string,
          valor: p.valor as number | null,
          data_pagamento: p.data_pagamento as string | null,
          status: p.status as string,
          forma_pagamento: p.forma_pagamento as string | null,
        });
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  // Determinar filtro inicial a partir do query param ?status=
  // Se vier "Risco" do Dashboard, ativar chip Risco automaticamente
  const initialFilter = statusParam ?? "todos";

  return (
    <AlunosClient
      alunos={alunos}
      professores={professores}
      currentUserPerfil={currentUserPerfil}
      initialFilter={initialFilter}
      initialAlunoId={alunoParam}
      agendaPorAluno={agendaPorAluno}
      pagamentosPorAluno={pagamentosPorAluno}
    />
  );
}
