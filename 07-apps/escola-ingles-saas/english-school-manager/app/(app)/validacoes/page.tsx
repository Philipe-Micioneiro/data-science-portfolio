import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import ValidacoesClient, {
  type PagamentoPendente,
} from "@/components/validacoes/ValidacoesClient";

/**
 * F4A.3 — Página de Validação de Comprovantes
 *
 * Server Component.
 * Apenas Admin e Secretário — proteção via proxy.ts.
 * Gera signed URLs para os comprovantes (validade: 3600s) via admin client.
 */

export default async function ValidacoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentUserPerfil = "Secretário";
  if (user) {
    const { data: profile } = await supabase
      .from("users_profile")
      .select("perfil")
      .eq("id", user.id)
      .single();
    currentUserPerfil = profile?.perfil ?? "Secretário";
  }

  const admin = createAdminClient();

  // ── Buscar pagamentos pendentes com JOIN ──────────────────────────────────
  const { data: pagsRaw, error: pagsError } = await admin
    .from("payments")
    .select(
      `id, student_id, competencia, valor_previsto, forma_pagamento, vencimento, criado_em,
       students!inner(nome, email),
       payment_receipts(arquivo_url, hash_sha256)`
    )
    .eq("status", "Pendente de Validação")
    .order("criado_em", { ascending: true });

  if (pagsError) {
    console.error("[ValidacoesPage] Erro ao buscar pendentes:", pagsError.message);
    return (
      <div style={{ padding: 32, color: "var(--red-text)" }}>
        Erro ao carregar fila de validações. Tente recarregar a página.
      </div>
    );
  }

  // ── Gerar signed URLs no servidor ────────────────────────────────────────
  const pendentes: PagamentoPendente[] = await Promise.all(
    (pagsRaw ?? []).map(async (p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const st = (p as any).students as { nome: string; email: string | null } | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recs = (p as any).payment_receipts as Array<{
        arquivo_url: string;
        hash_sha256: string;
      }> | null;
      const rec = Array.isArray(recs) ? recs[0] : null;

      let signedUrl: string | null = null;

      if (rec?.arquivo_url) {
        const { data: signed } = await admin
          .storage
          .from("comprovantes")
          .createSignedUrl(rec.arquivo_url, 3600);
        signedUrl = signed?.signedUrl ?? null;
      }

      return {
        id: p.id as string,
        student_id: p.student_id as string,
        aluno_nome: st?.nome ?? "—",
        aluno_email: st?.email ?? null,
        competencia: p.competencia as string,
        valor_previsto: p.valor_previsto as number | null,
        forma_pagamento: p.forma_pagamento as string | null,
        vencimento: p.vencimento as string | null,
        criado_em: p.criado_em as string,
        arquivo_url: rec?.arquivo_url ?? null,
        arquivo_url_signed: signedUrl,
        hash_sha256: rec?.hash_sha256 ?? null,
      };
    })
  );

  return (
    <ValidacoesClient
      pendentes={pendentes}
      currentUserPerfil={currentUserPerfil}
    />
  );
}
