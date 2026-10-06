"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { insertAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Tipos exportados
// ---------------------------------------------------------------------------

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export interface VerificarHashResult {
  ok: boolean;
  error?: "DUPLICATE_HASH" | "INVALID_MIME" | string;
  context?: {
    alunoNome: string;
    competencia: string;
  };
}

export interface RegistrarPagamentoInput {
  student_id: string;
  forma_pagamento: "Cartão" | "PIX" | "Boleto";
  /** SHA256 calculado no client — obrigatório para PIX e Boleto */
  hash_sha256?: string;
  /** MIME type declarado pelo browser — usado como fallback; servidor prefere arquivo.type */
  arquivo_mime?: string;
  /** Tamanho do arquivo em bytes */
  arquivo_size?: number;
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
// F4A.2 — Verificar hash SHA256 (antes do upload)
// Apenas valida se já existe — o upload real acontece em registrarPagamentoAction
// ---------------------------------------------------------------------------
export async function verificarHashAction(
  hash_sha256: string,
  arquivo_mime: string
): Promise<VerificarHashResult> {
  const { user, perfil } = await getSessionAndPerfil();
  if (!user) return { ok: false, error: "Sessão inválida." };

  if (!["Administrador", "Secretário"].includes(perfil!)) {
    return { ok: false, error: "Sem permissão." };
  }

  // Validar MIME type server-side
  const ALLOWED_MIMES = ["image/png", "image/jpeg", "application/pdf"];
  if (!ALLOWED_MIMES.includes(arquivo_mime)) {
    return { ok: false, error: "INVALID_MIME" };
  }

  if (!hash_sha256 || hash_sha256.length !== 64) {
    return { ok: false, error: "Hash SHA256 inválido." };
  }

  const admin = createAdminClient();

  // Verificar duplicata
  const { data: existing } = await admin
    .from("payment_receipts")
    .select(
      "id, payment_id, payments!inner(competencia, students!inner(nome))"
    )
    .eq("hash_sha256", hash_sha256)
    .maybeSingle();

  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pag = (existing as any).payments;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const alunoNome = (pag?.students as any)?.nome ?? "Aluno desconhecido";
    const competencia = pag?.competencia ?? "";

    await insertAuditLog({
      usuarioId: user.id,
      perfil: perfil!,
      acao: "Tentativa de hash duplicado",
      entidade: "Financeiro",
      dadosDepois: { hash: hash_sha256, alunoNome, competencia },
    });

    return {
      ok: false,
      error: "DUPLICATE_HASH",
      context: { alunoNome, competencia },
    };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// F4A.2 — Registrar Pagamento (ação final)
// ---------------------------------------------------------------------------
export async function registrarPagamentoAction(
  formData: FormData
): Promise<ActionResult> {
  const { user, perfil } = await getSessionAndPerfil();
  if (!user) return { ok: false, error: "Sessão inválida." };

  if (!["Administrador", "Secretário"].includes(perfil!)) {
    return { ok: false, error: "Sem permissão para registrar pagamentos." };
  }

  const student_id = (formData.get("student_id") as string | null)?.trim() ?? "";
  const forma_pagamento = (formData.get("forma_pagamento") as string | null)?.trim() ?? "";
  const hash_sha256 = (formData.get("hash_sha256") as string | null)?.trim() ?? "";
  const arquivo_mime = (formData.get("arquivo_mime") as string | null)?.trim() ?? "";
  const arquivo = formData.get("arquivo") as File | null;

  if (!student_id) return { ok: false, error: "Aluno é obrigatório." };
  if (!["Cartão", "PIX", "Boleto"].includes(forma_pagamento)) {
    return { ok: false, error: "Forma de pagamento inválida." };
  }

  const admin = createAdminClient();

  // Buscar dados do aluno
  const { data: aluno, error: alunoError } = await admin
    .from("students")
    .select("id, nome, valor_mensalidade, dia_vencimento, status, email")
    .eq("id", student_id)
    .single();

  if (alunoError || !aluno) {
    return { ok: false, error: "Aluno não encontrado." };
  }

  if (aluno.status === "Inativo") {
    return { ok: false, error: "Não é possível registrar pagamento para aluno inativo." };
  }

  const valorPrevisto = aluno.valor_mensalidade as number | null;
  if (valorPrevisto == null) {
    return { ok: false, error: "Aluno não possui valor de mensalidade cadastrado." };
  }

  // Comprovante obrigatório para PIX e Boleto
  const precisaComprovante = forma_pagamento !== "Cartão";
  if (precisaComprovante && (!arquivo || !hash_sha256)) {
    return { ok: false, error: "Comprovante obrigatório para PIX e Boleto." };
  }

  // Validar MIME server-side — derivar do arquivo real, não do campo enviado pelo client
  if (arquivo) {
    const ALLOWED_MIMES = ["image/png", "image/jpeg", "application/pdf"];
    const mimeReal = arquivo.type || arquivo_mime;
    if (!mimeReal || !ALLOWED_MIMES.includes(mimeReal)) {
      return { ok: false, error: "Tipo de arquivo não permitido. Use PNG, JPG ou PDF." };
    }
  }

  // Verificar hash duplicado se tiver comprovante
  if (hash_sha256 && arquivo) {
    const { data: hashExisting } = await admin
      .from("payment_receipts")
      .select("id, payment_id, payments!inner(competencia, students!inner(nome))")
      .eq("hash_sha256", hash_sha256)
      .maybeSingle();

    if (hashExisting) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pag = (hashExisting as any).payments;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const alunoNome = (pag?.students as any)?.nome ?? "Aluno desconhecido";
      const competencia = pag?.competencia ?? "";

      await insertAuditLog({
        usuarioId: user.id,
        perfil: perfil!,
        acao: "Tentativa de hash duplicado",
        entidade: "Financeiro",
        dadosDepois: { hash: hash_sha256, alunoNome, competencia },
      });

      return {
        ok: false,
        error: `Este comprovante já foi utilizado para ${alunoNome} na competência ${competencia}.`,
      };
    }
  }

  // Calcular competência e vencimento
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = agora.getMonth() + 1;
  const competencia = `${String(mes).padStart(2, "0")}/${ano}`;
  const competencia_date = `${ano}-${String(mes).padStart(2, "0")}-01`;

  const diaVenc = (aluno.dia_vencimento as number | null) ?? 10;
  // Ajustar dia de vencimento para o mês atual (dia máximo do mês)
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const diaFinal = Math.min(diaVenc, ultimoDia);
  const vencimento = `${ano}-${String(mes).padStart(2, "0")}-${String(diaFinal).padStart(2, "0")}`;

  // Status baseado na forma de pagamento
  const status = forma_pagamento === "Cartão" ? "Pago" : "Pendente de Validação";

  // 1. INSERT payments
  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .insert({
      student_id,
      competencia,
      competencia_date,
      valor_previsto: valorPrevisto,
      valor_pago: forma_pagamento === "Cartão" ? valorPrevisto : null,
      forma_pagamento,
      vencimento,
      status,
      criado_por: user.id,
    })
    .select("id")
    .single();

  if (paymentError || !payment) {
    return { ok: false, error: paymentError?.message ?? "Erro ao registrar pagamento." };
  }

  const paymentId = payment.id as string;

  // 2. Upload do comprovante e INSERT payment_receipts (se aplicável)
  if (arquivo && hash_sha256) {
    // Determinar extensão a partir do tipo real do arquivo
    const mimeEfetivo = arquivo.type || arquivo_mime;
    const ext = mimeEfetivo === "application/pdf" ? "pdf"
      : mimeEfetivo === "image/png" ? "png"
      : "jpg";
    const storagePath = `${paymentId}/${hash_sha256}.${ext}`;

    const { error: uploadError } = await admin
      .storage
      .from("comprovantes")
      .upload(storagePath, arquivo, {
        contentType: mimeEfetivo || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      // Rollback do payment
      await admin.from("payments").delete().eq("id", paymentId);
      return { ok: false, error: "Erro ao fazer upload do comprovante. Operação revertida." };
    }

    // URL do arquivo (signed URL será gerada ao visualizar)
    const arquivo_url = storagePath;

    const { error: receiptError } = await admin
      .from("payment_receipts")
      .insert({
        payment_id: paymentId,
        arquivo_url,
        hash_sha256,
        formato: mimeEfetivo,
        enviado_por: user.id,
      });

    if (receiptError) {
      // Tentar rollback do storage e payment
      await admin.storage.from("comprovantes").remove([storagePath]);
      await admin.from("payments").delete().eq("id", paymentId);
      return { ok: false, error: "Erro ao registrar comprovante. Operação revertida." };
    }
  }

  // 3. Se Cartão → atualizar status do aluno para Ativo
  if (forma_pagamento === "Cartão") {
    await admin
      .from("students")
      .update({
        status: "Ativo",
        status_atrasado_desde: null,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", student_id);
  }

  // 4. Audit log
  await insertAuditLog({
    usuarioId: user.id,
    perfil: perfil!,
    acao: "Pagamento registrado",
    entidade: "Financeiro",
    entidadeId: paymentId,
    dadosDepois: {
      student_id,
      student_nome: aluno.nome,
      competencia,
      valor_previsto: valorPrevisto,
      forma_pagamento,
      status,
    },
  });

  revalidatePath("/financeiro");
  revalidatePath("/validacoes");
  revalidatePath("/alunos");
  revalidatePath("/dashboard");

  return { ok: true, id: paymentId };
}

// ---------------------------------------------------------------------------
// F4A.1 — Registrar exportação de lançamentos
// ---------------------------------------------------------------------------
export async function registrarExportacaoFinanceiroAction(
  formato: "xlsx" | "csv",
  filtros: Record<string, string>,
  total: number
): Promise<void> {
  const { user, perfil } = await getSessionAndPerfil();
  if (!user) return;

  await insertAuditLog({
    usuarioId: user.id,
    perfil: perfil!,
    acao: "Relatório exportado",
    entidade: "Financeiro",
    dadosDepois: { formato, filtros, total },
  });
}
