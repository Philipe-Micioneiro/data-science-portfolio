import { createAdminClient } from "@/lib/supabase/admin";
import ProfessoresClient, {
  type ProfessorRow,
  type AlunoVinculado,
  type TeacherPaymentKpi,
} from "./ProfessoresClient";

/**
 * F2C.1 — Listagem de Professores
 *
 * Server Component.
 * Executa as queries com JOIN conforme SPEC §8.1, usando o admin client para
 * bypass de RLS (garantido que a página só é acessada por Admin/Secretário —
 * proteção feita no proxy.ts / middleware route protection).
 */
export default async function ProfessoresPage() {
  const admin = createAdminClient();

  // ---------------------------------------------------------------------------
  // Query principal — SPEC §8.1
  //
  // SELECT t.*,
  //   COUNT(DISTINCT st.student_id) AS num_alunos,
  //   COUNT(DISTINCT CASE WHEN a.status != 'Cancelada' THEN a.id END) AS aulas_no_mes,
  //   COUNT(DISTINCT CASE WHEN a.status = 'Realizada' THEN a.id END) AS aulas_realizadas
  // FROM teachers t
  // LEFT JOIN student_teachers st ON st.teacher_id = t.id
  // LEFT JOIN agenda a ON a.teacher_id = t.id
  //   AND date_trunc('month', a.start_at) = date_trunc('month', now())
  // GROUP BY t.id
  // ORDER BY t.nome;
  //
  // O Supabase JS não suporta GROUP BY com agregações complexas via .select() encadeado,
  // portanto usamos rpc() com uma função SQL, ou decompomos em queries paralelas.
  // Optamos por queries paralelas para clareza e manutenibilidade.
  // ---------------------------------------------------------------------------

  const now = new Date();
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const mesFim = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // 1. Buscar todos os professores
  const { data: teachers, error: teachersError } = await admin
    .from("teachers")
    .select("id, nome, email, telefone, valor_hora, forma_pagamento, obs_financeiras, status, criado_em, user_id")
    .order("nome");

  if (teachersError) {
    console.error("[ProfessoresPage] Erro ao buscar teachers:", teachersError.message);
    return (
      <div style={{ padding: 32, color: "var(--red-text)" }}>
        Erro ao carregar professores. Tente recarregar a página.
      </div>
    );
  }

  const teacherIds = (teachers ?? []).map((t) => t.id as string);

  // 2. Contagem de alunos por professor (via student_teachers)
  const { data: studentTeachers } = await admin
    .from("student_teachers")
    .select("teacher_id, student_id")
    .in("teacher_id", teacherIds.length > 0 ? teacherIds : ["__none__"]);

  // 3. Aulas do mês corrente (não canceladas e realizadas) via agenda
  const { data: aulas } = await admin
    .from("agenda")
    .select("id, teacher_id, status")
    .in("teacher_id", teacherIds.length > 0 ? teacherIds : ["__none__"])
    .gte("start_at", mesInicio)
    .lte("start_at", mesFim);

  // Montar contagens por professor
  const numAlunosMap: Record<string, Set<string>> = {};
  const aulasNoMesMap: Record<string, Set<string>> = {};
  const aulasRealizadasMap: Record<string, Set<string>> = {};

  for (const st of studentTeachers ?? []) {
    const tid = st.teacher_id as string;
    const sid = st.student_id as string;
    if (!numAlunosMap[tid]) numAlunosMap[tid] = new Set();
    numAlunosMap[tid].add(sid);
  }

  for (const aula of aulas ?? []) {
    const tid = aula.teacher_id as string;
    const aid = aula.id as string;
    const status = aula.status as string;
    if (status !== "Cancelada") {
      if (!aulasNoMesMap[tid]) aulasNoMesMap[tid] = new Set();
      aulasNoMesMap[tid].add(aid);
    }
    if (status === "Realizada") {
      if (!aulasRealizadasMap[tid]) aulasRealizadasMap[tid] = new Set();
      aulasRealizadasMap[tid].add(aid);
    }
  }

  const professores: ProfessorRow[] = (teachers ?? []).map((t) => ({
    id: t.id as string,
    nome: t.nome as string,
    email: t.email as string,
    telefone: t.telefone as string | null,
    valor_hora: t.valor_hora as number | null,
    forma_pagamento: t.forma_pagamento as string | null,
    obs_financeiras: t.obs_financeiras as string | null,
    status: t.status as string,
    criado_em: t.criado_em as string,
    num_alunos: numAlunosMap[t.id as string]?.size ?? 0,
    aulas_no_mes: aulasNoMesMap[t.id as string]?.size ?? 0,
    aulas_realizadas: aulasRealizadasMap[t.id as string]?.size ?? 0,
  }));

  // ---------------------------------------------------------------------------
  // 4. Alunos vinculados a cada professor (para o modal de detalhe)
  //    SPEC §8.3: lista de alunos com mensalidade (Admin/Secretário apenas — garantido por RLS)
  // ---------------------------------------------------------------------------
  const alunosPorProfessor: Record<string, AlunoVinculado[]> = {};

  if (teacherIds.length > 0) {
    const { data: vinculosComAlunos } = await admin
      .from("student_teachers")
      .select(`
        teacher_id,
        students (
          id,
          nome,
          email,
          plano,
          nivel_ingles,
          valor_mensalidade,
          status
        )
      `)
      .in("teacher_id", teacherIds);

    for (const v of vinculosComAlunos ?? []) {
      const tid = v.teacher_id as string;
      // Supabase relational select retorna array de registros mesmo em relação N:1.
      // Usar `unknown` como pivot para cast seguro.
      const raw = v.students as unknown;
      const aluno = (Array.isArray(raw) ? raw[0] : raw) as {
        id: string;
        nome: string;
        email: string | null;
        plano: string | null;
        nivel_ingles: string | null;
        valor_mensalidade: number | null;
        status: string;
      } | null | undefined;

      if (!aluno || typeof aluno !== "object") continue;
      if (!alunosPorProfessor[tid]) alunosPorProfessor[tid] = [];
      alunosPorProfessor[tid].push({
        id: aluno.id,
        nome: aluno.nome,
        email: aluno.email,
        plano: aluno.plano,
        nivel_ingles: aluno.nivel_ingles,
        valor_mensalidade: aluno.valor_mensalidade,
        status: aluno.status,
      });
    }

    // Ordenar alunos por nome dentro de cada professor
    for (const tid of Object.keys(alunosPorProfessor)) {
      alunosPorProfessor[tid].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    }
  }

  // ---------------------------------------------------------------------------
  // 5. KPIs de pagamento de professores (teacher_payments) — mês atual
  //    SPEC §8.3: "KPI de pagamentos do professor: buscar teacher_payments WHERE teacher_id = $id"
  // ---------------------------------------------------------------------------
  const kpisPagamento: Record<string, TeacherPaymentKpi> = {};

  if (teacherIds.length > 0) {
    const mesAtualStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { data: teacherPayments } = await admin
      .from("teacher_payments")
      .select("teacher_id, valor_devido, valor_pago, status")
      .in("teacher_id", teacherIds)
      .eq("competencia", mesAtualStr);

    for (const tp of teacherPayments ?? []) {
      const tid = tp.teacher_id as string;
      kpisPagamento[tid] = {
        teacher_id: tid,
        valor_devido: tp.valor_devido as number | null,
        valor_pago: tp.valor_pago as number | null,
        status: tp.status as string | null,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <ProfessoresClient
      professores={professores}
      alunosPorProfessor={alunosPorProfessor}
      kpisPagamento={kpisPagamento}
    />
  );
}
