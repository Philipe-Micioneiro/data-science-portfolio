import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import FinanceiroClient, {
  type PagamentoRow,
  type KpisFinanceiro,
  type AlunoOpcao,
} from "@/components/financeiro/FinanceiroClient";

/**
 * F4A.1 — Página de Financeiro (Alunos)
 *
 * Server Component.
 * Admin: vê KPIs financeiros do mês + listagem completa.
 * Secretário: vê apenas listagem — KPIs não são calculados.
 * Professor: bloqueado pelo proxy.ts.
 */

export default async function FinanceiroPage() {
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

  const admin = createAdminClient();
  const isAdmin = currentUserPerfil === "Administrador";

  // ── 1. Buscar pagamentos com JOIN students + payment_receipts ─────────────
  const { data: pagsRaw, error: pagsError } = await admin
    .from("payments")
    .select(
      `id, student_id, competencia, competencia_date, valor_previsto, valor_pago,
       forma_pagamento, vencimento, status, motivo_rejeicao,
       aprovado_por, aprovado_em, criado_por, criado_em,
       students!inner(nome),
       payment_receipts(arquivo_url, hash_sha256)`
    )
    .order("competencia_date", { ascending: false })
    .order("criado_em", { ascending: false });

  if (pagsError) {
    console.error("[FinanceiroPage] Erro ao buscar pagamentos:", pagsError.message);
    return (
      <div style={{ padding: 32, color: "var(--red-text)" }}>
        Erro ao carregar lançamentos financeiros. Tente recarregar a página.
      </div>
    );
  }

  const pagamentos: PagamentoRow[] = (pagsRaw ?? []).map((p) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const st = (p as any).students as { nome: string } | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recs = (p as any).payment_receipts as Array<{ arquivo_url: string; hash_sha256: string }> | null;
    const rec = Array.isArray(recs) ? recs[0] : null;

    return {
      id: p.id as string,
      student_id: p.student_id as string,
      aluno_nome: st?.nome ?? "—",
      competencia: p.competencia as string,
      competencia_date: p.competencia_date as string,
      valor_previsto: p.valor_previsto as number | null,
      valor_pago: p.valor_pago as number | null,
      forma_pagamento: p.forma_pagamento as string | null,
      vencimento: p.vencimento as string | null,
      status: p.status as string,
      motivo_rejeicao: p.motivo_rejeicao as string | null,
      aprovado_por: p.aprovado_por as string | null,
      aprovado_em: p.aprovado_em as string | null,
      criado_por: p.criado_por as string | null,
      criado_em: p.criado_em as string,
      comprovante_url: rec?.arquivo_url ?? null,
      hash_sha256: rec?.hash_sha256 ?? null,
    };
  });

  // ── 2. KPIs financeiros — apenas Admin ────────────────────────────────────
  let kpis: KpisFinanceiro | null = null;

  if (isAdmin) {
    const { data: kpisRaw } = await admin.rpc("dashboard_finance_mes");

    if (kpisRaw && kpisRaw.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const k = kpisRaw[0] as any;
      kpis = {
        receita_prevista: Number(k.receita_prevista ?? 0),
        receita_recebida: Number(k.receita_recebida ?? 0),
        inadimplencia: Number(k.inadimplencia ?? 0),
      };
    } else {
      // Fallback: calcular client-side a partir dos dados já buscados (mês atual)
      const agora = new Date();
      const ano = agora.getFullYear();
      const mes = String(agora.getMonth() + 1).padStart(2, "0");
      const mesAtual = `${ano}-${mes}-01`;

      const pagsDoMes = pagamentos.filter(
        (p) => p.competencia_date === mesAtual
      );

      kpis = {
        receita_prevista: pagsDoMes.reduce(
          (acc, p) => acc + (p.valor_previsto ?? 0),
          0
        ),
        receita_recebida: pagsDoMes
          .filter((p) => p.status === "Pago")
          .reduce((acc, p) => acc + (p.valor_pago ?? p.valor_previsto ?? 0), 0),
        inadimplencia: pagsDoMes
          .filter((p) => p.status === "Atrasado")
          .reduce((acc, p) => acc + (p.valor_previsto ?? 0), 0),
      };
    }
  }

  // ── 3. Lista de alunos ativos/atrasados para modal RegistrarPagamento ──────
  const { data: alunosRaw } = await admin
    .from("students")
    .select("id, nome, plano, valor_mensalidade, dia_vencimento")
    .in("status", ["Ativo", "Atrasado"])
    .order("nome");

  const alunosOpcoes: AlunoOpcao[] = (alunosRaw ?? []).map((a) => ({
    id: a.id as string,
    nome: a.nome as string,
    plano: a.plano as string | null,
    valor_mensalidade: a.valor_mensalidade as number | null,
    dia_vencimento: a.dia_vencimento as number | null,
  }));

  return (
    <FinanceiroClient
      pagamentos={pagamentos}
      kpis={kpis}
      alunosOpcoes={alunosOpcoes}
      currentUserPerfil={currentUserPerfil}
    />
  );
}
