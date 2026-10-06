"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { insertAuditLog } from "@/lib/audit";

export interface ExportarRelatorioResult {
  ok: boolean;
  error?: string;
  data?: Record<string, unknown>[];
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
// F13 — Exportar relatório por tipo
// ---------------------------------------------------------------------------
export async function exportarRelatorioAction(
  tipo: "alunos" | "pagamentos" | "inadimplencia" | "professores" | "auditoria",
  formato: "xlsx" | "csv"
): Promise<ExportarRelatorioResult> {
  const { user, perfil } = await getSessionAndPerfil();
  if (!user) return { ok: false, error: "Sessão inválida." };

  if (!["Administrador", "Secretário"].includes(perfil!)) {
    return { ok: false, error: "Sem permissão para exportar relatórios." };
  }

  // Auditoria: apenas Admin
  if (tipo === "auditoria" && perfil !== "Administrador") {
    return { ok: false, error: "Sem permissão para exportar trilha de auditoria." };
  }

  const admin = createAdminClient();
  let rows: Record<string, unknown>[] = [];

  try {
    switch (tipo) {
      case "alunos": {
        const { data, error } = await admin
          .from("students")
          .select(
            "id, nome, telefone, email, plano, nivel_ingles, valor_mensalidade, dia_vencimento, data_entrada, carga_horaria, observacoes, status, motivo_inativacao, criado_em"
          )
          .order("nome");
        if (error) return { ok: false, error: error.message };

        // Buscar vínculos de professores
        const studentIds = (data ?? []).map((s) => s.id as string);
        const { data: vinculos } = await admin
          .from("student_teachers")
          .select("student_id, teachers(nome)")
          .in("student_id", studentIds.length > 0 ? studentIds : ["__none__"]);

        const profNomes: Record<string, string[]> = {};
        for (const v of vinculos ?? []) {
          const sid = v.student_id as string;
          if (!profNomes[sid]) profNomes[sid] = [];
          const t = v.teachers as { nome?: string } | null;
          if (t?.nome) profNomes[sid].push(t.nome);
        }

        rows = (data ?? []).map((s) => ({
          Nome: s.nome,
          Telefone: s.telefone,
          Email: s.email ?? "",
          Plano: s.plano ?? "",
          "Nível de Inglês": s.nivel_ingles ?? "",
          "Valor Mensalidade": s.valor_mensalidade ?? "",
          "Dia Vencimento": s.dia_vencimento ?? "",
          "Data Entrada": s.data_entrada ?? "",
          "Carga Horária": s.carga_horaria ?? "",
          Observações: s.observacoes ?? "",
          Status: s.status,
          "Motivo Inativação": s.motivo_inativacao ?? "",
          "Criado Em": s.criado_em,
          Professores: (profNomes[s.id as string] ?? []).join(", "),
        }));
        break;
      }

      case "pagamentos": {
        const { data, error } = await admin
          .from("payments")
          .select(
            "id, competencia, valor_previsto, valor_pago, forma_pagamento, vencimento, status, motivo_rejeicao, aprovado_em, criado_em, students(nome)"
          )
          .order("competencia_date", { ascending: false });
        if (error) return { ok: false, error: error.message };

        rows = (data ?? []).map((p) => ({
          Aluno: (p.students as { nome?: string } | null)?.nome ?? "",
          Competência: p.competencia,
          "Valor Previsto": p.valor_previsto,
          "Valor Pago": p.valor_pago ?? "",
          "Forma Pagamento": p.forma_pagamento,
          Vencimento: p.vencimento ?? "",
          Status: p.status,
          "Motivo Rejeição": p.motivo_rejeicao ?? "",
          "Aprovado Em": p.aprovado_em ?? "",
          "Criado Em": p.criado_em,
        }));
        break;
      }

      case "inadimplencia": {
        const { data, error } = await admin
          .from("payments")
          .select(
            "id, competencia, valor_previsto, vencimento, criado_em, students(nome, telefone, email)"
          )
          .eq("status", "Atrasado")
          .order("competencia_date", { ascending: false });
        if (error) return { ok: false, error: error.message };

        rows = (data ?? []).map((p) => {
          const s = p.students as { nome?: string; telefone?: string; email?: string } | null;
          return {
            Aluno: s?.nome ?? "",
            Telefone: s?.telefone ?? "",
            Email: s?.email ?? "",
            Competência: p.competencia,
            "Valor Previsto": p.valor_previsto,
            Vencimento: p.vencimento ?? "",
            "Registrado Em": p.criado_em,
          };
        });
        break;
      }

      case "professores": {
        const { data: teachersData, error } = await admin
          .from("teachers")
          .select("id, nome, email, telefone, valor_hora, forma_pagamento, status, criado_em")
          .order("nome");
        if (error) return { ok: false, error: error.message };

        const teacherIds = (teachersData ?? []).map((t) => t.id as string);

        // Contar alunos por professor
        const { data: vinculosData } = await admin
          .from("student_teachers")
          .select("teacher_id")
          .in("teacher_id", teacherIds.length > 0 ? teacherIds : ["__none__"]);

        const alunoCount: Record<string, number> = {};
        for (const v of vinculosData ?? []) {
          const tid = v.teacher_id as string;
          alunoCount[tid] = (alunoCount[tid] ?? 0) + 1;
        }

        rows = (teachersData ?? []).map((t) => ({
          Nome: t.nome,
          Email: t.email,
          Telefone: t.telefone ?? "",
          "Valor Hora": t.valor_hora ?? "",
          "Forma Pagamento": t.forma_pagamento ?? "",
          Status: t.status,
          "Total Alunos": alunoCount[t.id as string] ?? 0,
          "Criado Em": t.criado_em,
        }));
        break;
      }

      case "auditoria": {
        const { data, error } = await admin
          .from("audit_logs")
          .select(
            "id, criado_em, perfil, acao, entidade, entidade_id, ip, dados_antes, dados_depois, users_profile!audit_logs_usuario_id_fkey(nome)"
          )
          .order("criado_em", { ascending: false })
          .limit(5000);
        if (error) return { ok: false, error: error.message };

        rows = (data ?? []).map((l) => {
          const profile = Array.isArray(l.users_profile)
            ? l.users_profile[0]
            : l.users_profile;
          return {
            "Data/Hora": l.criado_em,
            Usuário: (profile as { nome?: string } | null)?.nome ?? "Sistema",
            Perfil: l.perfil ?? "",
            Ação: l.acao,
            Entidade: l.entidade ?? "",
            "ID Entidade": l.entidade_id ?? "",
            IP: l.ip ?? "",
            "Dados Antes": l.dados_antes ? JSON.stringify(l.dados_antes) : "",
            "Dados Depois": l.dados_depois ? JSON.stringify(l.dados_depois) : "",
          };
        });
        break;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro inesperado.";
    return { ok: false, error: msg };
  }

  // Registrar auditoria da exportação
  await insertAuditLog({
    usuarioId: user.id,
    perfil: perfil!,
    acao: "Relatório exportado",
    entidade: "Sistema",
    dadosDepois: {
      tipo_relatorio: tipo,
      formato,
      total_registros: rows.length,
    },
  });

  return { ok: true, data: rows };
}
