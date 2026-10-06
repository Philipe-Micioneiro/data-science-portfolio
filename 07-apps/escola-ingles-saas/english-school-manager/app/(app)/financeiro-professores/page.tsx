import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import FinanceiroProfClient, {
  type ProfPaymentRow,
} from "@/components/financeiro-professores/FinanceiroProfClient";

/**
 * F4B.1 — Página de Financeiro de Professores
 *
 * Server Component.
 * Admin e Secretário apenas (o proxy.ts já bloqueia Professor).
 *
 * Dados:
 * 1. teacher_payments do mês selecionado com JOIN teachers
 * 2. Aulas realizadas do mês (agenda WHERE status='Realizada')
 * Aulas agrupadas por teacher_id em memória (Supabase JS não suporta GROUP BY).
 */

interface SearchParams {
  mes?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

/** Retorna "YYYY-MM" do mês atual */
function mesAtual(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Converte "YYYY-MM" no primeiro e último instante do mês em ISO strings */
function rangeDoMes(mes: string): { inicio: string; fim: string } {
  const [ano, m] = mes.split("-").map(Number);
  const inicio = new Date(ano, m - 1, 1, 0, 0, 0, 0).toISOString();
  // Último instante do mês = primeiro instante do mês seguinte
  const fim = new Date(ano, m, 1, 0, 0, 0, 0).toISOString();
  return { inicio, fim };
}

export default async function FinanceiroProfessoresPage({ searchParams }: PageProps) {
  // ── Sessão + perfil ─────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Apenas para confirmar sessão válida — permissão já bloqueada pelo proxy.ts
    const { data: profile } = await supabase
      .from("users_profile")
      .select("perfil")
      .eq("id", user.id)
      .single();

    if (!profile || !["Administrador", "Secretário"].includes(profile.perfil)) {
      return (
        <div style={{ padding: 32, color: "var(--red-text)" }}>
          Acesso não autorizado.
        </div>
      );
    }
  }

  // ── Parâmetro de mês ───────────────────────────────────────────────────────
  const params = await searchParams;
  const mes = params.mes && /^\d{4}-\d{2}$/.test(params.mes) ? params.mes : mesAtual();

  const { inicio, fim } = rangeDoMes(mes);

  const admin = createAdminClient();

  // ── Queries paralelas ──────────────────────────────────────────────────────
  const [tpResult, agendaResult] = await Promise.all([
    // 1. teacher_payments do mês com dados do professor
    admin
      .from("teacher_payments")
      .select(
        `id, teacher_id, competencia, valor_devido, valor_pago, status,
         teachers!inner(nome, valor_hora, forma_pagamento)`
      )
      .eq("competencia", mes)
      .order("teachers(nome)", { ascending: true }),

    // 2. Aulas realizadas no range do mês
    admin
      .from("agenda")
      .select("teacher_id, duracao_min")
      .eq("status", "Realizada")
      .gte("start_at", inicio)
      .lt("start_at", fim),
  ]);

  if (tpResult.error) {
    console.error(
      "[FinanceiroProfessoresPage] Erro ao buscar teacher_payments:",
      tpResult.error.message
    );
    return (
      <div style={{ padding: 32, color: "var(--red-text)" }}>
        Erro ao carregar financeiro de professores. Tente recarregar a página.
      </div>
    );
  }

  // ── Agrupar aulas por teacher_id em memória ────────────────────────────────
  type AulaAgg = { aulas: number; total_min: number };
  const aulasPorProfessor = new Map<string, AulaAgg>();

  for (const aula of agendaResult.data ?? []) {
    const tid = aula.teacher_id as string;
    const atual = aulasPorProfessor.get(tid) ?? { aulas: 0, total_min: 0 };
    aulasPorProfessor.set(tid, {
      aulas: atual.aulas + 1,
      total_min: atual.total_min + (aula.duracao_min as number),
    });
  }

  // ── Montar ProfPaymentRow[] ───────────────────────────────────────────────
  const payments: ProfPaymentRow[] = (tpResult.data ?? []).map((tp) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = (tp as any).teachers as {
      nome: string;
      valor_hora: number | null;
      forma_pagamento: string | null;
    } | null;

    const tid = tp.teacher_id as string;
    const agg = aulasPorProfessor.get(tid) ?? { aulas: 0, total_min: 0 };

    return {
      id: tp.id as string,
      teacher_id: tid,
      professor: t?.nome ?? "—",
      valor_hora: t?.valor_hora != null ? Number(t.valor_hora) : null,
      forma_pagamento_prof: t?.forma_pagamento ?? null,
      aulas: agg.aulas,
      total_min: agg.total_min,
      valor_devido: Number(tp.valor_devido ?? 0),
      valor_pago: Number(tp.valor_pago ?? 0),
      status: tp.status as string,
      competencia: tp.competencia as string,
    };
  });

  return (
    <FinanceiroProfClient
      payments={payments}
      mes={mes}
    />
  );
}
