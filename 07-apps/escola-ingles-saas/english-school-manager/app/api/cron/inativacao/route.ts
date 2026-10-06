import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertAuditLog } from "@/lib/audit";

/**
 * F3A.5 — Cron Job: Inativação automática de alunos inadimplentes.
 *
 * SPEC §7.5:
 * UPDATE students SET status='Inativo',
 *   motivo_inativacao='Inativação automática — 30 dias sem regularização',
 *   status_atrasado_desde = null
 * WHERE status = 'Atrasado'
 * AND status_atrasado_desde < now() - interval '30 days'
 *
 * Executado diariamente às 02:00 UTC via Vercel Cron (vercel.json).
 * Autenticação: header Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(request: NextRequest) {
  // Validar CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();

    // Threshold: 30 dias atrás (SPEC §7.5)
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 30);

    // Buscar alunos elegíveis para inativação
    const { data: alunosParaInativar, error: fetchError } = await admin
      .from("students")
      .select("id, nome, status_atrasado_desde")
      .eq("status", "Atrasado")
      .lt("status_atrasado_desde", threshold.toISOString())
      .not("status_atrasado_desde", "is", null);

    if (fetchError) {
      console.error("[cron/inativacao] Erro ao buscar alunos:", fetchError.message);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!alunosParaInativar || alunosParaInativar.length === 0) {
      return NextResponse.json({ inativados: 0, mensagem: "Nenhum aluno para inativar." });
    }

    const ids = alunosParaInativar.map((a) => a.id as string);

    // UPDATE em lote
    const { error: updateError } = await admin
      .from("students")
      .update({
        status: "Inativo",
        motivo_inativacao: "Inativação automática — 30 dias sem regularização",
        status_atrasado_desde: null,
        atualizado_em: new Date().toISOString(),
      })
      .in("id", ids);

    if (updateError) {
      console.error("[cron/inativacao] Erro ao inativar alunos:", updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Registrar auditoria para cada aluno inativado (SPEC §7.5)
    await Promise.allSettled(
      alunosParaInativar.map((aluno) =>
        insertAuditLog({
          usuarioId: null,
          perfil: "Sistema",
          acao: "Inativação automática",
          entidade: "Aluno",
          entidadeId: aluno.id as string,
          dadosAntes: { status: "Atrasado", status_atrasado_desde: aluno.status_atrasado_desde },
          dadosDepois: {
            status: "Inativo",
            motivo_inativacao: "Inativação automática — 30 dias sem regularização",
            status_atrasado_desde: null,
          },
          ip: "cron",
          userAgent: "vercel-cron",
        })
      )
    );

    console.log(`[cron/inativacao] ${ids.length} aluno(s) inativado(s) automaticamente.`);

    return NextResponse.json({
      inativados: ids.length,
      ids,
      nomes: alunosParaInativar.map((a) => a.nome),
    });
  } catch (err) {
    console.error("[cron/inativacao] Exceção inesperada:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
