"use client";

/**
 * StatusBadge — exibe status de aluno ou pagamento com cor semântica.
 * Estados: Ativo (verde), Atrasado (âmbar), Pendente de Validação (azul), Inativo (cinza), Pago (verde).
 *
 * Nota: O design original usa "Atrasado" com badge-red mas o PRD define âmbar para estado
 * intermediário. Seguindo os tokens do design (badge classes) conforme ui.jsx.
 */

type StatusKey =
  | "Ativo"
  | "Atrasado"
  | "Pendente de Validação"
  | "Inativo"
  | "Pago";

interface StatusConfig {
  dot: string;
  bg: string;
  text: string;
  border: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  Ativo: {
    dot: "var(--green-text)",
    bg: "var(--green-bg)",
    text: "var(--green-text)",
    border: "transparent",
  },
  Atrasado: {
    dot: "var(--amber-text)",
    bg: "var(--amber-bg)",
    text: "var(--amber-text)",
    border: "transparent",
  },
  "Pendente de Validação": {
    dot: "var(--blue)",
    bg: "var(--blue-50)",
    text: "var(--blue)",
    border: "transparent",
  },
  Inativo: {
    dot: "var(--muted)",
    bg: "var(--hover)",
    text: "var(--muted)",
    border: "transparent",
  },
  Pago: {
    dot: "var(--green-text)",
    bg: "var(--green-bg)",
    text: "var(--green-text)",
    border: "transparent",
  },
};

const FALLBACK: StatusConfig = {
  dot: "var(--muted)",
  bg: "var(--hover)",
  text: "var(--muted)",
  border: "transparent",
};

interface StatusBadgeProps {
  status: string;
  /** Exibe "Pendente" ao invés de "Pendente de Validação" */
  short?: boolean;
}

export default function StatusBadge({ status, short }: StatusBadgeProps) {
  const cfg = STATUS_MAP[status as StatusKey] ?? FALLBACK;
  const label =
    short && status === "Pendente de Validação" ? "Pendente" : status;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 9px",
        borderRadius: 99,
        fontSize: 12.5,
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.text,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 99,
          background: cfg.dot,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}
