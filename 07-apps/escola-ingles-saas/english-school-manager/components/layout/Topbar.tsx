"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";

/**
 * Topbar — barra de topo do layout autenticado.
 * Exibe nome e perfil do usuário, toggle dark mode e menu de usuário.
 * Ícone de sino REMOVIDO (SPEC §0.5).
 * Toggle dark mode: persiste em localStorage, muda data-theme no <html>.
 */

const ROLE_LABEL: Record<string, string> = {
  Administrador: "Administrador",
  Secretário: "Secretaria",
  Professor: "Professor",
};

interface TopbarProps {
  userName: string;
  userEmail: string;
  userPerfil: string;
  onToggleSidebar: () => void;
}

export default function Topbar({
  userName,
  userEmail,
  userPerfil,
  onToggleSidebar,
}: TopbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const menuRef = useRef<HTMLDivElement>(null);

  const [menuOpen, setMenuOpen] = useState(false);

  // Lazy initializer: lê localStorage/prefers-color-scheme apenas uma vez no mount.
  // Não usa setTheme dentro de useEffect — evita react-hooks/set-state-in-effect.
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  // Efeito colateral puro: persiste e aplica o tema ao DOM (sem setState).
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }

  // Fecha menu ao clicar fora
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.push("/login");
  }

  // Monta nome abreviado: "João S."
  const nameParts = userName.trim().split(/\s+/);
  const shortName =
    nameParts.length >= 2
      ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
      : nameParts[0];

  return (
    <header
      style={{
        height: 60,
        flexShrink: 0,
        background: "var(--surface)",
        borderBottom: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 22px",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Hamburger / toggle sidebar */}
      <button
        onClick={onToggleSidebar}
        style={{
          width: 36,
          height: 36,
          display: "grid",
          placeItems: "center",
          border: "none",
          background: "transparent",
          borderRadius: 8,
          color: "var(--ink-2)",
          cursor: "pointer",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--hover)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }}
        aria-label="Alternar menu lateral"
      >
        <Icon name="menu" size={18} />
      </button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Toggle dark mode — sem ícone de sino (SPEC §0.5) */}
      <button
        onClick={toggleTheme}
        title={theme === "dark" ? "Modo claro" : "Modo escuro"}
        style={{
          width: 36,
          height: 36,
          display: "grid",
          placeItems: "center",
          border: "none",
          background: "transparent",
          borderRadius: 8,
          color: "var(--ink-2)",
          cursor: "pointer",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--hover)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }}
        aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
      >
        <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
      </button>

      {/* User menu */}
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          onClick={() => setMenuOpen((m) => !m)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            height: 42,
            padding: "0 8px",
            border: "1px solid var(--line)",
            borderRadius: 99,
            background: "var(--surface)",
            boxShadow: "var(--sh-sm)",
            cursor: "pointer",
          }}
          aria-label="Menu do usuário"
          aria-expanded={menuOpen}
        >
          <Avatar name={userName} size="sm" />
          <div style={{ textAlign: "left", lineHeight: 1.12, marginRight: 2 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap" }}>
              {shortName}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>
              {ROLE_LABEL[userPerfil] ?? userPerfil}
            </div>
          </div>
          <Icon name="chevD" size={15} style={{ color: "var(--muted-2)" }} />
        </button>

        {menuOpen && (
          <div
            className="fade-in"
            style={{
              position: "absolute",
              right: 0,
              top: 50,
              width: 230,
              zIndex: 40,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-lg)",
              boxShadow: "var(--sh-lg)",
              overflow: "hidden",
            }}
          >
            {/* User info */}
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                gap: 11,
                alignItems: "center",
              }}
            >
              <Avatar name={userName} size="md" />
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 13.5,
                    color: "var(--ink)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {userName}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {userEmail}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding: 6 }}>
              {/* Minha conta */}
              <button
                onClick={() => { setMenuOpen(false); router.push("/conta"); }}
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
                <Icon name="user" size={16} />
                Minha conta
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
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
                  color: "var(--red-text)",
                  fontWeight: 500,
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--red-bg)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <Icon name="logout" size={16} />
                Sair da conta
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
