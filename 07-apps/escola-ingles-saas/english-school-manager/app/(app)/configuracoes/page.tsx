import { createAdminClient } from "@/lib/supabase/admin";
import ConfiguracoesClient from "@/components/configuracoes/ConfiguracoesClient";

/**
 * F14 — Módulo de Configurações
 *
 * Server Component. Admin-only (bloqueado no proxy.ts).
 * Busca school_config WHERE id = 1 via admin client (bypass RLS).
 */

export interface SchoolConfig {
  nome_instituicao: string;
  dias_uteis_atraso: number;
  dias_inativacao: number;
  comprovante_obrigatorio: boolean;
  notificar_rejeicao: boolean;
}

const DEFAULT_CONFIG: SchoolConfig = {
  nome_instituicao: "Smart Talk",
  dias_uteis_atraso: 5,
  dias_inativacao: 30,
  comprovante_obrigatorio: true,
  notificar_rejeicao: true,
};

export default async function ConfiguracoesPage() {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("school_config")
    .select(
      "nome_instituicao, dias_uteis_atraso, dias_inativacao, comprovante_obrigatorio, notificar_rejeicao"
    )
    .eq("id", 1)
    .single();

  if (error) {
    console.error("[ConfiguracoesPage] Erro ao buscar configurações:", error.message);
  }

  const config: SchoolConfig = data
    ? {
        nome_instituicao: (data.nome_instituicao as string) ?? DEFAULT_CONFIG.nome_instituicao,
        dias_uteis_atraso:
          (data.dias_uteis_atraso as number) ?? DEFAULT_CONFIG.dias_uteis_atraso,
        dias_inativacao:
          (data.dias_inativacao as number) ?? DEFAULT_CONFIG.dias_inativacao,
        comprovante_obrigatorio:
          (data.comprovante_obrigatorio as boolean) ??
          DEFAULT_CONFIG.comprovante_obrigatorio,
        notificar_rejeicao:
          (data.notificar_rejeicao as boolean) ?? DEFAULT_CONFIG.notificar_rejeicao,
      }
    : DEFAULT_CONFIG;

  return <ConfiguracoesClient config={config} />;
}
