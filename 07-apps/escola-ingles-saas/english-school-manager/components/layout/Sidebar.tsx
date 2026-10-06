"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/ui/Icon";

/**
 * Sidebar — navegação autenticada com filtro por perfil.
 * NAV replicado de layout.jsx.
 * Badge de "Validações" com contagem real via Supabase + Realtime subscription.
 * Colapsável com estado persistido em localStorage.
 * Ícone de sino REMOVIDO (SPEC §0.5).
 */

interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badgeKey?: string;
}

// Mapeamento de id para rota Next.js
const ID_TO_HREF: Record<string, string> = {
  dashboard: "/dashboard",
  usuarios: "/usuarios",
  alunos: "/alunos",
  professores: "/professores",
  agenda: "/agenda",
  financeiro: "/financeiro",
  financeiroProf: "/financeiro-professores",
  validacoes: "/validacoes",
  auditoria: "/auditoria",
  relatorios: "/relatorios",
  config: "/configuracoes",
  conta: "/conta",
};

const NAV_RAW: Record<string, Array<{ id: string; label: string; icon: string; badgeKey?: string }>> = {
  Administrador: [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "usuarios", label: "Usuários", icon: "users" },
    { id: "alunos", label: "Alunos", icon: "graduation" },
    { id: "professores", label: "Professores", icon: "layers" },
    { id: "agenda", label: "Agenda", icon: "calendar" },
    { id: "financeiro", label: "Financeiro", icon: "wallet" },
    { id: "financeiroProf", label: "Financeiro Professores", icon: "briefcase" },
    { id: "validacoes", label: "Validações", icon: "receipt", badgeKey: "pendentes" },
    { id: "auditoria", label: "Auditoria", icon: "shield" },
    { id: "relatorios", label: "Relatórios", icon: "chart" },
    { id: "config", label: "Configurações", icon: "settings" },
  ],
  Secretário: [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "alunos", label: "Alunos", icon: "graduation" },
    { id: "professores", label: "Professores", icon: "layers" },
    { id: "agenda", label: "Agenda", icon: "calendar" },
    { id: "financeiro", label: "Pagamentos", icon: "wallet" },
    { id: "financeiroProf", label: "Financeiro Professores", icon: "briefcase" },
    { id: "validacoes", label: "Validações", icon: "receipt", badgeKey: "pendentes" },
  ],
  Professor: [
    { id: "dashboard", label: "Meus Alunos", icon: "graduation" },
    { id: "agenda", label: "Minha Agenda", icon: "calendar" },
    { id: "conta", label: "Minha Conta", icon: "user" },
  ],
};

