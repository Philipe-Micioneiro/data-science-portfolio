"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { insertAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Algoritmo de senha temporária — SPEC §0.6
// ---------------------------------------------------------------------------
function gerarSenhaTemp(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sem I, O
  const lower = "abcdefghjkmnpqrstuvwxyz"; // sem i, l, o
  const digits = "23456789"; // sem 0, 1
  const rand = (s: string) => s[Math.floor(Math.random() * s.length)];
  const suffix = Array.from({ length: 4 }, () => rand(upper + lower + digits)).join("");
  return `Temp#${new Date().getFullYear()}${rand(upper)}${rand(digits)}${suffix}`;
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
export interface CriarProfessorInput {
  nome: string;
  email: string;
  telefone: string;
  valor_hora: string;
  forma_pagamento: string;
  obs_financeiras: string;
}

export interface EditarProfessorInput {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  valor_hora: string;
  forma_pagamento: string;
  obs_financeiras: string;
  status: "Ativo" | "Inativo";
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  /** Senha temporária exibida em banner após criação */
  senhaTemp?: string;
  emailFalhou?: boolean;
}

// ---------------------------------------------------------------------------
// F2C.2 — Criar Professor
// ---------------------------------------------------------------------------
export async function criarProfessorAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  // Autenticação do solicitante
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão inválida." };

  const { data: solicitante } = await supabase
    .from("users_profile")
    .select("nome, perfil")
    .eq("id", user.id)
    .single();

  const perfil = solicitante?.perfil ?? "Desconhecido";

  if (!["Administrador", "Secretário"].includes(perfil)) {
    return { ok: false, error: "Sem permissão para criar professores." };
  }

  // Extrair campos
  const nome = (formData.get("nome") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const telefone = (formData.get("telefone") as string | null)?.trim() ?? "";
  const valor_hora_str = (formData.get("valor_hora") as string | null)?.trim() ?? "";
  const forma_pagamento = (formData.get("forma_pagamento") as string | null)?.trim() ?? "PIX";
  const obs_financeiras = (formData.get("obs_financeiras") as string | null)?.trim() ?? "";

  // Validação mínima
  if (!nome || !email) {
    return { ok: false, error: "Nome e email são obrigatórios." };
  }
  const valor_hora = Number(valor_hora_str);
  if (isNaN(valor_hora) || valor_hora < 0) {
    return { ok: false, error: "Valor hora inválido." };
  }

  const admin = createAdminClient();

  // 1. INSERT teachers
  const { data: teacher, error: teacherError } = await admin
    .from("teachers")
    .insert({
      nome,
      email,
      telefone: telefone || null,
      valor_hora,
      forma_pagamento,
      obs_financeiras: obs_financeiras || null,
      status: "Ativo",
    })
    .select("id")
    .single();

  if (teacherError || !teacher) {
    return {
      ok: false,
      error: teacherError?.message ?? "Erro ao cadastrar professor.",
    };
  }

  const teacherId: string = teacher.id;

  // 2. Gerar senha temporária
  const senhaTemp = gerarSenhaTemp();

  // 3. Criar usuário no Supabase Auth
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password: senhaTemp,
      email_confirm: true,
    });

  if (authError || !authData?.user) {
    // Reverter insert do teacher para manter consistência
    await admin.from("teachers").delete().eq("id", teacherId);
    return {
      ok: false,
      error: authError?.message ?? "Erro ao criar usuário de acesso.",
    };
  }

  const authUserId: string = authData.user.id;

  // 4. INSERT users_profile
  const { error: profileError } = await admin.from("users_profile").insert({
    id: authUserId,
    nome,
    email,
    perfil: "Professor",
    status: "Ativo",
    precisa_trocar_senha: true,
  });

  if (profileError) {
    // Rollback: remover auth user e teacher para não deixar registros órfãos
    await admin.auth.admin.deleteUser(authUserId);
    await admin.from("teachers").delete().eq("id", teacherId);
    return {
      ok: false,
      error: "Erro ao criar perfil do professor. Operação revertida.",
    };
  }

  // 5. UPDATE teachers.user_id
  await admin
    .from("teachers")
    .update({ user_id: authUserId })
    .eq("id", teacherId);

  // 6. Enviar email de boas-vindas (falha silenciosa)
  const emailFalhou = !(await sendEmail({
    template: "boas_vindas",
    to: email,
    payload: { nome, email, senha: senhaTemp },
  }));

  // 7. Audit log
  await insertAuditLog({
    usuarioId: user.id,
    perfil,
    acao: "Professor criado",
    entidade: "Professor",
    entidadeId: teacherId,
    dadosDepois: { nome, email, telefone, valor_hora, forma_pagamento, status: "Ativo" },
  });

  revalidatePath("/professores");

  return { ok: true, senhaTemp, emailFalhou };
}

