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
  /** ID real do registro criado — usado para reconciliar a linha otimista no cliente. */
  id?: string;
}

export interface CriarAlunoInput {
  nome: string;
  telefone: string;
  email?: string;
  plano?: string;
  nivel_ingles?: string;
  valor_mensalidade?: string;
  dia_vencimento?: string;
  data_entrada?: string;
  carga_horaria?: string;
  observacoes?: string;
  professor_ids: string[];
}

export interface EditarAlunoInput {
  id: string;
  telefone: string;
  email: string;
  plano: string;
  nivel_ingles: string;
  valor_mensalidade?: string; // só Admin pode alterar
  dia_vencimento: string;
  carga_horaria: string;
  observacoes: string;
  professor_ids: string[];
}

export interface InativarAlunoInput {
  id: string;
  motivo: string;
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
// F3A.2 — Criar Aluno
// ---------------------------------------------------------------------------
export async function criarAlunoAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { user, perfil } = await getSessionAndPerfil();
  if (!user) return { ok: false, error: "Sessão inválida." };

  if (!["Administrador", "Secretário"].includes(perfil!)) {
    return { ok: false, error: "Sem permissão para cadastrar alunos." };
  }

  const nome = (formData.get("nome") as string | null)?.trim() ?? "";
  const telefone = (formData.get("telefone") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() || null;
  const plano = (formData.get("plano") as string | null)?.trim() || null;
  const nivel_ingles = (formData.get("nivel_ingles") as string | null)?.trim() || null;
  const valor_mensalidade_str = (formData.get("valor_mensalidade") as string | null)?.trim() ?? "";
  const dia_vencimento_str = (formData.get("dia_vencimento") as string | null)?.trim() ?? "";
  const data_entrada = (formData.get("data_entrada") as string | null)?.trim() || null;
  const carga_horaria = (formData.get("carga_horaria") as string | null)?.trim() || null;
  const observacoes = (formData.get("observacoes") as string | null)?.trim() || null;
  const professor_ids_raw = (formData.get("professor_ids") as string | null) ?? "";
  const professor_ids = professor_ids_raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!nome) return { ok: false, error: "Nome é obrigatório." };
  if (!telefone) return { ok: false, error: "Telefone é obrigatório." };
  if (professor_ids.length === 0) {
    return { ok: false, error: "Pelo menos um professor deve ser selecionado." };
  }

  const valor_mensalidade =
    valor_mensalidade_str !== "" ? Number(valor_mensalidade_str) : null;
  if (valor_mensalidade !== null && isNaN(valor_mensalidade)) {
    return { ok: false, error: "Valor da mensalidade inválido." };
  }

  const dia_vencimento =
    dia_vencimento_str !== "" ? Number(dia_vencimento_str) : null;
  if (dia_vencimento !== null && (isNaN(dia_vencimento) || dia_vencimento < 1 || dia_vencimento > 31)) {
    return { ok: false, error: "Dia de vencimento inválido (1–31)." };
  }

  const admin = createAdminClient();

  // 1. INSERT students
  const { data: aluno, error: alunoError } = await admin
    .from("students")
    .insert({
      nome,
      telefone,
      email,
      plano,
      nivel_ingles,
      valor_mensalidade,
      dia_vencimento,
      data_entrada: data_entrada || null,
      carga_horaria,
      observacoes,
      status: "Ativo",
      criado_por: user.id,
    })
    .select("id")
    .single();

  if (alunoError || !aluno) {
    return {
      ok: false,
      error: alunoError?.message ?? "Erro ao cadastrar aluno.",
    };
  }

  const alunoId: string = aluno.id as string;

  // 2. INSERT student_teachers para cada professor selecionado
  const vinculoRows = professor_ids.map((tid) => ({
    student_id: alunoId,
    teacher_id: tid,
  }));

  const { error: vinculoError } = await admin
    .from("student_teachers")
    .insert(vinculoRows);

  if (vinculoError) {
    // Rollback: remover aluno para não deixar registro órfão
    await admin.from("students").delete().eq("id", alunoId);
    return {
      ok: false,
      error: "Erro ao vincular professor. Operação revertida.",
    };
  }

