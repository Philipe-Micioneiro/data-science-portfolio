import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email";

/**
 * Sprint 6C — Cron Job: Cobrança pós-vencimento.
 *
 * Envia email 'cobranca_pos_vencimento' para alunos com pagamento
 * com status 'Atrasado' e vencimento anterior a hoje.
 * Calcula dias_atraso com base em Math.floor((today - vencimento) / 86400000).
 *
 * Executado diariamente às 09:00 UTC via Vercel Cron (vercel.json).
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
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const todayMidnight = new Date(todayStr); // UTC midnight — base para dias_atraso

    // Buscar pagamentos atrasados (vencimento < hoje, status = 'Atrasado')
    const { data: payments, error: fetchError } = await admin
      .from("payments")
      .select(
        "id, competencia, valor_previsto, vencimento, student_id, students!inner(id, nome, email)"
      )
      .lt("vencimento", todayStr)
      .eq("status", "Atrasado");

    if (fetchError) {
      console.error("[cron/cobrancas] Erro ao buscar pagamentos:", fetchError.message);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!payments || payments.length === 0) {
      console.log("[cron/cobrancas] Nenhum pagamento atrasado encontrado.");
      return NextResponse.json({ enviados: 0, falhas: 0, total: 0 });
    }

    console.log(`[cron/cobrancas] ${payments.length} pagamento(s) atrasado(s). Enviando cobranças...`);

    const results = await Promise.allSettled(
      payments.map(async (payment) => {
        // O join retorna students como objeto (inner join = 1 registro)
        const student = Array.isArray(payment.students)
          ? payment.students[0]
          : payment.students;

        if (!student || !student.email) {
          console.error(`[cron/cobrancas] Aluno sem email — payment.id=${payment.id}`);
          return false;
        }

        // Calcular dias de atraso — ambas as datas em UTC midnight para resultado determinístico
        const vencimentoDate = new Date(String(payment.vencimento));
        const diasAtraso = Math.floor(
          (todayMidnight.getTime() - vencimentoDate.getTime()) / 86400000
        );

        const emailEnviado = await sendEmail({
          template: "cobranca_pos_vencimento",
          to: student.email as string,
          payload: {
            nome: student.nome,
            competencia: payment.competencia,
            valor: payment.valor_previsto,
            dias_atraso: diasAtraso,
          },
        });

        await insertAuditLog({
          usuarioId: null,
          perfil: "Sistema",
          acao: "Email enviado",
          entidade: "Aluno",
          entidadeId: student.id as string,
          dadosDepois: {
            template: "cobranca_pos_vencimento",
            competencia: payment.competencia,
            dias_atraso: diasAtraso,
            enviado_para: student.email,
            sucesso: emailEnviado,
          },
          ip: "cron",
          userAgent: "vercel-cron",
        });

        return emailEnviado;
      })
    );

    let enviados = 0;
    let falhas = 0;

    for (const result of results) {
      if (result.status === "fulfilled" && result.value === true) {
        enviados++;
      } else {
        falhas++;
      }
    }

    console.log(`[cron/cobrancas] Concluído. Enviados: ${enviados}, Falhas: ${falhas}, Total: ${payments.length}`);

    return NextResponse.json({ enviados, falhas, total: payments.length });
  } catch (err) {
    console.error("[cron/cobrancas] Exceção inesperada:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
