"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { insertAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Tipos exportados
// ---------------------------------------------------------------------------

export interface ActionResult {
  ok: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helper — verificar sessão e perfil
// ---------------------------------------------------------------------------
async function getSessionAndPerfil() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, perfil: null };

  const { data: profile } = await supabase
    .from("users_profile")
    .select("nome, perfil")
    .eq("id", user.id)
    .single();

  return { user, perfil: profile?.perfil ?? "Desconhecido" };
}

// ---------------------------------------------------------------------------
// F4A.3 — Gerar signed URL para comprovante
// ---------------------------------------------------------------------------
export async function gerarSignedUrlAction(
  storagePath: string
): Promise<{ url: string | null; error?: string }> {
  const { user, perfil } = await getSessionAndPerfil();
  if (!user) return { url: null, error: "Sessão inválida." };

  if (!["Administrador", "Secretário"].includes(perfil!)) {
    return { url: null, error: "Sem permissão." };
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .storage
    .from("comprovantes")
    .createSignedUrl(storagePath, 3600);

  if (error || !data) {
    return { url: null, error: error?.message ?? "Erro ao gerar URL." };
  }

  return { url: data.signedUrl };
}

// ---------------------------------------------------------------------------
// F4A.3 — Aprovar pagamento
// ---------------------------------------------------------------------------
export async function aprovarPagamentoAction(
  payment_id: string
): Promise<ActionResult> {
  const { user, perfil } = await getSessionAndPerfil();
  if (!user) return { ok: false, error: "Sessão inválida." };

  if (!["Administrador", "Secretário"].includes(perfil!)) {
    return { ok: false, error: "Sem permissão para aprovar pagamentos." };
  }

  if (!payment_id) return { ok: false, error: "ID do pagamento é obrigatório." };

  const admin = createAdminClient();

  // Buscar dados do pagamento
  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("id, student_id, competencia, valor_previsto, status")
    .eq("id", payment_id)
    .single();

  if (paymentError || !payment) {
    return { ok: false, error: "Pagamento não encontrado." };
  }

  if (payment.status !== "Pendente de Validação") {
    return { ok: false, error: "Apenas pagamentos pendentes podem ser aprovados." };
  }

  // UPDATE payments
  const { error: updateError } = await admin
    .from("payments")
    .update({
      status: "Pago",
      valor_pago: payment.valor_previsto,
      aprovado_por: user.id,
      aprovado_em: new Date().toISOString(),
    })
    .eq("id", payment_id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  // UPDATE students → Ativo
  await admin
    .from("students")
    .update({
      status: "Ativo",
      status_atrasado_desde: null,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", payment.student_id);

  // Audit log
  await insertAuditLog({
    usuarioId: user.id,
    perfil: perfil!,
    acao: "Comprovante aprovado",
    entidade: "Financeiro",
    entidadeId: payment_id,
    dadosDepois: {
      student_id: payment.student_id,
      competencia: payment.competencia,
      aprovado_por: user.id,
    },
  });

  revalidatePath("/validacoes");
  revalidatePath("/financeiro");
  revalidatePath("/alunos");
  revalidatePath("/dashboard");

  return { ok: true };
}

// ---------------------------------------------------------------------------
// F4A.3 — Rejeitar pagamento
// ---------------------------------------------------------------------------
export async function rejeitarPagamentoAction(
  payment_id: string,
  motivo: string
): Promise<ActionResult> {
  const { user, perfil } = await getSessionAndPerfil();
  if (!user) return { ok: false, error: "Sessão inválida." };

  if (!["Administrador", "Secretário"].includes(perfil!)) {
    return { ok: false, error: "Sem permissão para rejeitar pagamentos." };
  }

  if (!payment_id) return { ok: false, error: "ID do pagamento é obrigatório." };

  const motivoTrimmed = motivo.trim();
  if (motivoTrimmed.length < 20) {
    return { ok: false, error: "Motivo deve ter pelo menos 20 caracteres." };
  }

  const admin = createAdminClient();

  // Buscar dados do pagamento + aluno (email de students — NOT users_profile)
  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("id, student_id, competencia, valor_previsto, status, students!inner(nome, email)")
    .eq("id", payment_id)
    .single();

  if (paymentError || !payment) {
    return { ok: false, error: "Pagamento não encontrado." };
  }

  if (payment.status !== "Pendente de Validação") {
    return { ok: false, error: "Apenas pagamentos pendentes podem ser rejeitados." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aluno = (payment as any).students as { nome: string; email: string | null } | null;
  const alunoNome = aluno?.nome ?? "Aluno";
  // CRÍTICO: usar students.email — aluno NÃO tem conta de login
  const alunoEmail = aluno?.email ?? null;

  // UPDATE payments
  const { error: updateError } = await admin
    .from("payments")
    .update({
      status: "Atrasado",
      motivo_rejeicao: motivoTrimmed,
    })
    .eq("id", payment_id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  // Enviar email de rejeição para students.email (falha silenciosa)
  if (alunoEmail) {
    await sendEmail({
      template: "rejeicao_comprovante",
      to: alunoEmail,
      payload: {
        nome: alunoNome,
        motivo: motivoTrimmed,
      },
    });
  }

  // Audit log
  await insertAuditLog({
    usuarioId: user.id,
    perfil: perfil!,
    acao: "Comprovante rejeitado",
    entidade: "Financeiro",
    entidadeId: payment_id,
    dadosDepois: {
      student_id: payment.student_id,
      competencia: payment.competencia,
      motivo: motivoTrimmed,
      email_enviado: !!alunoEmail,
    },
  });

  revalidatePath("/validacoes");
  revalidatePath("/financeiro");
  revalidatePath("/alunos");
  revalidatePath("/dashboard");

  return { ok: true };
}
