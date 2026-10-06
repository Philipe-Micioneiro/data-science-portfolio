"use client";

import { useState, useMemo, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import ExportMenu from "@/components/ui/ExportMenu";
import { useToast } from "@/components/ui/Toast";
import { registrarExportacaoAuditoriaAction } from "@/app/(app)/auditoria/actions";
import type { LogRow, UsuarioOpcao } from "@/app/(app)/auditoria/page";

// ─────────────────────────────────────────────────────────────────────────────
// Ícones inline
// ─────────────────────────────────────────────────────────────────────────────

function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconChevDown({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconChevUp({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function IconSearch({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconFilter({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function IconCode({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Entidades únicas para o select de filtro
// ─────────────────────────────────────────────────────────────────────────────

const ENTIDADES_CONHECIDAS = [
  "Aluno",
  "Financeiro",
  "Usuário",
  "Professor",
  "Agenda",
  "Sistema",
];

// ─────────────────────────────────────────────────────────────────────────────
// DetalhesModal — exibe dados_antes / dados_depois em JSON
// ─────────────────────────────────────────────────────────────────────────────

function DetalhesModal({
  log,
  onClose,
}: {
  log: LogRow;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15,23,42,0.45)",
        padding: "20px 16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="fade-in"
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "80vh",
          overflowY: "auto",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--sh-lg)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: "var(--ink)" }}>
              Detalhes do registro
            </div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>
              {formatDateTime(log.criado_em)} · {log.acao}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: "var(--muted-2)",
              cursor: "pointer",
              padding: 4,
              borderRadius: 6,
              lineHeight: 1,
              fontSize: 20,
              flexShrink: 0,
            }}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* Meta */}
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <tbody>
            {[
              ["Usuário", log.usuario_nome ?? log.usuario_id ?? "Sistema"],
              ["Perfil", log.perfil ?? "—"],
              ["Entidade", log.entidade ?? "—"],
              ["ID Entidade", log.entidade_id ?? "—"],
              ["IP", log.ip ?? "—"],
            ].map(([label, value]) => (
              <tr key={label} style={{ borderBottom: "1px solid var(--line)" }}>
                <td
                  style={{
                    padding: "7px 0",
                    color: "var(--muted)",
                    fontWeight: 500,
                    width: "38%",
                    verticalAlign: "top",
                  }}
                >
                  {label}
                </td>
                <td
                  style={{
                    padding: "7px 0 7px 8px",
                    color: "var(--ink-2)",
                    wordBreak: "break-all",
                  }}
                >
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* dados_antes */}
        {log.dados_antes && (
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--muted)",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Dados Antes
            </div>
            <pre
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r)",
                padding: "12px 14px",
                fontSize: 12,
                color: "var(--ink-2)",
                overflowX: "auto",
                margin: 0,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {JSON.stringify(log.dados_antes, null, 2)}
            </pre>
          </div>
        )}

        {/* dados_depois */}
        {log.dados_depois && (
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--muted)",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Dados Depois
            </div>
            <pre
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r)",
                padding: "12px 14px",
                fontSize: 12,
                color: "var(--ink-2)",
                overflowX: "auto",
                margin: 0,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {JSON.stringify(log.dados_depois, null, 2)}
            </pre>
          </div>
        )}

        {!log.dados_antes && !log.dados_depois && (
          <div style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: "8px 0" }}>
            Sem dados adicionais neste registro.
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface AuditoriaClientProps {
  logs: LogRow[];
  usuarios: UsuarioOpcao[];
  initialFilters: {
    usuario?: string;
    acao?: string;
    entidade?: string;
    de?: string;
    ate?: string;
    q?: string;
    ip?: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AuditoriaClient
// ─────────────────────────────────────────────────────────────────────────────

export default function AuditoriaClient({
  logs,
  usuarios,
  initialFilters,
}: AuditoriaClientProps) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filtros: estado local para feedback visual imediato; mudanças são
  // propagadas à URL para acionar re-fetch server-side com LIMIT 500.
  const [filterUsuario, setFilterUsuario] = useState(
    () => initialFilters.usuario ?? "todos"
  );
  const [filterAcao, setFilterAcao] = useState(() => initialFilters.acao ?? "");
  const [filterEntidade, setFilterEntidade] = useState(
    () => initialFilters.entidade ?? "todas"
  );
  const [filterQ, setFilterQ] = useState(() => initialFilters.q ?? "");

  // Modal de detalhes
  const [detalhesLog, setDetalhesLog] = useState<LogRow | null>(null);

  // Constrói e empurra URL com os filtros atuais + sobreescrita pontual
  function pushFilters(patch: {
    usuario?: string;
    acao?: string;
    entidade?: string;
    q?: string;
  }) {
    const merged = {
      usuario: patch.usuario ?? filterUsuario,
      acao: patch.acao ?? filterAcao,
      entidade: patch.entidade ?? filterEntidade,
      q: patch.q ?? filterQ,
    };
    const p = new URLSearchParams();
    if (merged.usuario && merged.usuario !== "todos") p.set("usuario", merged.usuario);
    if (merged.acao) p.set("acao", merged.acao);
    if (merged.entidade && merged.entidade !== "todas") p.set("entidade", merged.entidade);
    if (merged.q) p.set("q", merged.q);
    router.push("?" + p.toString());
  }

  function handleUsuarioChange(val: string) {
    setFilterUsuario(val);
    pushFilters({ usuario: val });
  }

  function handleEntidadeChange(val: string) {
    setFilterEntidade(val);
    pushFilters({ entidade: val });
  }

  function handleAcaoChange(val: string) {
    setFilterAcao(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushFilters({ acao: val }), 400);
  }

  function handleQChange(val: string) {
    setFilterQ(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushFilters({ q: val }), 400);
  }

  // Filtrar logs client-side (resultado já é pré-filtrado server-side)
  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filterUsuario !== "todos" && l.usuario_id !== filterUsuario) return false;
      if (filterAcao && !l.acao.toLowerCase().includes(filterAcao.toLowerCase())) return false;
      if (filterEntidade !== "todas" && l.entidade !== filterEntidade) return false;
      if (filterQ) {
        const q = filterQ.toLowerCase();
        const haystack = [
          l.acao,
          l.entidade ?? "",
          l.usuario_nome ?? "",
          l.perfil ?? "",
          l.ip ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [logs, filterUsuario, filterAcao, filterEntidade, filterQ]);

  // Dados para exportação
  const exportColumns = [
    { label: "Data/Hora", key: "criado_em_fmt" },
    { label: "Usuário", key: "usuario_nome" },
    { label: "Perfil", key: "perfil" },
    { label: "Ação", key: "acao" },
    { label: "Entidade", key: "entidade" },
    { label: "ID Entidade", key: "entidade_id" },
    { label: "IP", key: "ip" },
    { label: "Dados Antes", key: "dados_antes_str" },
    { label: "Dados Depois", key: "dados_depois_str" },
  ];

  const exportData = useMemo(
    () =>
      filtered.map((l) => ({
        criado_em_fmt: formatDateTime(l.criado_em),
        usuario_nome: l.usuario_nome ?? l.usuario_id ?? "Sistema",
        perfil: l.perfil ?? "",
        acao: l.acao,
        entidade: l.entidade ?? "",
        entidade_id: l.entidade_id ?? "",
        ip: l.ip ?? "",
        dados_antes_str: l.dados_antes ? JSON.stringify(l.dados_antes) : "",
        dados_depois_str: l.dados_depois ? JSON.stringify(l.dados_depois) : "",
      })),
    [filtered]
  );

  function handleExport(type: "xlsx" | "csv") {
    startTransition(async () => {
      await registrarExportacaoAuditoriaAction(type, filtered.length);
      toast(`Exportação ${type.toUpperCase()} registrada.`, "ok");
    });
  }

  const hasActiveFilters =
    filterUsuario !== "todos" ||
    filterAcao !== "" ||
    filterEntidade !== "todas" ||
    filterQ !== "";

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "var(--blue-50)",
              display: "grid",
              placeItems: "center",
              color: "var(--blue)",
            }}
          >
            <IconShield />
          </div>
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
              Trilha de Auditoria
            </h1>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 1 }}>
              {filtered.length} de {logs.length} registros
            </div>
          </div>
        </div>

        <ExportMenu
          data={exportData}
          filename="auditoria"
          columns={exportColumns}
          label="Exportar"
          onExport={handleExport}
        />
      </div>

      {/* Filtros */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg)",
          padding: "16px 18px",
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12.5,
            fontWeight: 600,
            color: "var(--muted)",
            marginRight: 4,
            alignSelf: "center",
          }}
        >
          <IconFilter />
          Filtros
        </div>

        {/* Busca livre */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 200px", minWidth: 180 }}>
          <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Busca livre
          </label>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 9,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted-2)",
                display: "flex",
              }}
            >
              <IconSearch size={14} />
            </span>
            <input
              type="text"
              value={filterQ}
              onChange={(e) => handleQChange(e.target.value)}
              placeholder="Ação, entidade, usuário…"
              style={{
                width: "100%",
                height: 34,
                paddingLeft: 28,
                paddingRight: 10,
                border: "1px solid var(--line-2)",
                borderRadius: "var(--r)",
                background: "var(--surface)",
                color: "var(--ink)",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Filtro usuário */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 160px", minWidth: 140 }}>
          <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Usuário
          </label>
          <select
            value={filterUsuario}
            onChange={(e) => handleUsuarioChange(e.target.value)}
            style={{
              height: 34,
              padding: "0 10px",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--r)",
              background: "var(--surface)",
              color: "var(--ink)",
              fontSize: 13,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="todos">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro ação */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 160px", minWidth: 140 }}>
          <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Ação
          </label>
          <input
            type="text"
            value={filterAcao}
            onChange={(e) => handleAcaoChange(e.target.value)}
            placeholder="Ex: Aluno criado"
            style={{
              height: 34,
              padding: "0 10px",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--r)",
              background: "var(--surface)",
              color: "var(--ink)",
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>

        {/* Filtro entidade */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 140px", minWidth: 120 }}>
          <label style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Entidade
          </label>
          <select
            value={filterEntidade}
            onChange={(e) => handleEntidadeChange(e.target.value)}
            style={{
              height: 34,
              padding: "0 10px",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--r)",
              background: "var(--surface)",
              color: "var(--ink)",
              fontSize: 13,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="todas">Todas</option>
            {ENTIDADES_CONHECIDAS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>

        {/* Limpar filtros */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              setFilterUsuario("todos");
              setFilterAcao("");
              setFilterEntidade("todas");
              setFilterQ("");
              router.push("?");
            }}
            style={{
              height: 34,
              padding: "0 12px",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--r)",
              background: "transparent",
              color: "var(--muted)",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
              alignSelf: "flex-end",
            }}
          >
            Limpar
          </button>
        )}
      </div>

      {/* Tabela */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg)",
          overflow: "hidden",
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--muted)",
              fontSize: 14,
            }}
          >
            Nenhum registro encontrado com os filtros aplicados.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  {["Data/Hora", "Usuário", "Perfil", "Ação", "Entidade", "IP", ""].map(
                    (col) => (
                      <th
                        key={col}
                        style={{
                          padding: "11px 14px",
                          textAlign: "left",
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          background: "var(--surface-2)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, idx) => (
                  <AuditoriaRow
                    key={log.id}
                    log={log}
                    isEven={idx % 2 === 0}
                    onDetalhes={() => setDetalhesLog(log)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de detalhes */}
      {detalhesLog && (
        <DetalhesModal log={detalhesLog} onClose={() => setDetalhesLog(null)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AuditoriaRow
// ─────────────────────────────────────────────────────────────────────────────

function AuditoriaRow({
  log,
  isEven,
  onDetalhes,
}: {
  log: LogRow;
  isEven: boolean;
  onDetalhes: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = !!(log.dados_antes || log.dados_depois);

  return (
    <tr
      style={{
        background: isEven ? "var(--surface)" : "var(--surface-2)",
        borderBottom: "1px solid var(--line)",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.background = "var(--hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLTableRowElement).style.background = isEven
          ? "var(--surface)"
          : "var(--surface-2)";
      }}
    >
      {/* Data/Hora */}
      <td
        style={{
          padding: "10px 14px",
          whiteSpace: "nowrap",
          color: "var(--muted)",
          fontSize: 12.5,
        }}
      >
        {formatDateTime(log.criado_em)}
      </td>

      {/* Usuário */}
      <td style={{ padding: "10px 14px", color: "var(--ink-2)", fontWeight: 500 }}>
        {log.usuario_nome ?? <span style={{ color: "var(--muted)" }}>Sistema</span>}
      </td>

      {/* Perfil */}
      <td style={{ padding: "10px 14px" }}>
        {log.perfil ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 8px",
              borderRadius: 99,
              fontSize: 11.5,
              fontWeight: 600,
              background:
                log.perfil === "Administrador"
                  ? "var(--blue-50)"
                  : log.perfil === "Secretário"
                  ? "var(--hover)"
                  : log.perfil === "Professor"
                  ? "var(--green-bg)"
                  : "var(--surface-2)",
              color:
                log.perfil === "Administrador"
                  ? "var(--blue)"
                  : log.perfil === "Secretário"
                  ? "var(--ink-2)"
                  : log.perfil === "Professor"
                  ? "var(--green-text)"
                  : "var(--muted)",
            }}
          >
            {log.perfil}
          </span>
        ) : (
          <span style={{ color: "var(--muted-2)" }}>—</span>
        )}
      </td>

      {/* Ação */}
      <td style={{ padding: "10px 14px", color: "var(--ink)", fontWeight: 500 }}>
        {log.acao}
      </td>

      {/* Entidade */}
      <td style={{ padding: "10px 14px", color: "var(--ink-2)" }}>
        {log.entidade ?? <span style={{ color: "var(--muted-2)" }}>—</span>}
      </td>

      {/* IP */}
      <td
        style={{
          padding: "10px 14px",
          color: "var(--muted)",
          fontSize: 12,
          whiteSpace: "nowrap",
        }}
      >
        {log.ip ?? "—"}
      </td>

      {/* Detalhes */}
      <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
        {hasDetails ? (
          <button
            onClick={() => {
              setExpanded((v) => !v);
              onDetalhes();
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              height: 28,
              padding: "0 10px",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--r-sm)",
              background: "var(--surface)",
              color: "var(--muted)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
            title="Ver dados antes/depois"
          >
            <IconCode size={13} />
            Ver
            {expanded ? <IconChevUp size={12} /> : <IconChevDown size={12} />}
          </button>
        ) : (
          <span style={{ color: "var(--muted-2)", fontSize: 12 }}>—</span>
        )}
      </td>
    </tr>
  );
}
