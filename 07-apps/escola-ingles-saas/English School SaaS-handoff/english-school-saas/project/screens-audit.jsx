/* ============================================================
   Auditoria + Relatórios + Configurações + Minha Conta
   ============================================================ */

const ACAO_TONE = {
  "Login realizado": "badge-gray", "Pagamento registrado": "badge-blue",
  "Comprovante aprovado": "badge-green", "Comprovante rejeitado": "badge-red",
  "Aluno criado": "badge-blue", "Aluno editado": "badge-gray",
  "Relatório exportado": "badge-gray", "Professor criado": "badge-blue",
  "Senha alterada": "badge-amber", "Filtro aplicado": "badge-gray",
};

function AuditoriaScreen() {
  const E = window.ESM;
  const toast = useToast();
  const [user, setUser] = useState("todos");
  const [acao, setAcao] = useState("todas");
  const [periodo, setPeriodo] = useState("todos");
  const [q, setQ] = useState("");

  const usuarios = [...new Set(E.auditoria.map(l => l.usuario))];
  const acoes = [...new Set(E.auditoria.map(l => l.acao))];

  const filtered = E.auditoria.filter(l => {
    if (user !== "todos" && l.usuario !== user) return false;
    if (acao !== "todas" && l.acao !== acao) return false;
    if (periodo !== "todos") {
      const days = periodo === "hoje" ? 1 : periodo === "7d" ? 7 : 30;
      if ((E.TODAY - l.data) / 86400000 > days) return false;
    }
    if (q) { const t = q.toLowerCase(); if (!(l.usuario.toLowerCase().includes(t) || (l.alvo || "").toLowerCase().includes(t) || l.acao.toLowerCase().includes(t))) return false; }
    return true;
  });

  const cols = [
    { label: "Usuário", get: l => l.usuario }, { label: "Perfil", get: l => l.perfil },
    { label: "Ação", get: l => l.acao }, { label: "Entidade", get: l => l.entidade },
    { label: "Alvo", get: l => l.alvo || "—" }, { label: "Data", get: l => E.fmtDateTime(l.data) }, { label: "IP", get: l => l.ip },
  ];
  function doExport(kind) {
    (kind === "csv" ? exportCSV : exportXLSX)("auditoria", cols, filtered);
    toast("Exportado " + filtered.length + " registros de auditoria (" + kind.toUpperCase() + ").");
  }

  return (
    <Page>
      <PageSection title="Auditoria" sub="Registro completo e imutável de todas as ações do sistema"
        action={<ExportMenu onExport={doExport} />}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
          <select className="select" style={{ width: 200, height: 38 }} value={user} onChange={e => setUser(e.target.value)}>
            <option value="todos">Todos os usuários</option>
            {usuarios.map(u => <option key={u}>{u}</option>)}
          </select>
          <select className="select" style={{ width: 200, height: 38 }} value={acao} onChange={e => setAcao(e.target.value)}>
            <option value="todas">Todas as ações</option>
            {acoes.map(a => <option key={a}>{a}</option>)}
          </select>
          <select className="select" style={{ width: 160, height: 38 }} value={periodo} onChange={e => setPeriodo(e.target.value)}>
            <option value="todos">Todo o período</option>
            <option value="hoje">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
          </select>
          <SearchInput value={q} onChange={setQ} placeholder="Buscar ação, usuário, alvo…" width={260} />
          <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--muted)" }}>{filtered.length} registros</span>
        </div>

        <div className="card tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Usuário</th><th>Perfil</th><th>Ação</th><th>Entidade</th><th>Alvo</th><th>Data / hora</th><th>IP</th></tr></thead>
            <tbody>
              {filtered.slice(0, 80).map(l => (
                <tr key={l.id}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Avatar name={l.usuario} size="sm" /><span style={{ fontWeight: 500, color: "var(--ink)" }}>{l.usuario}</span></div></td>
                  <td><span className="badge badge-gray">{ROLE_LABEL[l.perfil] || l.perfil}</span></td>
                  <td><span className={"badge " + (ACAO_TONE[l.acao] || "badge-gray")}>{l.acao}</span></td>
                  <td className="muted">{l.entidade}</td>
                  <td>{l.alvo || <span className="muted">—</span>}</td>
                  <td className="muted tnum">{E.fmtDateTime(l.data)}</td>
                  <td className="muted tnum" style={{ fontSize: 12.5 }}>{l.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <Empty icon="search" title="Nenhum registro" sub="Ajuste os filtros." />}
        </div>
      </PageSection>
    </Page>
  );
}

/* ---------- Relatórios ---------- */
function RelatoriosScreen() {
  const E = window.ESM;
  const toast = useToast();
  const reports = [
    { id: "alunos", title: "Base de alunos", sub: "Cadastro completo, planos, professores e status", icon: "graduation", n: E.alunos.length + " alunos",
      cols: [{ label: "Nome", get: a => a.nome }, { label: "Telefone", get: a => a.telefone }, { label: "Email", get: a => a.email }, { label: "Professores", get: a => a.professores.map(E.profName).join(", ") }, { label: "Plano", get: a => a.plano }, { label: "Mensalidade", get: a => a.valor }, { label: "Status", get: a => a.status }], rows: E.alunos },
    { id: "financeiro", title: "Lançamentos financeiros", sub: "Mensalidades, formas de pagamento e status", icon: "wallet", n: E.pagamentos.length + " lançamentos",
      cols: [{ label: "Aluno", get: p => p.aluno }, { label: "Competência", get: p => p.competencia }, { label: "Valor", get: p => p.valor }, { label: "Forma", get: p => p.forma }, { label: "Status", get: p => p.status }], rows: E.pagamentos },
    { id: "inadimplencia", title: "Inadimplência", sub: "Alunos atrasados e valores em aberto", icon: "alert", n: E.kpis.atrasados + " alunos",
      cols: [{ label: "Aluno", get: p => p.aluno }, { label: "Competência", get: p => p.competencia }, { label: "Valor", get: p => p.valor }, { label: "Vencimento", get: p => E.fmtDate(p.vencimento) }], rows: E.pagamentos.filter(p => p.status === "Atrasado") },
    { id: "auditoria", title: "Trilha de auditoria", sub: "Todas as ações registradas no sistema", icon: "shield", n: E.auditoria.length + " eventos",
      cols: [{ label: "Usuário", get: l => l.usuario }, { label: "Ação", get: l => l.acao }, { label: "Entidade", get: l => l.entidade }, { label: "Data", get: l => E.fmtDateTime(l.data) }, { label: "IP", get: l => l.ip }], rows: E.auditoria },
  ];
  function go(r, kind) { (kind === "csv" ? exportCSV : exportXLSX)(r.id, r.cols, r.rows); toast("Relatório '" + r.title + "' exportado (" + kind.toUpperCase() + ")."); }

  return (
    <Page>
      <PageSection title="Relatórios" sub="Exporte os dados do sistema em XLSX ou CSV — respeitando os filtros aplicados em cada tela">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
          {reports.map(r => (
            <div key={r.id} className="card" style={{ padding: 20, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <span style={{ width: 42, height: 42, borderRadius: 11, background: "var(--blue-50)", color: "var(--blue)", display: "grid", placeItems: "center" }}><Icon name={r.icon} size={20} /></span>
                <div><div style={{ fontWeight: 600, fontSize: 15 }}>{r.title}</div><div style={{ fontSize: 12.5, color: "var(--muted)" }}>{r.n}</div></div>
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16", lineHeight: 1.5, flex: 1 }}>{r.sub}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => go(r, "xlsx")}><Icon name="sheet" size={15} />XLSX</button>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => go(r, "csv")}><Icon name="file" size={15} />CSV</button>
              </div>
            </div>
          ))}
        </div>
      </PageSection>
    </Page>
  );
}

/* ---------- Configurações ---------- */
function ConfigScreen({ user }) {
  const toast = useToast();
  const Row = ({ title, sub, children }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "16px 18px", borderBottom: "1px solid var(--line)" }}>
      <div><div style={{ fontWeight: 500, fontSize: 14 }}>{title}</div><div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>{sub}</div></div>
      {children}
    </div>
  );
  const Toggle = ({ on: initial = true }) => {
    const [on, setOn] = useState(initial);
    return <button onClick={() => setOn(o => !o)} style={{ width: 42, height: 24, borderRadius: 99, border: "none", background: on ? "var(--blue)" : "var(--chip-border)", position: "relative", transition: "background .15s" }}>
      <span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: 99, background: "var(--surface)", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,.2)" }}></span>
    </button>;
  };
  return (
    <Page max={820}>
      <PageSection title="Configurações" sub="Preferências da escola e regras de negócio">
        <div className="card" style={{ marginBottom: 18 }}>
          <CardHead title="Escola" />
          <Row title="Nome da instituição" sub="Aparece em comprovantes e relatórios"><input className="input" defaultValue="English School LTDA" style={{ width: 260 }} /></Row>
          <Row title="Dias úteis para atraso" sub="Status muda para Atrasado após este prazo"><input className="input tnum" defaultValue="5" style={{ width: 80, textAlign: "center" }} /></Row>
          <Row title="Dias para inativação" sub="Aluno vira Inativo após este período sem pagamento"><input className="input tnum" defaultValue="30" style={{ width: 80, textAlign: "center" }} /></Row>
        </div>
        <div className="card" style={{ marginBottom: 18 }}>
          <CardHead title="Regras de pagamento" />
          <Row title="Comprovante obrigatório (PIX/Boleto)" sub="Exige anexo para registrar o pagamento"><Toggle on={true} /></Row>
          <Row title="Pagamento parcial" sub="Não permitido — apenas valor integral da mensalidade"><Toggle on={false} /></Row>
          <Row title="Notificar aluno ao rejeitar comprovante" sub="Envia email automático com o motivo"><Toggle on={true} /></Row>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-primary" onClick={() => toast("Configurações salvas.")}>Salvar alterações</button>
        </div>
      </PageSection>
    </Page>
  );
}

/* ---------- Minha Conta (professor) ---------- */
function MinhaContaScreen({ user }) {
  const toast = useToast();
  return (
    <Page max={720}>
      <PageSection title="Minha conta" sub="Seus dados e preferências">
        <div className="card" style={{ padding: 22, marginBottom: 18, display: "flex", alignItems: "center", gap: 16 }}>
          <Avatar name={user.nome} size="lg" />
          <div><div style={{ fontWeight: 600, fontSize: 17 }}>{user.nome}</div><div style={{ fontSize: 13.5, color: "var(--muted)" }}>{user.email} · Professor</div></div>
        </div>
        <div className="card" style={{ marginBottom: 18 }}>
          <CardHead title="Dados pessoais" />
          <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="field"><label>Nome</label><input className="input" defaultValue={user.nome} /></div>
            <div className="field"><label>Email</label><input className="input" defaultValue={user.email} /></div>
            <div className="field"><label>Telefone</label><input className="input" defaultValue={user.telefone || "(11) 99999-0000"} /></div>
            <div className="field"><label>Idioma</label><select className="select"><option>Português (BR)</option><option>English</option></select></div>
          </div>
        </div>
        <div className="card" style={{ marginBottom: 18 }}>
          <CardHead title="Segurança" />
          <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="field"><label>Senha atual</label><input className="input" type="password" placeholder="••••••••" /></div>
            <div className="field"><label>Nova senha</label><input className="input" type="password" placeholder="••••••••" /></div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-primary" onClick={() => toast("Alterações salvas.")}>Salvar alterações</button>
        </div>
      </PageSection>
    </Page>
  );
}

Object.assign(window, { AuditoriaScreen, RelatoriosScreen, ConfigScreen, MinhaContaScreen });
