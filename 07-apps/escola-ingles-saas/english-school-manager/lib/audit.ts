import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

type Entidade =
  | "Aluno"
  | "Financeiro"
  | "Usuário"
  | "Professor"
  | "Agenda"
  | "Sistema";

interface InsertAuditLogParams {
  /** auth.uid() do usuário autenticado, ou null para ações automáticas (ex: cron) */
  usuarioId: string | null;
  /** Perfil do usuário, ou 'Sistema' para ações de cron/automação */
  perfil: string;
  /** String descritiva da ação (ex: 'Aluno criado', 'Comprovante aprovado') */
  acao: string;
  /** Entidade afetada */
  entidade: Entidade;
  /** UUID da entidade afetada (opcional) */
  entidadeId?: string;
  /** Estado da entidade antes da mutação (opcional) */
  dadosAntes?: Record<string, unknown>;
  /** Estado da entidade após a mutação (opcional) */
  dadosDepois?: Record<string, unknown>;
  /** IP do solicitante — capturado automaticamente se não fornecido */
  ip?: string;
  /** User-Agent do solicitante — capturado automaticamente se não fornecido */
  userAgent?: string;
}

/**
 * Insere um registro na tabela audit_logs.
 *
 * Usa o admin client para bypass de RLS.
 * Captura IP e UserAgent dos headers do Next.js quando não fornecidos explicitamente.
 * Falhas silenciosas — nunca lança exceção para não interromper o fluxo principal.
 */
export async function insertAuditLog(params: InsertAuditLogParams): Promise<void> {
  try {
    // Capturar IP e UserAgent dos headers do Next.js se não fornecidos
    let resolvedIp = params.ip;
    let resolvedUserAgent = params.userAgent;

    if (!resolvedIp || !resolvedUserAgent) {
      try {
        const headersList = await headers();
        if (!resolvedIp) {
          resolvedIp =
            headersList.get("x-forwarded-for") ??
            headersList.get("x-real-ip") ??
            "unknown";
        }
        if (!resolvedUserAgent) {
          resolvedUserAgent = headersList.get("user-agent") ?? "unknown";
        }
      } catch {
        // headers() pode não estar disponível em todos os contextos (ex: cron sem request)
        resolvedIp = resolvedIp ?? "unknown";
        resolvedUserAgent = resolvedUserAgent ?? "unknown";
      }
    }

    const admin = createAdminClient();

    const { error } = await admin.from("audit_logs").insert({
      usuario_id: params.usuarioId,
      perfil: params.perfil,
      acao: params.acao,
      entidade: params.entidade,
      entidade_id: params.entidadeId ?? null,
      dados_antes: params.dadosAntes ?? null,
      dados_depois: params.dadosDepois ?? null,
      ip: resolvedIp,
      user_agent: resolvedUserAgent,
    });

    if (error) {
      console.error("[audit] Erro ao inserir log de auditoria:", error.message);
    }
  } catch (err) {
    // Falha silenciosa — log de auditoria nunca deve quebrar o fluxo principal
    console.error("[audit] Exceção inesperada ao inserir log:", err);
  }
}
