/* ============================================================
   App — auth, routing, role dispatch
   ============================================================ */
const LS_KEY = "esm_session_v1";

function loadSession() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
}
function saveSession(s) { try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {} }

/* Resolve the logged user object from an email */
function resolveUser(email) {
  const E = window.ESM;
  if (email === "professor@school.com") return E.professores[0];
  return E.users.find(u => u.email === email) || E.users[0];
}

function App() {
  const E = window.ESM;
  const init = loadSession();
  const [screen, setScreen] = useState(init.screen || "login"); // login | primeiro-acesso | app
  const [email, setEmail] = useState(init.email || null);
  const [route, setRoute] = useState(init.route || "dashboard");
  const [routeParams, setRouteParams] = useState(null);
  const [collapsed, setCollapsed] = useState(init.collapsed || false);
  const [theme, setTheme] = useState(init.theme || "light");

  const user = (screen === "app" && email) ? resolveUser(email) : null;

  useEffect(() => { saveSession({ screen, email, route, collapsed, theme }); }, [screen, email, route, collapsed, theme]);
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);

  function handleLogin(em) {
    if (em === "novo@school.com") { setScreen("primeiro-acesso"); return; }
    setEmail(em); setScreen("app");
    setRoute("dashboard"); setRouteParams(null);
  }
  function logout() { setScreen("login"); setEmail(null); setRoute("dashboard"); }

  function nav(r, params) {
    if (r === "__logout") { logout(); return; }
    setRoute(r); setRouteParams(params || null);
  }

  if (screen === "login") return <LoginScreen onLogin={handleLogin} />;
  if (screen === "redefinir-senha") return <RedefinirSenhaScreen onDone={() => setScreen("login")} onBack={() => setScreen("login")} />;
  if (screen === "token-expirado") return <TokenExpiradoScreen onSolicitarNovo={() => setScreen("login")} />;
  if (screen === "primeiro-acesso")
    return <PrimeiroAcessoScreen onDone={() => { setEmail("secretaria@school.com"); setScreen("app"); setRoute("dashboard"); }} onBack={() => setScreen("login")} />;

  // ---- Authenticated app ----
  const perfil = user.perfil;
  const pendingCount = E.pendentes.length;

  const TITLES = {
    dashboard: perfil === "Professor" ? "Meus Alunos" : "Dashboard",
    usuarios: "Usuários", alunos: "Alunos", professores: "Professores", agenda: perfil === "Professor" ? "Minha Agenda" : "Agenda",
    financeiro: perfil === "Administrador" ? "Financeiro" : "Pagamentos", financeiroProf: "Financeiro Professores",
    validacoes: "Validação de comprovantes", auditoria: "Auditoria", relatorios: "Relatórios",
    config: "Configurações", conta: "Minha Conta",
  };
  const SUBS = {
    dashboard: perfil === "Administrador" ? "Visão geral da operação e finanças" : perfil === "Professor" ? "Suas turmas e alunos" : "Operação do dia",
    usuarios: "Gerencie contas e perfis de acesso",
    agenda: perfil === "Professor" ? "Suas aulas" : "Aulas de todos os professores",
    financeiro: "Mensalidades e lançamentos", financeiroProf: "Pagamento dos professores",
    validacoes: pendingCount + " comprovantes pendentes", auditoria: "Histórico completo de ações",
  };

  function renderRoute() {
    // Guard rails per perfil (Professor never sees financeiro/auditoria, etc.)
    const allowed = (NAV[perfil] || []).map(n => n.id);
    let r = route;
    if (r !== "conta" && r !== "config" && !allowed.includes(r)) r = "dashboard";

    switch (r) {
      case "dashboard":
        if (perfil === "Administrador") return <AdminDashboard onNav={nav} />;
        if (perfil === "Secretário") return <SecretariaDashboard onNav={nav} />;
        return <ProfessorDashboard onNav={nav} professor={user} />;
      case "usuarios": return <UsuariosScreen currentUser={user} />;
      case "alunos": return <AlunosScreen initialFilter={routeParams} perfil={perfil} onNav={nav} />;
      case "professores": return <ProfessoresScreen />;
      case "agenda": return <AgendaScreen user={user} initialParams={routeParams} />;
      case "financeiro": return <FinanceiroScreen perfil={perfil} />;
      case "financeiroProf": return <FinanceiroProfScreen />;
      case "validacoes": return <ValidacoesScreen />;
      case "auditoria": return <AuditoriaScreen />;
      case "relatorios": return <RelatoriosScreen />;
      case "config": return <ConfigScreen user={user} />;
      case "conta": return <MinhaContaScreen user={user} />;
      default: return <AdminDashboard onNav={nav} />;
    }
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      <Sidebar user={user} route={route} onNav={nav} pendingCount={pendingCount} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100%" }}>
        <Topbar user={user} title={TITLES[route] || "Dashboard"} sub={SUBS[route]} onToggleSidebar={() => setCollapsed(c => !c)} onLogout={logout} theme={theme} onToggleTheme={() => setTheme(t => t === "dark" ? "light" : "dark")} />
        {renderRoute()}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ToastProvider><App /></ToastProvider>
);
