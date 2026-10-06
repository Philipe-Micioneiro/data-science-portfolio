import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email";

/**
 * Sprint 6B — Cron Job: Lembrete de vencimento de pagamento.
 *
 * Envia email 'lembrete_vencimento' para alunos cujo pagamento vence hoje,
 * com status diferente de 'Pago' e 'Pendente de Validação',
 * e forma de pagamento PIX ou Boleto.
 *
 * Executado diariamente às 08:00 UTC via Vercel Cron (vercel.json).
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
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Buscar pagamentos que vencem hoje, não pagos e via PIX/Boleto
    const { data: payments, error: fetchError } = await admin
      .from("payments")
      .select(
        "id, competencia, valor_previsto, vencimento, forma_pagamento, student_id, students!inner(id, nome, email)"
      )
      .eq("vencimento", today)
      .not("status", "eq", "Pago")
      .not("status", "eq", "Pendente de Validação")
      .in("forma_pagamento", ["PIX", "Boleto"]);

    if (fetchError) {
      console.error("[cron/lembretes] Erro ao buscar pagamentos:", fetchError.message);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!payments || payments.length === 0) {
      console.log("[cron/lembretes] Nenhum pagamento vencendo hoje.");
      return NextResponse.json({ enviados: 0, falhas: 0, total: 0 });
    }

    console.log(`[cron/lembretes] ${payments.length} pagamento(s) vencendo hoje. Enviando lembretes...`);

    const results = await Promise.allSettled(
      payments.map(async (payment) => {
        // O join retorna students como objeto (inner join = 1 registro)
        const student = Array.isArray(payment.students)
          ? payment.students[0]
          : payment.students;

        if (!student || !student.email) {
          console.error(`[cron/lembretes] Aluno sem email — payment.id=${payment.id}`);
          return false;
        }

        const emailEnviado = await sendEmail({
          template: "lembrete_vencimento",
          to: student.email as string,
          payload: {
            nome: student.nome,
            competencia: payment.competencia,
            valor: payment.valor_previsto,
            vencimento: payment.vencimento,
            forma_pagamento: payment.forma_pagamento,
          },
        });

        await insertAuditLog({
          usuarioId: null,
          perfil: "Sistema",
          acao: "Email enviado",
          entidade: "Aluno",
          entidadeId: student.id as string,
          dadosDepois: {
            template: "lembrete_vencimento",
            competencia: payment.competencia,
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

    console.log(`[cron/lembretes] Concluído. Enviados: ${enviados}, Falhas: ${falhas}, Total: ${payments.length}`);

    return NextResponse.json({ enviados, falhas, total: payments.length });
  } catch (err) {
    console.error("[cron/lembretes] Exceção inesperada:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
