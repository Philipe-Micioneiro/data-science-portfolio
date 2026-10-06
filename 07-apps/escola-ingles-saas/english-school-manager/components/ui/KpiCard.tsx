"use client";

import type { ReactNode } from "react";

/**
 * KpiCard — card de KPI com ícone, valor, label e variação opcional.
 * onClick torna o card clicável (cursor pointer + hover shadow).
 * Replicado de ui.jsx → KpiCard.
 */

type Tone = "blue" | "green" | "red" | "amber" | "gray";

interface ToneConfig {
  c: string;
  bg: string;
}

const TONES: Record<Tone, ToneConfig> = {
  blue: { c: "var(--blue)", bg: "var(--blue-50)" },
  green: { c: "var(--green-text)", bg: "var(--green-bg)" },
  red: { c: "var(--red-text)", bg: "var(--red-bg)" },
  amber: { c: "var(--amber-text)", bg: "var(--amber-bg)" },
  gray: { c: "var(--muted)", bg: "var(--hover)" },
};

interface KpiCardProps {
  label: string;
  value: string | number;
  /** Nome do ícone SVG (renderizado via slot) */
  icon?: ReactNode;
  tone?: Tone;
  /** Variação percentual — positivo = verde, negativo = vermelho */
  delta?: number;
  /** Texto secundário abaixo do valor */
  sub?: string;
  onClick?: () => void;
  active?: boolean;
}

export default function KpiCard({
  label,
  value,
  icon,
  tone = "blue",
  delta,
  sub,
  onClick,
  active,
}: KpiCardProps) {
  const t = TONES[tone] ?? TONES.blue;

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === "Enter" || e.key === " ") && onClick() : undefined}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)",
        padding: 18,
        cursor: onClick ? "pointer" : "default",
        outline: active ? "2px solid var(--blue)" : "none",
        outlineOffset: 1,
        boxShadow: "var(--sh-sm)",
        transition: "box-shadow .14s, outline .1s",
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--sh)";
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--sh-sm)";
        }
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>{label}</span>
        {icon && (
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: t.bg,
              color: t.c,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 12 }}>
        <span
          style={{
            fontSize: 27,
            fontWeight: 600,
            letterSpacing: "-.02em",
            fontVariantNumeric: "tabular-nums",
            color: "var(--ink)",
          }}
        >
          {value}
        </span>
        {delta != null && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              fontSize: 12.5,
              fontWeight: 600,
              color: delta >= 0 ? "var(--green-text)" : "var(--red-text)",
            }}
          >
            {delta >= 0 ? "↑" : "↓"}{Math.abs(delta)}%
          </span>
        )}
      </div>
      {sub && (
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}
