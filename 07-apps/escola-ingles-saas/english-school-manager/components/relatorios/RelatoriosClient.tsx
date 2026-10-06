"use client";

import { useTransition, useState } from "react";
import * as XLSX from "xlsx";
import { useToast } from "@/components/ui/Toast";
import { exportarRelatorioAction } from "@/app/(app)/relatorios/actions";
import type { RelatoriosContagens } from "@/app/(app)/relatorios/page";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

type TipoRelatorio =
  | "alunos"
  | "pagamentos"
  | "inadimplencia"
  | "professores"
  | "auditoria";

interface CardRelatorio {
  tipo: TipoRelatorio;
  titulo: string;
  descricao: string;
  contagem: number | null;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de download
// ─────────────────────────────────────────────────────────────────────────────

function downloadBlob(name: string, content: BlobPart, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 100);
}

function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [cols.map(esc).join(";")];
  rows.forEach((r) => lines.push(cols.map((c) => esc(r[c])).join(";")));
  downloadBlob(filename + ".csv", "﻿" + lines.join("\n"), "text/csv;charset=utf-8;");
}

function exportXLSX(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]);
  const wsData = [cols, ...rows.map((r) => cols.map((c) => r[c] ?? ""))];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  XLSX.writeFile(wb, filename + ".xlsx");
}

// ─────────────────────────────────────────────────────────────────────────────
// Ícones
// ─────────────────────────────────────────────────────────────────────────────

function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconDollar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function IconAlertCircle() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconGradCap() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconDownload({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconSpinner({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ animation: "spin 0.7s linear infinite" }}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente de card individual
// ─────────────────────────────────────────────────────────────────────────────

function RelatorioCard({
  card,
  onExport,
  isPendingTipo,
}: {
  card: CardRelatorio;
  onExport: (tipo: TipoRelatorio, formato: "xlsx" | "csv") => void;
  isPendingTipo: TipoRelatorio | null;
}) {
  const isLoading = isPendingTipo === card.tipo;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)",
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Icon + título */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: card.adminOnly ? "var(--blue-50)" : "var(--hover)",
            display: "grid",
            placeItems: "center",
            color: card.adminOnly ? "var(--blue)" : "var(--ink-2)",
            flexShrink: 0,
          }}
        >
          {card.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 14.5,
              color: "var(--ink)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {card.titulo}
            {card.adminOnly && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "1px 7px",
                  borderRadius: 99,
                  fontSize: 10.5,
                  fontWeight: 600,
                  background: "var(--blue-50)",
                  color: "var(--blue)",
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                }}
              >
                Admin
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: "var(--muted)",
              marginTop: 3,
              lineHeight: 1.4,
            }}
          >
            {card.descricao}
          </div>
        </div>
      </div>

      {/* Contagem */}
      {card.contagem !== null && (
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            lineHeight: 1,
          }}
        >
          {card.contagem.toLocaleString("pt-BR")}
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--muted)",
              marginLeft: 6,
              letterSpacing: 0,
            }}
          >
            registros
          </span>
        </div>
      )}

      {/* Botões de exportação */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => onExport(card.tipo, "xlsx")}
          disabled={isLoading}
          style={{
            flex: 1,
            height: 34,
            border: "1px solid var(--line-2)",
            borderRadius: "var(--r)",
            background: "var(--surface)",
            color: "var(--ink-2)",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {isLoading ? <IconSpinner size={13} /> : <IconDownload size={13} />}
          XLSX
        </button>
        <button
          onClick={() => onExport(card.tipo, "csv")}
          disabled={isLoading}
          style={{
            flex: 1,
            height: 34,
            border: "1px solid var(--line-2)",
            borderRadius: "var(--r)",
            background: "var(--surface)",
            color: "var(--ink-2)",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {isLoading ? <IconSpinner size={13} /> : <IconDownload size={13} />}
          CSV
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Props e componente principal
// ─────────────────────────────────────────────────────────────────────────────

interface RelatoriosClientProps {
  contagens: RelatoriosContagens;
  isAdmin: boolean;
}

export default function RelatoriosClient({
  contagens,
  isAdmin,
}: RelatoriosClientProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [pendingTipo, setPendingTipo] = useState<TipoRelatorio | null>(null);

  function handleExport(tipo: TipoRelatorio, formato: "xlsx" | "csv") {
    setPendingTipo(tipo);
    startTransition(async () => {
      const result = await exportarRelatorioAction(tipo, formato);
      setPendingTipo(null);

      if (!result.ok || !result.data) {
        toast(result.error ?? "Erro ao exportar relatório.", "err");
        return;
      }

      if (result.data.length === 0) {
        toast("Nenhum dado encontrado para exportação.", "warn");
        return;
      }

      const filenames: Record<TipoRelatorio, string> = {
        alunos: "relatorio_alunos",
        pagamentos: "relatorio_pagamentos",
        inadimplencia: "relatorio_inadimplencia",
        professores: "relatorio_professores",
        auditoria: "relatorio_auditoria",
      };

      const filename = filenames[tipo];

      if (formato === "xlsx") {
        exportXLSX(filename, result.data);
      } else {
        exportCSV(filename, result.data);
      }

      toast(`Relatório exportado com sucesso (${result.data.length} registros).`, "ok");
    });
  }

  const cards: CardRelatorio[] = [
    {
      tipo: "alunos",
      titulo: "Base de Alunos",
      descricao: "Cadastro completo com status, plano, professor e dados de contato.",
      contagem: contagens.totalAlunos,
      icon: <IconUsers />,
    },
    {
      tipo: "pagamentos",
      titulo: "Lançamentos Financeiros",
      descricao: "Histórico de todos os pagamentos com status, competência e valores.",
      contagem: contagens.totalPagamentos,
      icon: <IconDollar />,
    },
    {
      tipo: "inadimplencia",
      titulo: "Inadimplência",
      descricao: "Pagamentos com status Atrasado com dados de contato do aluno.",
      contagem: contagens.totalInadimplentes,
      icon: <IconAlertCircle />,
    },
    {
      tipo: "professores",
      titulo: "Professores",
      descricao: "Cadastro de professores com quantidade de alunos vinculados.",
      contagem: contagens.totalProfessores,
      icon: <IconGradCap />,
    },
    ...(isAdmin
      ? [
          {
            tipo: "auditoria" as TipoRelatorio,
            titulo: "Trilha de Auditoria",
            descricao: "Registro completo de todas as ações realizadas no sistema.",
            contagem: contagens.totalAuditoria,
            icon: <IconShield />,
            adminOnly: true,
          },
        ]
      : []),
  ];

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Header */}
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "var(--ink)",
            }}
          >
            Relatórios
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "var(--muted)" }}>
            Exporte dados completos do sistema em XLSX ou CSV.
          </p>
        </div>

        {/* Grid de cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {cards.map((card) => (
            <RelatorioCard
              key={card.tipo}
              card={card}
              onExport={handleExport}
              isPendingTipo={isPending ? pendingTipo : null}
            />
          ))}
        </div>
      </div>
    </>
  );
}

