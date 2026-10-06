import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import AgendaClient, {
  type EventoRow,
  type AlunoOpcao,
  type ProfessorOpcao,
} from "@/components/agenda/AgendaClient";

/**
 * F3B.1 — Página de Agenda
 *
 * Server Component com queries paralelas.
 * Proteção de rota via proxy.ts.
 *
 * Admin/Secretário: todos os eventos do período + lista de professores/alunos.
 * Professor: somente seus próprios eventos (filtrado por teacher_id).
 */

export default async function AgendaPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  // ── 1. Usuário e perfil ───────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let perfil = "Secretário";
  if (user) {
    const { data: profile } = await supabase
      .from("users_profile")
      .select("perfil")
      .eq("id", user.id)
      .single();
    perfil = profile?.perfil ?? "Secretário";
  }

  const isProf = perfil === "Professor";

  // ── 2. teacher_id (somente Professor) ────────────────────────────────────
  let currentTeacherId: string | null = null;
  if (isProf && user) {
    const { data: teacherRow } = await admin
      .from("teachers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    currentTeacherId = (teacherRow?.id as string | null) ?? null;
  }

  // ── 3. Range do mês atual ─────────────────────────────────────────────────
  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // ── 4. Queries paralelas ──────────────────────────────────────────────────
  const [eventosResult, professoresResult, alunosResult] = await Promise.all([
    // Eventos do mês
    isProf && currentTeacherId
      ? admin
          .from("agenda")
          .select(
            "id, student_id, teacher_id, start_at, duracao_min, observacoes, status, students!inner(nome, status)"
          )
          .eq("teacher_id", currentTeacherId)
          .gte("start_at", rangeStart)
          .lte("start_at", rangeEnd)
          .order("start_at")
      : admin
          .from("agenda")
          .select(
            "id, student_id, teacher_id, start_at, duracao_min, observacoes, status, students!inner(nome, status), teachers!inner(nome)"
          )
          .gte("start_at", rangeStart)
          .lte("start_at", rangeEnd)
          .order("start_at"),

    // Professores ativos (para o select do modal)
    admin.from("teachers").select("id, nome").eq("status", "Ativo").order("nome"),

    // Alunos ativos/atrasados (para busca no modal)
    !isProf
      ? admin
          .from("students")
          .select("id, nome, status, valor_mensalidade")
          .in("status", ["Ativo", "Atrasado"])
          .order("nome")
      : Promise.resolve({ data: [], error: null }),
  ]);

  // ── 5. Transformar eventos ────────────────────────────────────────────────
  const rawEventos = eventosResult.data ?? [];

  if (eventosResult.error) {
    console.error("[AgendaPage] Erro ao buscar eventos:", eventosResult.error.message);
  }

  const eventos: EventoRow[] = rawEventos.map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any;
    return {
      id: r.id as string,
      student_id: r.student_id as string,
      teacher_id: r.teacher_id as string,
      start_at: r.start_at as string,
      duracao_min: r.duracao_min as number,
      observacoes: r.observacoes as string | null,
      status: r.status as string,
      aluno_nome: (r.students?.nome ?? "") as string,
      aluno_status: (r.students?.status ?? "Ativo") as string,
      professor_nome: isProf ? null : ((r.teachers?.nome ?? null) as string | null),
    };
  });

  // ── 6. Professores ────────────────────────────────────────────────────────
  const professores: ProfessorOpcao[] = (professoresResult.data ?? []).map((t) => ({
    id: t.id as string,
    nome: t.nome as string,
  }));

  // ── 7. Alunos (Admin/Secretário) ──────────────────────────────────────────
  const alunos: AlunoOpcao[] = (alunosResult.data ?? []).map((s) => ({
    id: s.id as string,
    nome: s.nome as string,
    status: s.status as string,
    valor_mensalidade: s.valor_mensalidade as number | null,
  }));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AgendaClient
      eventos={eventos}
      alunos={alunos}
      professores={professores}
      currentUserPerfil={perfil}
      currentTeacherId={currentTeacherId}
    />
  );
}
