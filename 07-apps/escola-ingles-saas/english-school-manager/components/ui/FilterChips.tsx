"use client";

/**
 * FilterChips — chips selecionáveis com badge de contagem opcional.
 * Replicado de ui.jsx → FilterChips.
 */

interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

interface FilterChipsProps {
  options: FilterOption[];
  value: string;
  onChange: (v: string) => void;
  /** Mapa de contagens por valor (alternativa ao count inline na option) */
  counts?: Record<string, number>;
}

export default function FilterChips({
  options,
  value,
  onChange,
  counts,
}: FilterChipsProps) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((o) => {
        const on = value === o.value;
        const count = o.count ?? counts?.[o.value];
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              height: 32,
              padding: "0 12px",
              borderRadius: 99,
              fontSize: 13,
              fontWeight: 500,
              border: "1px solid " + (on ? "var(--blue)" : "var(--line-2)"),
              background: on ? "var(--blue)" : "var(--surface)",
              color: on ? "#fff" : "var(--ink-2)",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              boxShadow: on ? "none" : "var(--sh-sm)",
              transition: "all .12s",
              cursor: "pointer",
            }}
          >
            {o.label}
            {count != null && (
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: "1px 6px",
                  borderRadius: 99,
                  background: on ? "rgba(255,255,255,.22)" : "var(--hover)",
                  color: on ? "#fff" : "var(--muted)",
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
