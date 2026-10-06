"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { insertAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Tipos exportados
// ---------------------------------------------------------------------------

export interface PagarProfessorResult {
  ok: boolean;
  error?: string;
  novoValorPago?: number;
  novoStatus?: string;
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

  return { user, perfil: profile?.perfil ?? "Desconhecido", nome: profile?.nome ?? "Desconhecido" };
}

// ---------------------------------------------------------------------------
// F4B.2 — Registrar Pagamento ao Professor
// ---------------------------------------------------------------------------
export async function pagarProfessorAction(
  teacherPaymentId: string,
  valorNovo: number,
  formaPagamento: string,
  professorNome: string
): Promise<PagarProfessorResult> {
  const { user, perfil } = await getSessionAndPerfil();
  if (!user) return { ok: false, error: "Sessão inválida." };

  if (!["Administrador", "Secretário"].includes(perfil!)) {
    return { ok: false, error: "Sem permissão para registrar pagamentos." };
  }

  if (!teacherPaymentId) {
    return { ok: false, error: "ID do pagamento é obrigatório." };
  }

  if (!valorNovo || valorNovo <= 0) {
    return { ok: false, error: "Valor deve ser maior que zero." };
  }

  const FORMAS_VALIDAS = ["PIX", "Transferência", "Dinheiro", "Outro"];
  if (!FORMAS_VALIDAS.includes(formaPagamento)) {
    return { ok: false, error: "Forma de pagamento inválida." };
  }

  const admin = createAdminClient();

  // 1. Buscar teacher_payment atual
  const { data: tp, error: tpError } = await admin
    .from("teacher_payments")
    .select("id, teacher_id, competencia, valor_pago, valor_devido, status")
    .eq("id", teacherPaymentId)
    .single();

  if (tpError || !tp) {
    return { ok: false, error: "Registro de pagamento não encontrado." };
  }

  const valorPagoAtual = Number(tp.valor_pago ?? 0);
  const valorDevido = Number(tp.valor_devido ?? 0);

  // 2. Calcular novo valor pago
  const novoValorPago = valorPagoAtual + valorNovo;

  // 3. Verificar: não pagar mais que o devido
  if (novoValorPago > valorDevido) {
    return {
      ok: false,
      error: `Valor excede o saldo restante. Restante: R$ ${(valorDevido - valorPagoAtual).toFixed(2).replace(".", ",")}.`,
    };
  }

  // 4. Calcular novo status
  let novoStatus: string;
  if (novoValorPago >= valorDevido) {
    novoStatus = "Pago";
  } else if (novoValorPago > 0) {
    novoStatus = "Parcial";
  } else {
    novoStatus = "Pendente";
  }

  // 5. Capturar dados_antes para auditoria
  const dadosAntes = {
    valor_pago: valorPagoAtual,
    valor_devido: valorDevido,
    status: tp.status,
  };

  // 6. UPDATE teacher_payments
  const { error: updateError } = await admin
    .from("teacher_payments")
    .update({
      valor_pago: novoValorPago,
      status: novoStatus,
    })
    .eq("id", teacherPaymentId);

  if (updateError) {
    return { ok: false, error: updateError.message ?? "Erro ao atualizar pagamento." };
  }

  // 7. Audit log
  await insertAuditLog({
    usuarioId: user.id,
    perfil: perfil!,
    acao: "Pagamento professor registrado",
    entidade: "Professor",
    entidadeId: tp.teacher_id as string,
    dadosAntes,
    dadosDepois: {
      teacher_payment_id: teacherPaymentId,
      professor_nome: professorNome,
      competencia: tp.competencia,
      valor_novo: valorNovo,
      forma_pagamento: formaPagamento,
      novo_valor_pago: novoValorPago,
      novo_status: novoStatus,
    },
  });

  revalidatePath("/financeiro-professores");

  return { ok: true, novoValorPago, novoStatus };
}

// ---------------------------------------------------------------------------
// F4B.1 — Registrar exportação de relatório de professores
// ---------------------------------------------------------------------------
export async function registrarExportacaoProfAction(
  formato: "xlsx" | "csv",
  mes: string,
  total: number
): Promise<void> {
  const { user, perfil } = await getSessionAndPerfil();
  if (!user) return;

  await insertAuditLog({
    usuarioId: user.id,
    perfil: perfil!,
    acao: "Relatório exportado",
    entidade: "Professor",
    dadosDepois: { formato, mes, total },
  });
}
