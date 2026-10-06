import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";

/**
 * App group layout — Server Component.
 * Valida sessão e carrega perfil do usuário autenticado.
 * Passa dados ao AppShell (Client Component) para renderizar Sidebar + Topbar.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Busca perfil na tabela users_profile
  const { data: userRow } = await supabase
    .from("users_profile")
    .select("nome, email, perfil")
    .eq("id", user.id)
    .single();

  // Fallback para dados do auth se perfil não existir na tabela
  const userName = userRow?.nome ?? user.user_metadata?.nome ?? user.email ?? "Usuário";
  const userEmail = userRow?.email ?? user.email ?? "";
  const userPerfil = userRow?.perfil ?? "Professor";

  return (
    <AppShell
      userName={userName}
      userEmail={userEmail}
      userPerfil={userPerfil}
    >
      {children}
    </AppShell>
  );
}