// ---------------------------------------------------------------------------
// F2C.3 — Editar Professor
// ---------------------------------------------------------------------------
export async function editarProfessorAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão inválida." };

  const { data: solicitante } = await supabase
    .from("users_profile")
    .select("nome, perfil")
    .eq("id", user.id)
    .single();

  const perfil = solicitante?.perfil ?? "Desconhecido";

  if (!["Administrador", "Secretário"].includes(perfil)) {
    return { ok: false, error: "Sem permissão para editar professores." };
  }

  const id = (formData.get("id") as string | null)?.trim() ?? "";
  const nome = (formData.get("nome") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const telefone = (formData.get("telefone") as string | null)?.trim() ?? "";
  const valor_hora_str = (formData.get("valor_hora") as string | null)?.trim() ?? "";
  const forma_pagamento = (formData.get("forma_pagamento") as string | null)?.trim() ?? "PIX";
  const obs_financeiras = (formData.get("obs_financeiras") as string | null)?.trim() ?? "";
  const status = (formData.get("status") as string | null)?.trim() as "Ativo" | "Inativo";

  if (!id || !nome || !email) {
    return { ok: false, error: "ID, nome e email são obrigatórios." };
  }
  const valor_hora = Number(valor_hora_str);
  if (isNaN(valor_hora) || valor_hora < 0) {
    return { ok: false, error: "Valor hora inválido." };
  }

  const admin = createAdminClient();

  // Capturar dados anteriores para audit log
  const { data: antes } = await admin
    .from("teachers")
    .select("nome, email, telefone, valor_hora, forma_pagamento, obs_financeiras, status, user_id")
    .eq("id", id)
    .single();

  // UPDATE teachers
  const { error: updateError } = await admin
    .from("teachers")
    .update({
      nome,
      email,
      telefone: telefone || null,
      valor_hora,
      forma_pagamento,
      obs_financeiras: obs_financeiras || null,
      status,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  // UPDATE users_profile sincronizado (nome e email)
  if (antes?.user_id) {
    await admin
      .from("users_profile")
      .update({ nome, email })
      .eq("id", antes.user_id);

    // Sync email no auth.users para não dessincronizar credencial de login
    if (email !== antes.email) {
      await admin.auth.admin.updateUserById(antes.user_id, { email });
    }
  }

  // Audit log
  await insertAuditLog({
    usuarioId: user.id,
    perfil,
    acao: "Professor editado",
    entidade: "Professor",
    entidadeId: id,
    dadosAntes: antes
      ? {
          nome: antes.nome,
          email: antes.email,
          telefone: antes.telefone,
          valor_hora: antes.valor_hora,
          forma_pagamento: antes.forma_pagamento,
          obs_financeiras: antes.obs_financeiras,
          status: antes.status,
        }
      : undefined,
    dadosDepois: { nome, email, telefone, valor_hora, forma_pagamento, obs_financeiras, status },
  });

  revalidatePath("/professores");

  return { ok: true };
}

// ---------------------------------------------------------------------------
// F2C.4 — Inativar / Reativar Professor
// ---------------------------------------------------------------------------
export async function toggleStatusProfessorAction(
  id: string,
  novoStatus: "Ativo" | "Inativo"
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão inválida." };

  const { data: solicitante } = await supabase
    .from("users_profile")
    .select("nome, perfil")
    .eq("id", user.id)
    .single();

  const perfil = solicitante?.perfil ?? "Desconhecido";

  if (!["Administrador", "Secretário"].includes(perfil)) {
    return { ok: false, error: "Sem permissão para alterar status de professor." };
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("teachers")
    .update({ status: novoStatus, atualizado_em: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  await insertAuditLog({
    usuarioId: user.id,
    perfil,
    acao: novoStatus === "Inativo" ? "Professor inativado" : "Professor reativado",
    entidade: "Professor",
    entidadeId: id,
    dadosDepois: { status: novoStatus },
  });

  revalidatePath("/professores");

  return { ok: true };
}
