"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { insertAuditLog } from "@/lib/audit";

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
  if (!user) return { user: null, perfil: null, email: null };

  const { data: profile } = await supabase
    .from("users_profile")
    .select("nome, perfil, email")
    .eq("id", user.id)
    .single();

  return {
    user,
    perfil: profile?.perfil ?? "Desconhecido",
    email: profile?.email ?? user.email ?? null,
  };
}

// ---------------------------------------------------------------------------
// F15 — Atualizar dados pessoais
// ---------------------------------------------------------------------------
export async function atualizarDadosAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { user, perfil, email: emailAtual } = await getSessionAndPerfil();
  if (!user) return { ok: false, error: "Sessão inválida." };

  const nome = (formData.get("nome") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const telefone = (formData.get("telefone") as string | null)?.trim() || null;

  if (!nome) return { ok: false, error: "Nome é obrigatório." };
  if (!email) return { ok: false, error: "E-mail é obrigatório." };

  const admin = createAdminClient();
  const supabase = await createClient();

  // UPDATE users_profile SET nome
  const { error: profileError } = await admin
    .from("users_profile")
    .update({ nome, atualizado_em: new Date().toISOString() })
    .eq("id", user.id);

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  // Se Professor: UPDATE teachers SET nome, telefone WHERE user_id = user.id
  // Supabase: UPDATE com 0 linhas afetadas retorna error=null — vínculo pode estar pendente.
  // Erros reais (constraint, permissão) sempre populam error com mensagem.
  if (perfil === "Professor") {
    const { error: teacherError } = await admin
      .from("teachers")
      .update({
        nome,
        ...(telefone !== null ? { telefone } : {}),
        atualizado_em: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (teacherError) {
      return { ok: false, error: "Erro ao atualizar dados do professor: " + teacherError.message };
    }
  }

  // Se email mudou: atualizar auth + espelho na users_profile
  if (email !== emailAtual) {
    const { error: authError } = await supabase.auth.updateUser({ email });
    if (authError) {
      return {
        ok: false,
        error: "Erro ao atualizar e-mail: " + authError.message,
      };
    }
    // Atualizar espelho na users_profile
    await admin
      .from("users_profile")
      .update({ email })
      .eq("id", user.id);
  }

  await insertAuditLog({
    usuarioId: user.id,
    perfil: perfil!,
    acao: "Dados pessoais atualizados",
    entidade: "Usuário",
    entidadeId: user.id,
    dadosDepois: { nome, email },
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// F15 — Trocar senha
// ---------------------------------------------------------------------------
export async function trocarSenhaAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { user, perfil, email } = await getSessionAndPerfil();
  if (!user || !email) return { ok: false, error: "Sessão inválida." };

  const senha_atual = (formData.get("senha_atual") as string | null) ?? "";
  const nova_senha = (formData.get("nova_senha") as string | null) ?? "";
  const confirmar_senha = (formData.get("confirmar_senha") as string | null) ?? "";

  if (!senha_atual) return { ok: false, error: "Senha atual é obrigatória." };
  if (!nova_senha) return { ok: false, error: "Nova senha é obrigatória." };

  // Validar senhas idênticas
  if (nova_senha !== confirmar_senha) {
    return { ok: false, error: "As senhas não coincidem." };
  }

  // Validar força da senha
  if (nova_senha.length < 8) {
    return { ok: false, error: "A nova senha deve ter no mínimo 8 caracteres." };
  }
  if (!/[A-Z]/.test(nova_senha)) {
    return { ok: false, error: "A nova senha deve conter pelo menos 1 letra maiúscula." };
  }
  if (!/[0-9]/.test(nova_senha)) {
    return { ok: false, error: "A nova senha deve conter pelo menos 1 número." };
  }

  // Validar senha atual tentando fazer login com ela
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: senha_atual,
  });

  if (signInError) {
    return { ok: false, error: "Senha atual incorreta." };
  }

  // Atualizar para a nova senha
  const { error: updateError } = await supabase.auth.updateUser({
    password: nova_senha,
  });

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  await insertAuditLog({
    usuarioId: user.id,
    perfil: perfil!,
    acao: "Senha alterada",
    entidade: "Usuário",
    entidadeId: user.id,
  });

  return { ok: true };
}
