"use client";

import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";

/**
 * ExportMenu — dropdown com exportação XLSX e CSV.
 * Lógica de exportação replicada de ui.jsx → exportCSV / exportXLSX.
 * Usa a lib xlsx para XLSX real (ao invés do SpreadsheetML do design).
 */

interface ExportColumn {
  label: string;
  key: string;
}

interface ExportMenuProps {
  data: Record<string, unknown>[];
  filename: string;
  /** Colunas para exportação. Se omitido, usa todas as chaves do primeiro registro. */
  columns?: ExportColumn[];
  label?: string;
  /** Callback disparado após download real — use para audit log ou analytics. */
  onExport?: (type: "xlsx" | "csv") => void;
}

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

function exportCSV(filename: string, cols: ExportColumn[], rows: Record<string, unknown>[]) {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [cols.map((c) => esc(c.label)).join(";")];
  rows.forEach((r) => lines.push(cols.map((c) => esc(r[c.key])).join(";")));
  downloadBlob(filename + ".csv", "﻿" + lines.join("\n"), "text/csv;charset=utf-8;");
}

function exportXLSX(filename: string, cols: ExportColumn[], rows: Record<string, unknown>[]) {
  const wsData = [
    cols.map((c) => c.label),
    ...rows.map((r) => cols.map((c) => r[c.key] ?? "")),
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  XLSX.writeFile(wb, filename + ".xlsx");
}

export default function ExportMenu({
  data,
  filename,
  columns,
  label = "Exportar",
  onExport,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function getCols(): ExportColumn[] {
    if (columns && columns.length > 0) return columns;
    if (data.length === 0) return [];
    return Object.keys(data[0]).map((k) => ({ label: k, key: k }));
  }

  function handle(type: "xlsx" | "csv") {
    setOpen(false);
    const cols = getCols();
    if (type === "xlsx") {
      exportXLSX(filename, cols, data);
    } else {
      exportCSV(filename, cols, data);
    }
    onExport?.(type);
  }

  const actions: Array<{ type: "xlsx" | "csv"; icon: React.ReactNode; label: string }> = [
    {
      type: "xlsx",
      label: "Exportar XLSX",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
        </svg>
      ),
    },
    {
      type: "csv",
      label: "Exportar CSV",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
        </svg>
      ),
    },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: 34,
          padding: "0 12px",
          border: "1px solid var(--line-2)",
          borderRadius: "var(--r)",
          background: "var(--surface)",
          color: "var(--ink-2)",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          boxShadow: "var(--sh-sm)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--hover)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)";
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {label}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="fade-in"
          style={{
            position: "absolute",
            right: 0,
            top: 42,
            width: 184,
            zIndex: 30,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg)",
            boxShadow: "var(--sh-lg)",
            padding: 5,
          }}
        >
          {actions.map((a) => (
            <button
              key={a.type}
              onClick={() => handle(a.type)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                border: "none",
                background: "transparent",
                borderRadius: 8,
                fontSize: 13.5,
                color: "var(--ink-2)",
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
