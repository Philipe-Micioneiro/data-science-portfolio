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
  /** ID real do registro criado — usado para reconciliar o item otimista no cliente */
  id?: string;
}

export interface CriarAulaInput {
  student_id: string;
  teacher_id: string;
  start_at: string; // ISO 8601
  duracao_min: number;
  observacoes?: string;
}

export interface ReagendarAulaInput {
  id: string;
  start_at: string; // ISO 8601
  duracao_min: number;
  observacoes?: string;
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
// F3B.2 — Criar Aula
// ---------------------------------------------------------------------------
export async function criarAulaAction(input: CriarAulaInput): Promise<ActionResult> {
  const { user, perfil } = await getSessionAndPerfil();
  if (!user) return { ok: false, error: "Sessão inválida." };

  if (perfil === "Professor") {
    return { ok: false, error: "Professor não pode agendar aulas." };
  }

  if (!["Administrador", "Secretário"].includes(perfil!)) {
    return { ok: false, error: "Sem permissão para agendar aulas." };
  }

  const { student_id, teacher_id, start_at, duracao_min, observacoes } = input;

  if (!student_id) return { ok: false, error: "Aluno é obrigatório." };
  if (!teacher_id) return { ok: false, error: "Professor é obrigatório." };
  if (!start_at) return { ok: false, error: "Data/hora é obrigatória." };
  if (!duracao_min || duracao_min <= 0) return { ok: false, error: "Duração inválida." };

  const admin = createAdminClient();

  // Verificação server-side: aluno não pode ser Inativo
  const { data: aluno } = await admin
    .from("students")
    .select("id, nome, status")
    .eq("id", student_id)
    .single();

  if (!aluno) return { ok: false, error: "Aluno não encontrado." };

  if (aluno.status === "Inativo") {
    return { ok: false, error: `Aluno "${aluno.nome}" está inativo. Não é possível agendar aulas.` };
  }

  // INSERT
  const { data: novaAula, error: insertError } = await admin
    .from("agenda")
    .insert({
      student_id,
      teacher_id,
      start_at,
      duracao_min,
      observacoes: observacoes?.trim() || null,
      status: "Agendada",
      criado_por: user.id,
    })
    .select("id")
    .single();

  if (insertError || !novaAula) {
    return { ok: false, error: insertError?.message ?? "Erro ao agendar aula." };
  }

  await insertAuditLog({
    usuarioId: user.id,
    perfil: perfil!,
    acao: "Aula agendada",
    entidade: "Agenda",
    entidadeId: novaAula.id as string,
    dadosDepois: {
      student_id,
      teacher_id,
      start_at,
      duracao_min,
      observacoes,
      status: "Agendada",
    },
  });

  revalidatePath("/agenda");

  return { ok: true, id: novaAula.id as string };
}

// ---------------------------------------------------------------------------
// F3B.2 — Reagendar Aula
// ---------------------------------------------------------------------------
export async function reagendarAulaAction(input: ReagendarAulaInput): Promise<ActionResult> {
  const { user, perfil } = await getSessionAndPerfil();
  if (!user) return { ok: false, error: "Sessão inválida." };

  if (perfil === "Professor") {
    return { ok: false, error: "Professor não pode reagendar aulas." };
  }

  if (!["Administrador", "Secretário"].includes(perfil!)) {
    return { ok: false, error: "Sem permissão para reagendar aulas." };
  }

  const { id, start_at, duracao_min, observacoes } = input;

  if (!id) return { ok: false, error: "ID da aula é obrigatório." };
  if (!start_at) return { ok: false, error: "Data/hora é obrigatória." };
  if (!duracao_min || duracao_min <= 0) return { ok: false, error: "Duração inválida." };

  const admin = createAdminClient();

  // Capturar dados anteriores para audit
  const { data: antes } = await admin
    .from("agenda")
    .select("start_at, duracao_min, observacoes, status")
    .eq("id", id)
    .single();

  if (!antes) return { ok: false, error: "Aula não encontrada." };
  if (antes.status === "Cancelada") {
    return { ok: false, error: "Não é possível reagendar uma aula cancelada." };
  }

  const { error: updateError } = await admin
    .from("agenda")
    .update({ start_at, duracao_min, observacoes: observacoes?.trim() || null })
    .eq("id", id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  await insertAuditLog({
    usuarioId: user.id,
    perfil: perfil!,
    acao: "Aula reagendada",
    entidade: "Agenda",
    entidadeId: id,
    dadosAntes: { start_at: antes.start_at, duracao_min: antes.duracao_min, observacoes: antes.observacoes },
    dadosDepois: { start_at, duracao_min, observacoes },
  });

  revalidatePath("/agenda");

  return { ok: true };
}

// ---------------------------------------------------------------------------
// F3B.3 — Cancelar Aula
// ---------------------------------------------------------------------------
export async function cancelarAulaAction(id: string): Promise<ActionResult> {
  const { user, perfil } = await getSessionAndPerfil();
  if (!user) return { ok: false, error: "Sessão inválida." };

  if (perfil === "Professor") {
    return { ok: false, error: "Professor não pode cancelar aulas." };
  }

  if (!["Administrador", "Secretário"].includes(perfil!)) {
    return { ok: false, error: "Sem permissão para cancelar aulas." };
  }

  if (!id) return { ok: false, error: "ID da aula é obrigatório." };

  const admin = createAdminClient();

  const { data: antes } = await admin
    .from("agenda")
    .select("status, student_id, teacher_id, start_at")
    .eq("id", id)
    .single();

  if (!antes) return { ok: false, error: "Aula não encontrada." };
  if (antes.status === "Cancelada") {
    return { ok: false, error: "Esta aula já está cancelada." };
  }

  const { error: updateError } = await admin
    .from("agenda")
    .update({ status: "Cancelada" })
    .eq("id", id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  await insertAuditLog({
    usuarioId: user.id,
    perfil: perfil!,
    acao: "Aula cancelada",
    entidade: "Agenda",
    entidadeId: id,
    dadosAntes: { status: antes.status },
    dadosDepois: { status: "Cancelada" },
  });

  revalidatePath("/agenda");

  return { ok: true };
}
