import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import MinhaContaClient from "@/components/conta/MinhaContaClient";

/**
 * F15 — Módulo: Minha Conta
 *
 * Server Component. Todos os perfis podem acessar.
 * Busca perfil do usuário logado.
 * Se Professor: busca também dados de teachers (telefone).
 */

export interface ContaPerfil {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  telefone: string | null;
}

export default async function ContaPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div style={{ padding: 32, color: "var(--red-text)" }}>
        Sessão inválida. Faça login novamente.
      </div>
    );
  }

  // Buscar perfil na users_profile
  const { data: profile } = await admin
    .from("users_profile")
    .select("nome, email, perfil")
    .eq("id", user.id)
    .single();

  const perfil = profile?.perfil ?? "Desconhecido";
  const nome = (profile?.nome as string) ?? "";
  const email = (profile?.email as string) ?? user.email ?? "";

  // Se Professor: buscar telefone da tabela teachers
  let telefone: string | null = null;
  if (perfil === "Professor") {
    const { data: teacher } = await admin
      .from("teachers")
      .select("telefone")
      .eq("user_id", user.id)
      .single();
    telefone = (teacher?.telefone as string | null) ?? null;
  }

  const contaPerfil: ContaPerfil = {
    id: user.id,
    nome,
    email,
    perfil,
    telefone,
  };

  return <MinhaContaClient perfil={contaPerfil} />;
}
