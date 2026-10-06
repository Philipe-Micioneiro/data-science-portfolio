"use client";

import type { ReactNode } from "react";

/**
 * CardHead — header de card com título, subtítulo e slot de ação.
 * Replicado de ui.jsx → CardHead.
 */

interface CardHeadProps {
  title: string;
  sub?: string;
  action?: ReactNode;
}

export default function CardHead({ title, sub, action }: CardHeadProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 18px",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div>
        <div
          style={{
            fontWeight: 600,
            fontSize: 15,
            color: "var(--ink)",
          }}
        >
          {title}
        </div>
        {sub && (
          <div
            style={{
              fontSize: 12.5,
              color: "var(--muted)",
              marginTop: 2,
            }}
          >
            {sub}
          </div>
        )}
      </div>
      {action}
    </div>
  );
}
