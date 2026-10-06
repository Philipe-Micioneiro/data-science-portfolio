"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { insertAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

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
// F14 — Salvar configurações da escola
// ---------------------------------------------------------------------------
export async function salvarConfigAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { user, perfil } = await getSessionAndPerfil();
  if (!user) return { ok: false, error: "Sessão inválida." };

  if (perfil !== "Administrador") {
    return { ok: false, error: "Apenas Administradores podem alterar configurações." };
  }

  const nome_instituicao =
    (formData.get("nome_instituicao") as string | null)?.trim() ?? "";
  const dias_uteis_atraso_str =
    (formData.get("dias_uteis_atraso") as string | null)?.trim() ?? "";
  const dias_inativacao_str =
    (formData.get("dias_inativacao") as string | null)?.trim() ?? "";
  const comprovante_obrigatorio =
    formData.get("comprovante_obrigatorio") === "on" ||
    formData.get("comprovante_obrigatorio") === "true";
  const notificar_rejeicao =
    formData.get("notificar_rejeicao") === "on" ||
    formData.get("notificar_rejeicao") === "true";

  // Validações
  if (!nome_instituicao) {
    return { ok: false, error: "Nome da instituição é obrigatório." };
  }

  const dias_uteis_atraso = Number(dias_uteis_atraso_str);
  if (
    isNaN(dias_uteis_atraso) ||
    dias_uteis_atraso < 1 ||
    dias_uteis_atraso > 30
  ) {
    return {
      ok: false,
      error: "Dias úteis para atraso deve ser entre 1 e 30.",
    };
  }

  const dias_inativacao = Number(dias_inativacao_str);
  if (
    isNaN(dias_inativacao) ||
    dias_inativacao < 7 ||
    dias_inativacao > 90
  ) {
    return {
      ok: false,
      error: "Dias para inativação deve ser entre 7 e 90.",
    };
  }

  const admin = createAdminClient();

  // Capturar dados anteriores para audit
  const { data: configAntes } = await admin
    .from("school_config")
    .select(
      "nome_instituicao, dias_uteis_atraso, dias_inativacao, comprovante_obrigatorio, notificar_rejeicao"
    )
    .eq("id", 1)
    .single();

  const dadosDepois = {
    nome_instituicao,
    dias_uteis_atraso,
    dias_inativacao,
    comprovante_obrigatorio,
    notificar_rejeicao,
  };

  const { error } = await admin
    .from("school_config")
    .update({
      ...dadosDepois,
      atualizado_por: user.id,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    return { ok: false, error: error.message };
  }

  await insertAuditLog({
    usuarioId: user.id,
    perfil: perfil!,
    acao: "Configurações alteradas",
    entidade: "Sistema",
    dadosAntes: configAntes
      ? {
          nome_instituicao: configAntes.nome_instituicao,
          dias_uteis_atraso: configAntes.dias_uteis_atraso,
          dias_inativacao: configAntes.dias_inativacao,
          comprovante_obrigatorio: configAntes.comprovante_obrigatorio,
          notificar_rejeicao: configAntes.notificar_rejeicao,
        }
      : undefined,
    dadosDepois,
  });

  revalidatePath("/configuracoes");

  return { ok: true };
}
