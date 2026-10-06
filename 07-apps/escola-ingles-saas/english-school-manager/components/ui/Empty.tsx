"use client";

import type { ReactNode } from "react";

/**
 * Empty — estado vazio genérico com ícone, título, descrição e ação opcional.
 * Replicado de ui.jsx → Empty.
 */

interface EmptyProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

// Ícone padrão: inbox
const DefaultIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x="1" y="3" width="22" height="5" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
);

export default function Empty({
  icon,
  title,
  description,
  action,
}: EmptyProps) {
  return (
    <div
      style={{
        padding: "56px 20px",
        textAlign: "center",
        color: "var(--muted)",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: "var(--hover)",
          display: "grid",
          placeItems: "center",
          margin: "0 auto 14px",
          color: "var(--muted-2)",
        }}
      >
        {icon ?? <DefaultIcon />}
      </div>
      <div
        style={{
          fontWeight: 600,
          color: "var(--ink-2)",
          fontSize: 15,
          marginBottom: description ? 4 : action ? 16 : 0,
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: 13.5,
            color: "var(--muted)",
            marginBottom: action ? 16 : 0,
          }}
        >
          {description}
        </div>
      )}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
