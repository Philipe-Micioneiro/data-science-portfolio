"use client";

import type { ReactNode } from "react";
import CardHead from "@/components/ui/CardHead";
import Empty from "@/components/ui/Empty";
import Icon from "@/components/ui/Icon";

/**
 * ListWidget — card genérico de lista com título, subtítulo e linhas.
 * Replicado de screens-dashboard.jsx → ListWidget.
 * Cada linha possui slot esquerdo, título, subtítulo e slot direito.
 */

export interface ListRow {
  left?: ReactNode;
  title: string;
  sub?: string;
  right?: ReactNode;
  onClick?: () => void;
}

interface ListWidgetProps {
  title: string;
  sub?: string;
  rows: ListRow[];
  onSeeAll?: () => void;
  footer?: ReactNode;
}

export default function ListWidget({
  title,
  sub,
  rows,
  onSeeAll,
  footer,
}: ListWidgetProps) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--sh-sm)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardHead
        title={title}
        sub={sub}
        action={
          onSeeAll ? (
            <button
              onClick={onSeeAll}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--blue)",
                fontSize: 13,
                fontWeight: 500,
                padding: "4px 6px",
                borderRadius: "var(--r-sm)",
              }}
            >
              Ver tudo
              <Icon name="chevR" size={13} />
            </button>
          ) : undefined
        }
      />
      <div style={{ flex: 1 }}>
        {rows.length === 0 ? (
          <Empty title="Nada por aqui" description="Sem itens no momento." />
        ) : (
          rows.map((r, i) => (
            <div
              key={i}
              onClick={r.onClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 18px",
                borderBottom:
                  i < rows.length - 1 ? "1px solid var(--line)" : "none",
                cursor: r.onClick ? "pointer" : "default",
              }}
              onMouseEnter={(e) => {
                if (r.onClick) {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "var(--hover)";
                }
              }}
              onMouseLeave={(e) => {
                if (r.onClick) {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "transparent";
                }
              }}
            >
              {r.left}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 500,
                    color: "var(--ink)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.title}
                </div>
                {r.sub && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.sub}
                  </div>
                )}
              </div>
              {r.right}
            </div>
          ))
        )}
      </div>
      {footer}
    </div>
  );
}
