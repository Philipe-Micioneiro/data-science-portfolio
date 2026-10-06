"use client";

/**
 * Avatar — exibe iniciais com cor determinística por nome.
 * Lógica de cor replicada de ui.jsx → avColor().
 */

const AV_COLORS = [
  "#2563EB",
  "#7C3AED",
  "#0EA5E9",
  "#059669",
  "#D97706",
  "#DB2777",
  "#4F46E5",
  "#0891B2",
  "#CA8A04",
  "#DC2626",
];

export function avColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h * 31 + seed.charCodeAt(i)) >>> 0);
  }
  return AV_COLORS[h % AV_COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

const SIZE_STYLES: Record<string, React.CSSProperties> = {
  sm: { width: 28, height: 28, fontSize: 11, borderRadius: 99 },
  md: { width: 36, height: 36, fontSize: 13, borderRadius: 99 },
  lg: { width: 48, height: 48, fontSize: 17, borderRadius: 99 },
};

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  color?: string;
}

export default function Avatar({ name, size = "md", color }: AvatarProps) {
  const bg = color ?? avColor(name);
  const sizeStyle = SIZE_STYLES[size] ?? SIZE_STYLES.md;
  return (
    <span
      style={{
        ...sizeStyle,
        background: bg,
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        letterSpacing: "-.01em",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {initials(name)}
    </span>
  );
}
