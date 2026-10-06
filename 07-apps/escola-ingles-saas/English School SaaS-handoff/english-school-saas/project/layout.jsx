/* ============================================================
   Layout — Sidebar, Topbar, AppShell
   ============================================================ */

/* Nav config per perfil */
const NAV = {
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
  "Secretário": [
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

function Sidebar({ user, route, onNav, pendingCount, collapsed, onToggle }) {
  const items = NAV[user.perfil] || [];
  return (
    <aside style={{
      width: collapsed ? 68 : 248, flex: "none", background: "var(--sidebar)",
      borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column",
      transition: "width .18s ease", height: "100%", position: "relative", zIndex: 5
    }}>
      {/* Brand */}
      <div style={{ height: 60, display: "flex", alignItems: "center", gap: 11, padding: collapsed ? "0 18px" : "0 18px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--blue)", display: "grid", placeItems: "center", flex: "none",
          boxShadow: "0 2px 6px rgba(37,99,235,.35)" }}>
          <Icon name="graduation" size={19} style={{ color: "#fff" }} />
        </div>
        {!collapsed && (
          <div style={{ lineHeight: 1.15, overflow: "hidden" }}>
            <div style={{ fontWeight: 700, fontSize: 14.5, letterSpacing: "-.01em", whiteSpace: "nowrap" }}>English School</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", whiteSpace: "nowrap" }}>Manager</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 12px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
        {!collapsed && <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-2)", textTransform: "uppercase", letterSpacing: ".04em", padding: "6px 10px 4px" }}>Menu</div>}
        {items.map(it => {
          const active = route === it.id;
          const badge = it.badgeKey === "pendentes" ? pendingCount : 0;
          return (
            <button key={it.id} onClick={() => onNav(it.id)} title={collapsed ? it.label : undefined}
              style={{
                display: "flex", alignItems: "center", gap: 11, height: 38, padding: collapsed ? "0" : "0 11px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: 9, border: "none", width: "100%", textAlign: "left",
                background: active ? "var(--blue-50)" : "transparent",
                color: active ? "var(--blue)" : "var(--ink-2)",
                fontWeight: active ? 600 : 500, fontSize: 14, position: "relative", transition: "background .12s, color .12s"
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--hover)"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
              <Icon name={it.icon} size={18} strokeWidth={active ? 2.2 : 2} />
              {!collapsed && <span style={{ flex: 1 }}>{it.label}</span>}
              {!collapsed && badge > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, minWidth: 20, height: 20, padding: "0 6px", borderRadius: 99,
                  background: "var(--amber)", color: "#fff", display: "grid", placeItems: "center" }}>{badge}</span>
              )}
              {collapsed && badge > 0 && (
                <span style={{ position: "absolute", top: 6, right: 10, width: 8, height: 8, borderRadius: 99, background: "var(--amber)" }}></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / logout */}
      <div style={{ padding: 12, borderTop: "1px solid var(--line)" }}>
        <button onClick={() => onNav("__logout")} title="Sair"
          style={{ display: "flex", alignItems: "center", gap: 11, height: 38, padding: collapsed ? 0 : "0 11px",
            justifyContent: collapsed ? "center" : "flex-start",
            borderRadius: 9, border: "none", width: "100%", background: "transparent", color: "var(--muted)", fontWeight: 500, fontSize: 14 }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--red-bg)"; e.currentTarget.style.color = "var(--red-text)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted)"; }}>
          <Icon name="logout" size={18} />{!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}

const ROLE_LABEL = { Administrador: "Administrador", "Secretário": "Secretaria", Professor: "Professor" };

function Topbar({ user, title, sub, onToggleSidebar, onLogout, theme, onToggleTheme }) {
  const [menu, setMenu] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = e => ref.current && !ref.current.contains(e.target) && setMenu(false);
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <header style={{ height: 60, flex: "none", background: "var(--surface)", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 14, padding: "0 22px", position: "sticky", top: 0, zIndex: 10 }}>
      <button className="btn btn-subtle btn-icon" onClick={onToggleSidebar} style={{ height: 36, width: 36 }}>
        <Icon name="menu" size={18} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: "-.01em" }}>{title}</div>
        {sub && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: -1 }}>{sub}</div>}
      </div>

      <button className="btn btn-subtle btn-icon" onClick={onToggleTheme} title={theme === "dark" ? "Modo claro" : "Modo escuro"} style={{ height: 36, width: 36 }}>
        <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
      </button>

      <button className="btn btn-subtle btn-icon" style={{ height: 36, width: 36, position: "relative" }}>
        <Icon name="bell" size={18} />
        <span style={{ position: "absolute", top: 7, right: 8, width: 7, height: 7, borderRadius: 99, background: "var(--red)", border: "1.5px solid var(--surface)" }}></span>
      </button>

      <div ref={ref} style={{ position: "relative" }}>
        <button onClick={() => setMenu(m => !m)}
          style={{ display: "flex", alignItems: "center", gap: 10, height: 42, padding: "0 8px 0 8px", border: "1px solid var(--line)", borderRadius: 99, background: "var(--surface)", boxShadow: "var(--sh-sm)" }}>
          <Avatar name={user.nome} size="sm" />
          <div style={{ textAlign: "left", lineHeight: 1.12, marginRight: 2 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{user.nome.split(" ")[0]} {user.nome.split(" ")[1]?.[0]}.</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{ROLE_LABEL[user.perfil]}</div>
          </div>
          <Icon name="chevD" size={15} style={{ color: "var(--muted-2)" }} />
        </button>
        {menu && (
          <div className="card fade-in" style={{ position: "absolute", right: 0, top: 50, width: 230, zIndex: 40, boxShadow: "var(--sh-lg)", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", display: "flex", gap: 11, alignItems: "center" }}>
              <Avatar name={user.nome} size="md" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }} className="truncate">{user.nome}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }} className="truncate">{user.email}</div>
              </div>
            </div>
            <div style={{ padding: 6 }}>
              <button onClick={onLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", border: "none", background: "transparent", borderRadius: 8, fontSize: 13.5, color: "var(--red-text)", fontWeight: 500 }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--red-bg)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <Icon name="logout" size={16} />Sair da conta
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/* Page container */
function Page({ children, max = 1280 }) {
  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div className="fade-in" style={{ maxWidth: max, margin: "0 auto", padding: "26px 28px 60px" }}>
        {children}
      </div>
    </div>
  );
}

/* Section title within a page */
function PageSection({ title, sub, action, children, style }) {
  return (
    <section style={{ marginBottom: 26, ...style }}>
      {(title || action) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14, gap: 16, flexWrap: "wrap" }}>
          <div>
            {title && <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-.01em" }}>{title}</h2>}
            {sub && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 3 }}>{sub}</div>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

Object.assign(window, { Sidebar, Topbar, Page, PageSection, NAV, ROLE_LABEL });
