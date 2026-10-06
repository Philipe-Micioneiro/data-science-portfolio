"use server";

import { createClient } from "@/lib/supabase/server";
import { insertAuditLog } from "@/lib/audit";

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
// F12 — Registrar auditoria de exportação da trilha
// ---------------------------------------------------------------------------
export async function registrarExportacaoAuditoriaAction(
  formato: "xlsx" | "csv",
  total: number
): Promise<void> {
  const { user, perfil } = await getSessionAndPerfil();
  if (!user) return;

  if (perfil !== "Administrador") return;

  await insertAuditLog({
    usuarioId: user.id,
    perfil: perfil!,
    acao: "Trilha de auditoria exportada",
    entidade: "Sistema",
    dadosDepois: { formato, total_registros: total },
  });
}