  // 3. Audit log
  await insertAuditLog({
    usuarioId: user.id,
    perfil: perfil!,
    acao: "Aluno criado",
    entidade: "Aluno",
    entidadeId: alunoId,
    dadosDepois: {
      nome,
      telefone,
      email,
      plano,
      nivel_ingles,
      valor_mensalidade,
      dia_vencimento,
      data_entrada,
      carga_horaria,
      observacoes,
      status: "Ativo",
      professor_ids,
    },
  });

  revalidatePath("/alunos");

  return { ok: true, id: alunoId };
}

// ---------------------------------------------------------------------------
// F3A.3 — Editar Aluno
// ---------------------------------------------------------------------------
export async function editarAlunoAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { user, perfil } = await getSessionAndPerfil();
  if (!user) return { ok: false, error: "Sessão inválida." };

  if (!["Administrador", "Secretário"].includes(perfil!)) {
    return { ok: false, error: "Sem permissão para editar alunos." };
  }

  const id = (formData.get("id") as string | null)?.trim() ?? "";
  const telefone = (formData.get("telefone") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() || null;
  const plano = (formData.get("plano") as string | null)?.trim() || null;
  const nivel_ingles = (formData.get("nivel_ingles") as string | null)?.trim() || null;
  const carga_horaria = (formData.get("carga_horaria") as string | null)?.trim() || null;
  const observacoes = (formData.get("observacoes") as string | null)?.trim() || null;
  const professor_ids_raw = (formData.get("professor_ids") as string | null) ?? "";
  const professor_ids = professor_ids_raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const dia_vencimento_str = (formData.get("dia_vencimento") as string | null)?.trim() ?? "";
  const dia_vencimento =
    dia_vencimento_str !== "" ? Number(dia_vencimento_str) : null;
  if (dia_vencimento !== null && (isNaN(dia_vencimento) || dia_vencimento < 1 || dia_vencimento > 31)) {
    return { ok: false, error: "Dia de vencimento inválido (1–31)." };
  }

  if (!id) return { ok: false, error: "ID do aluno é obrigatório." };
  if (!telefone) return { ok: false, error: "Telefone é obrigatório." };
  if (professor_ids.length === 0) {
    return { ok: false, error: "Pelo menos um professor deve ser selecionado." };
  }

  const admin = createAdminClient();

  // Capturar dados anteriores para audit log e rollback de vínculos
  const { data: antes } = await admin
    .from("students")
    .select("nome, telefone, email, plano, nivel_ingles, valor_mensalidade, dia_vencimento, carga_horaria, observacoes, status")
    .eq("id", id)
    .single();

  const { data: vinculosAntigos } = await admin
    .from("student_teachers")
    .select("teacher_id")
    .eq("student_id", id);

  // Montar payload de update — valor_mensalidade só Admin pode alterar
  const updatePayload: Record<string, unknown> = {
    telefone,
    email,
    plano,
    nivel_ingles,
    dia_vencimento,
    carga_horaria,
    observacoes,
    atualizado_em: new Date().toISOString(),
  };

  if (perfil === "Administrador") {
    const valor_mensalidade_str = (formData.get("valor_mensalidade") as string | null)?.trim() ?? "";
    const valor_mensalidade =
      valor_mensalidade_str !== "" ? Number(valor_mensalidade_str) : null;
    if (valor_mensalidade !== null && isNaN(valor_mensalidade)) {
      return { ok: false, error: "Valor da mensalidade inválido." };
    }
    updatePayload.valor_mensalidade = valor_mensalidade;
  }

  // UPDATE students
  const { error: updateError } = await admin
    .from("students")
    .update(updatePayload)
    .eq("id", id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  // DELETE student_teachers e reinserir (replace)
  await admin.from("student_teachers").delete().eq("student_id", id);

  const vinculoRows = professor_ids.map((tid) => ({
    student_id: id,
    teacher_id: tid,
  }));

  const { error: vinculoError } = await admin
    .from("student_teachers")
    .insert(vinculoRows);

  if (vinculoError) {
    // Rollback: restaurar vínculos anteriores para não deixar aluno sem professor
    if (vinculosAntigos && vinculosAntigos.length > 0) {
      await admin.from("student_teachers").insert(
        vinculosAntigos.map((v) => ({ student_id: id, teacher_id: v.teacher_id }))
      );
    }
    return { ok: false, error: "Erro ao atualizar vínculos com professores. Operação revertida." };
  }

  // Audit log
  await insertAuditLog({
    usuarioId: user.id,
    perfil: perfil!,
    acao: "Aluno editado",
    entidade: "Aluno",
    entidadeId: id,
    dadosAntes: antes
      ? {
          nome: antes.nome,
          telefone: antes.telefone,
          email: antes.email,
          plano: antes.plano,
          nivel_ingles: antes.nivel_ingles,
          valor_mensalidade: antes.valor_mensalidade,
          dia_vencimento: antes.dia_vencimento,
          carga_horaria: antes.carga_horaria,
          observacoes: antes.observacoes,
          status: antes.status,
        }
      : undefined,
    dadosDepois: {
      ...updatePayload,
      professor_ids,
    },
  });

  revalidatePath("/alunos");

  return { ok: true };
}

// ---------------------------------------------------------------------------
// F3A.4 — Inativar Aluno
// ---------------------------------------------------------------------------
export async function inativarAlunoAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { user, perfil } = await getSessionAndPerfil();
  if (!user) return { ok: false, error: "Sessão inválida." };

  if (!["Administrador", "Secretário"].includes(perfil!)) {
    return { ok: false, error: "Sem permissão para inativar alunos." };
  }

  const id = (formData.get("id") as string | null)?.trim() ?? "";
  const motivo = (formData.get("motivo") as string | null)?.trim() ?? "";

  if (!id) return { ok: false, error: "ID do aluno é obrigatório." };
  if (!motivo) return { ok: false, error: "Motivo de inativação é obrigatório." };

  const admin = createAdminClient();

  // Capturar status anterior
  const { data: antes } = await admin
    .from("students")
    .select("status, nome")
    .eq("id", id)
    .single();

  const { error } = await admin
    .from("students")
    .update({
      status: "Inativo",
      motivo_inativacao: motivo,
      status_atrasado_desde: null,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  await insertAuditLog({
    usuarioId: user.id,
    perfil: perfil!,
    acao: "Aluno inativado",
    entidade: "Aluno",
    entidadeId: id,
    dadosAntes: antes ? { status: antes.status } : undefined,
    dadosDepois: { status: "Inativo", motivo_inativacao: motivo },
  });

  revalidatePath("/alunos");

  return { ok: true };
}

// ---------------------------------------------------------------------------
// F3A.4 — Reativar Aluno (inline no AlunoDetail)
// ---------------------------------------------------------------------------
export async function reativarAlunoAction(id: string): Promise<ActionResult> {
  const { user, perfil } = await getSessionAndPerfil();
  if (!user) return { ok: false, error: "Sessão inválida." };

  if (!["Administrador", "Secretário"].includes(perfil!)) {
    return { ok: false, error: "Sem permissão para reativar alunos." };
  }

  if (!id) return { ok: false, error: "ID do aluno é obrigatório." };

  const admin = createAdminClient();

  const { error } = await admin
    .from("students")
    .update({
      status: "Ativo",
      motivo_inativacao: null,
      status_atrasado_desde: null,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  await insertAuditLog({
    usuarioId: user.id,
    perfil: perfil!,
    acao: "Aluno reativado",
    entidade: "Aluno",
    entidadeId: id,
    dadosDepois: { status: "Ativo" },
  });

  revalidatePath("/alunos");

  return { ok: true };
}

// ---------------------------------------------------------------------------
// F3A.1 — Registrar auditoria de exportação
// ---------------------------------------------------------------------------
export async function registrarExportacaoAction(formato: "xlsx" | "csv"): Promise<void> {
  const { user, perfil } = await getSessionAndPerfil();
  if (!user) return;

  await insertAuditLog({
    usuarioId: user.id,
    perfil: perfil!,
    acao: "Base de alunos exportada",
    entidade: "Aluno",
    dadosDepois: { formato },
  });
}