interface SidebarProps {
  perfil: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const STORAGE_KEY = "sidebar_collapsed";

export default function Sidebar({ perfil, mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Estado colapsável persistido
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  const [pendingCount, setPendingCount] = useState(0);

  // Persiste collapsed em localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  // Carrega contagem inicial de validações pendentes e assina Realtime
  useEffect(() => {
    const canSeeBadge = perfil === "Administrador" || perfil === "Secretário";
    if (!canSeeBadge) return;

    // Query inicial
    async function fetchCount() {
      const { count } = await supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("status", "Pendente de Validação");
      setPendingCount(count ?? 0);
    }
    fetchCount();

    // Realtime subscription
    const channel = supabase
      .channel("payments-pending-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => {
          // Re-query ao receber qualquer mudança em payments
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [perfil]); // eslint-disable-line react-hooks/exhaustive-deps

  const rawItems = NAV_RAW[perfil] ?? NAV_RAW.Professor;
  const items: NavItem[] = rawItems.map((it) => ({
    ...it,
    href: ID_TO_HREF[it.id] ?? `/${it.id}`,
  }));

  function navigate(href: string) {
    router.push(href);
    // Em mobile fecha o menu ao navegar
    onMobileClose?.();
  }

  function handleLogout() {
    supabase.auth.signOut().then(() => router.push("/login"));
  }

  // Determina item ativo pelo pathname
  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  }

  const sidebar = (
    <aside
      style={{
        width: collapsed ? 68 : 248,
        flexShrink: 0,
        background: "var(--sidebar)",
        borderRight: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        transition: "width .18s ease",
        height: "100%",
        position: "relative",
        zIndex: 5,
        overflow: "hidden",
      }}
    >
      {/* Brand */}
      <div
        style={{
          height: 60,
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "0 18px",
          borderBottom: "1px solid var(--line)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: "var(--blue)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            boxShadow: "0 2px 6px rgba(37,99,235,.35)",
          }}
        >
          <Icon name="graduation" size={19} style={{ color: "#fff" }} />
        </div>
        {!collapsed && (
          <div style={{ lineHeight: 1.15, overflow: "hidden", minWidth: 0 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 14.5,
                letterSpacing: "-.01em",
                whiteSpace: "nowrap",
                color: "var(--ink)",
              }}
            >
              Smart
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", whiteSpace: "nowrap" }}>
              Talk
            </div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav
        style={{
          flex: 1,
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          overflowY: "auto",
        }}
      >
        {!collapsed && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--muted-2)",
              textTransform: "uppercase",
              letterSpacing: ".04em",
              padding: "6px 10px 4px",
            }}
          >
            Menu
          </div>
        )}
        {items.map((it) => {
          const active = isActive(it.href);
          const badge = it.badgeKey === "pendentes" ? pendingCount : 0;
          return (
            <button
              key={it.id}
              onClick={() => navigate(it.href)}
              title={collapsed ? it.label : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                height: 38,
                padding: collapsed ? "0" : "0 11px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: 9,
                border: "none",
                width: "100%",
                textAlign: "left",
                background: active ? "var(--blue-50)" : "transparent",
                color: active ? "var(--blue)" : "var(--ink-2)",
                fontWeight: active ? 600 : 500,
                fontSize: 14,
                position: "relative",
                transition: "background .12s, color .12s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                if (!active)
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--hover)";
              }}
              onMouseLeave={(e) => {
                if (!active)
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <Icon
                name={it.icon}
                size={18}
                strokeWidth={active ? 2.2 : 2}
              />
              {!collapsed && (
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {it.label}
                </span>
              )}
              {/* Badge expandido */}
              {!collapsed && badge > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    minWidth: 20,
                    height: 20,
                    padding: "0 6px",
                    borderRadius: 99,
                    background: "var(--amber)",
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
              {/* Badge colapsado (dot) */}
              {collapsed && badge > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 10,
                    width: 8,
                    height: 8,
                    borderRadius: 99,
                    background: "var(--amber)",
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer: collapse toggle + logout */}
      <div style={{ padding: 12, borderTop: "1px solid var(--line)", flexShrink: 0 }}>
        {/* Toggle collapse */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            height: 38,
            padding: collapsed ? 0 : "0 11px",
            justifyContent: collapsed ? "center" : "flex-start",
            borderRadius: 9,
            border: "none",
            width: "100%",
            background: "transparent",
            color: "var(--muted-2)",
            fontWeight: 500,
            fontSize: 14,
            cursor: "pointer",
            marginBottom: 2,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--hover)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          }}
        >
          <Icon name={collapsed ? "chevR" : "chevL"} size={18} />
          {!collapsed && <span>Recolher</span>}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Sair"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            height: 38,
            padding: collapsed ? 0 : "0 11px",
            justifyContent: collapsed ? "center" : "flex-start",
            borderRadius: 9,
            border: "none",
            width: "100%",
            background: "transparent",
            color: "var(--muted)",
            fontWeight: 500,
            fontSize: 14,
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--red-bg)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--red-text)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
          }}
        >
          <Icon name="logout" size={18} />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex" style={{ height: "100%" }}>
        {sidebar}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
          }}
        >
          {/* Backdrop */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(15,23,42,.4)",
            }}
            onClick={onMobileClose}
          />
          {/* Sidebar panel */}
          <div
            className="fade-in"
            style={{
              position: "relative",
              zIndex: 1,
              height: "100%",
              width: 248,
            }}
          >
            {/* Forçar expandido no mobile */}
            <aside
              style={{
                width: 248,
                background: "var(--sidebar)",
                borderRight: "1px solid var(--line)",
                display: "flex",
                flexDirection: "column",
                height: "100%",
                overflow: "hidden",
              }}
            >
              {/* Brand */}
              <div
                style={{
                  height: 60,
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "0 18px",
                  borderBottom: "1px solid var(--line)",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: "var(--blue)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    boxShadow: "0 2px 6px rgba(37,99,235,.35)",
                  }}
                >
                  <Icon name="graduation" size={19} style={{ color: "#fff" }} />
                </div>
                <div style={{ lineHeight: 1.15, overflow: "hidden", minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14.5,
                      letterSpacing: "-.01em",
                      whiteSpace: "nowrap",
                      color: "var(--ink)",
                    }}
                  >
                    Smart
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Talk</div>
                </div>
              </div>
              {/* Nav */}
              <nav style={{ flex: 1, padding: "12px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: ".04em", padding: "6px 10px 4px" }}>
                  Menu
                </div>
                {items.map((it) => {
                  const active = isActive(it.href);
                  const badge = it.badgeKey === "pendentes" ? pendingCount : 0;
                  return (
                    <button
                      key={it.id}
                      onClick={() => navigate(it.href)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 11,
                        height: 38,
                        padding: "0 11px",
                        borderRadius: 9,
                        border: "none",
                        width: "100%",
                        textAlign: "left",
                        background: active ? "var(--blue-50)" : "transparent",
                        color: active ? "var(--blue)" : "var(--ink-2)",
                        fontWeight: active ? 600 : 500,
                        fontSize: 14,
                        position: "relative",
                        cursor: "pointer",
                      }}
                    >
                      <Icon name={it.icon} size={18} strokeWidth={active ? 2.2 : 2} />
                      <span style={{ flex: 1 }}>{it.label}</span>
                      {badge > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 700, minWidth: 20, height: 20, padding: "0 6px", borderRadius: 99, background: "var(--amber)", color: "#fff", display: "grid", placeItems: "center" }}>
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
              <div style={{ padding: 12, borderTop: "1px solid var(--line)", flexShrink: 0 }}>
                <button
                  onClick={handleLogout}
                  style={{
                    display: "flex", alignItems: "center", gap: 11, height: 38,
                    padding: "0 11px", borderRadius: 9, border: "none", width: "100%",
                    background: "transparent", color: "var(--muted)", fontWeight: 500,
                    fontSize: 14, cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--red-bg)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--red-text)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
                  }}
                >
                  <Icon name="logout" size={18} />
                  <span>Sair</span>
                </button>
              </div>
            </aside>
          </div>
        </div>
      )}
    </>
  );
}
