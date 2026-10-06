import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import RelatoriosClient from "@/components/relatorios/RelatoriosClient";

/**
 * F13 — Módulo de Relatórios
 *
 * Server Component.
 * Acesso: Admin + Secretário (proxy.ts já garante).
 * Card "Trilha de auditoria" só é exibido para Admin.
 */

export interface RelatoriosContagens {
  totalAlunos: number;
  totalPagamentos: number;
  totalInadimplentes: number;
  totalProfessores: number;
  totalAuditoria: number | null; // null para Secretário
}

export default async function RelatoriosPage() {
  const admin = createAdminClient();

  // Verificar perfil do usuário
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let perfil = "Secretário";
  if (user) {
    const { data: profile } = await supabase
      .from("users_profile")
      .select("perfil")
      .eq("id", user.id)
      .single();
    perfil = profile?.perfil ?? "Secretário";
  }

  const isAdmin = perfil === "Administrador";

  // Buscar contagens em paralelo
  const [
    { count: totalAlunos },
    { count: totalPagamentos },
    { count: totalInadimplentes },
    { count: totalProfessores },
    auditResult,
  ] = await Promise.all([
    admin.from("students").select("id", { count: "exact", head: true }),
    admin.from("payments").select("id", { count: "exact", head: true }),
    admin
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "Atrasado"),
    admin.from("teachers").select("id", { count: "exact", head: true }),
    isAdmin
      ? admin.from("audit_logs").select("id", { count: "exact", head: true })
      : Promise.resolve({ count: null }),
  ]);

  const contagens: RelatoriosContagens = {
    totalAlunos: totalAlunos ?? 0,
    totalPagamentos: totalPagamentos ?? 0,
    totalInadimplentes: totalInadimplentes ?? 0,
    totalProfessores: totalProfessores ?? 0,
    totalAuditoria: isAdmin ? (auditResult.count ?? 0) : null,
  };

  return <RelatoriosClient contagens={contagens} isAdmin={isAdmin} />;
}
