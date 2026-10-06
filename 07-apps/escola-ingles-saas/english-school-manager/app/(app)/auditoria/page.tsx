import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import AuditoriaClient from "@/components/auditoria/AuditoriaClient";

/**
 * F12 — Módulo de Auditoria
 *
 * Server Component. Admin-only (bloqueado no proxy.ts).
 * Executa query audit_logs JOIN users_profile com LIMIT 500.
 * Filtros aplicados server-side conforme searchParams.
 */

export interface LogRow {
  id: string;
  criado_em: string;
  usuario_id: string | null;
  usuario_nome: string | null;
  usuario_perfil: string | null;
  perfil: string | null;
  acao: string;
  entidade: string | null;
  entidade_id: string | null;
  ip: string | null;
  user_agent: string | null;
  dados_antes: Record<string, unknown> | null;
  dados_depois: Record<string, unknown> | null;
}

export interface UsuarioOpcao {
  id: string;
  nome: string;
}

interface AuditoriaPageProps {
  searchParams: Promise<{
    usuario?: string;
    acao?: string;
    entidade?: string;
    de?: string;
    ate?: string;
    q?: string;
    ip?: string;
  }>;
}

export default async function AuditoriaPage({ searchParams }: AuditoriaPageProps) {
  const params = await searchParams;

  const admin = createAdminClient();

  // Verificar se usuário está logado e é Admin (double-check server-side)
  const supabase = await createClient();
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

  // ── 1. Construir query com filtros ────────────────────────────────────────
  let query = admin
    .from("audit_logs")
    .select(
      `
      id,
      criado_em,
      usuario_id,
      perfil,
      acao,
      entidade,
      entidade_id,
      ip,
      user_agent,
      dados_antes,
      dados_depois,
      users_profile!audit_logs_usuario_id_fkey(nome, perfil)
      `
    )
    .order("criado_em", { ascending: false })
    .limit(500);

  // Filtro por usuario_id
  if (params.usuario && params.usuario !== "todos") {
    query = query.eq("usuario_id", params.usuario);
  }

  // Filtro por acao (text ILIKE)
  if (params.acao) {
    query = query.ilike("acao", `%${params.acao}%`);
  }

  // Filtro por entidade
  if (params.entidade && params.entidade !== "todas") {
    query = query.eq("entidade", params.entidade);
  }

  // Filtro por período — de
  if (params.de) {
    query = query.gte("criado_em", params.de + "T00:00:00Z");
  }

  // Filtro por período — ate
  if (params.ate) {
    query = query.lte("criado_em", params.ate + "T23:59:59Z");
  }

  // Filtro por IP
  if (params.ip) {
    query = query.ilike("ip", `%${params.ip}%`);
  }

  const { data: logsRaw, error: logsError } = await query;

  if (logsError) {
    console.error("[AuditoriaPage] Erro ao buscar logs:", logsError.message);
    return (
      <div style={{ padding: 32, color: "var(--red-text)" }}>
        Erro ao carregar trilha de auditoria. Tente recarregar a página.
      </div>
    );
  }

  // Normalizar dados do JOIN
  const logs: LogRow[] = (logsRaw ?? []).map((l) => {
    const profile = Array.isArray(l.users_profile)
      ? l.users_profile[0]
      : l.users_profile;
    return {
      id: l.id as string,
      criado_em: l.criado_em as string,
      usuario_id: l.usuario_id as string | null,
      usuario_nome: (profile as { nome?: string } | null)?.nome ?? null,
      usuario_perfil: (profile as { perfil?: string } | null)?.perfil ?? null,
      perfil: l.perfil as string | null,
      acao: l.acao as string,
      entidade: l.entidade as string | null,
      entidade_id: l.entidade_id as string | null,
      ip: l.ip as string | null,
      user_agent: l.user_agent as string | null,
      dados_antes: l.dados_antes as Record<string, unknown> | null,
      dados_depois: l.dados_depois as Record<string, unknown> | null,
    };
  });

  // ── 2. Buscar lista de usuários para o filtro ──────────────────────────────
  const { data: usuariosRaw } = await admin
    .from("users_profile")
    .select("id, nome")
    .order("nome");

  const usuarios: UsuarioOpcao[] = (usuariosRaw ?? []).map((u) => ({
    id: u.id as string,
    nome: u.nome as string,
  }));

  return (
    <AuditoriaClient
      logs={logs}
      usuarios={usuarios}
      initialFilters={{
        usuario: params.usuario,
        acao: params.acao,
        entidade: params.entidade,
        de: params.de,
        ate: params.ate,
        q: params.q,
        ip: params.ip,
      }}
    />
  );
}
