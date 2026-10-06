"use client";

/**
 * PerfilBadge — exibe badge de perfil de usuário com cor por tipo.
 * Administrador = azul, Secretário = cinza, Professor = verde.
 */

type Perfil = "Administrador" | "Secretário" | "Professor";

interface PerfilConfig {
  bg: string;
  text: string;
  label: string;
}

const PERFIL_MAP: Record<Perfil, PerfilConfig> = {
  Administrador: {
    bg: "var(--blue-50)",
    text: "var(--blue)",
    label: "Administrador",
  },
  Secretário: {
    bg: "var(--hover)",
    text: "var(--muted)",
    label: "Secretária",
  },
  Professor: {
    bg: "var(--green-bg)",
    text: "var(--green-text)",
    label: "Professor",
  },
};

interface PerfilBadgeProps {
  perfil: Perfil | string;
}

export default function PerfilBadge({ perfil }: PerfilBadgeProps) {
  const cfg = PERFIL_MAP[perfil as Perfil] ?? {
    bg: "var(--hover)",
    text: "var(--muted)",
    label: perfil,
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 9px",
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.text,
        lineHeight: 1.4,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}
