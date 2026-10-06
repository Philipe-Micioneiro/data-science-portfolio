import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email";

const DESTINATARIOS = (process.env.RESUMO_DESTINATARIOS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

/**
 * Cron: Resumo diário de cobrança.
 *
 * Envia, todo dia, um único email pra cada destinatário fixo (staff) listando
 * os alunos Ativos com plano='Recorrente' cuja próxima cobrança (baseada em
 * students.dia_vencimento) cai nos próximos 10 dias — inclusive hoje.
 *
 * Não depende da tabela payments (que só ganha linha quando alguém já pagou):
 * a fonte é o dia de cobrança cadastrado no aluno, igual ao widget
 * "Próximos vencimentos" do dashboard.
 *
 * Executado diariamente às 11:00 UTC via Vercel Cron (vercel.json).
 * Autenticação: header Authorization: Bearer <CRON_SECRET>.
 */

/** Igual à função homônima em app/(app)/dashboard/page.tsx — mantida local por simplicidade. */
function proximaCobranca(diaVencimento: number, referencia: Date): { data: string; dias: number } {
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
  const dataAlvo = new Date(anoAlvo, mesAlvo, diaAlvo);
  const dias = Math.round((dataAlvo.getTime() - referencia.getTime()) / (1000 * 60 * 60 * 24));

  const mm = String(mesAlvo + 1).padStart(2, "0");
  const dd = String(diaAlvo).padStart(2, "0");
  return { data: `${dd}/${mm}/${anoAlvo}`, dias };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();

    const { data: students, error: fetchError } = await admin
      .from("students")
      .select("id, nome, telefone, valor_mensalidade, dia_vencimento")
      .eq("status", "Ativo")
      .eq("plano", "Recorrente")
      .not("dia_vencimento", "is", null);

    if (fetchError) {
      console.error("[cron/resumo-cobranca] Erro ao buscar alunos:", fetchError.message);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const hoje = new Date();
    const alunosParaCobrar = (students ?? [])
      .map((s) => {
        const { data, dias } = proximaCobranca(s.dia_vencimento as number, hoje);
        return {
          nome: s.nome as string,
          telefone: s.telefone as string,
          valor: s.valor_mensalidade as number | null,
          data,
          dias,
        };
      })
      .filter((a) => a.dias >= 0 && a.dias <= 10)
      .sort((a, b) => a.dias - b.dias);

    if (alunosParaCobrar.length === 0) {
      console.log("[cron/resumo-cobranca] Nenhum aluno recorrente vencendo nos próximos 10 dias.");
      return NextResponse.json({ enviados: 0, falhas: 0, alunos: 0 });
    }

    const results = await Promise.allSettled(
      DESTINATARIOS.map((to) =>
        sendEmail({
          template: "resumo_cobranca_diario",
          to,
          payload: { alunos: alunosParaCobrar },
        })
      )
    );

    let enviados = 0;
    let falhas = 0;
    for (const result of results) {
      if (result.status === "fulfilled" && result.value === true) enviados++;
      else falhas++;
    }

    await insertAuditLog({
      usuarioId: null,
      perfil: "Sistema",
      acao: "Resumo diário de cobrança enviado",
      entidade: "Financeiro",
      dadosDepois: {
        template: "resumo_cobranca_diario",
        destinatarios: DESTINATARIOS,
        total_alunos: alunosParaCobrar.length,
        enviados,
        falhas,
      },
      ip: "cron",
      userAgent: "vercel-cron",
    });

    console.log(
      `[cron/resumo-cobranca] Concluído. ${alunosParaCobrar.length} aluno(s) no resumo. Enviados: ${enviados}, Falhas: ${falhas}.`
    );

    return NextResponse.json({ enviados, falhas, alunos: alunosParaCobrar.length });
  } catch (err) {
    console.error("[cron/resumo-cobranca] Exceção inesperada:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
