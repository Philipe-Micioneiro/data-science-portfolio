/* ============================================================
   Gestão de Usuários — admin-only
   ============================================================ */

/* Seed mock user list: sys users + professors as login accounts */
function buildAllUsers() {
  const E = window.ESM;
  const seed = [
    { id: "u-admin", nome: "Marina Albuquerque", email: "admin@school.com", perfil: "Administrador",
      status: "Ativo", criado: new Date(2025, 0, 10), ultimoAcesso: new Date(2026, 5, 1, 9, 12),
      precisaTrocarSenha: false },
    { id: "u-sec-1", nome: "Cláudia Ramos", email: "secretaria@school.com", perfil: "Secretário",
      status: "Ativo", criado: new Date(2025, 1, 3), ultimoAcesso: new Date(2026, 5, 1, 8, 44),
      precisaTrocarSenha: false },
    { id: "u-sec-2", nome: "Patrícia Nunes", email: "patricia@school.com", perfil: "Secretário",
      status: "Ativo", criado: new Date(2025, 4, 18), ultimoAcesso: new Date(2026, 4, 28, 14, 55),
      precisaTrocarSenha: false },
  ];
  E.professores.forEach((p, i) => {
    seed.push({
      id: p.id,
      nome: p.nome, email: p.email, perfil: "Professor",
      status: p.status,
      criado: p.dataCadastro,
      ultimoAcesso: p.status === "Inativo" ? null : new Date(2026, 5, 1 - Math.floor(i * 1.5), 10 + i, 0),
      precisaTrocarSenha: i === 4,
    });
  });
  return seed;
}

const PERFIL_BADGE = {
  Administrador: "badge-blue",
  "Secretário": "badge-gray",
  Professor: "badge-green",
};

function PerfilBadge({ perfil }) {
  return <span className={"badge " + (PERFIL_BADGE[perfil] || "badge-gray")}>{perfil}</span>;
}

/* ---- Copy-to-clipboard util ---- */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function doCopy() {
    try { navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button className="btn btn-ghost btn-sm" onClick={doCopy} style={{ gap: 6 }}>
      <Icon name={copied ? "check" : "file"} size={14} />
      {copied ? "Copiado!" : "Copiar"}
    </button>
  );
}

/* ---- Temp password pill ---- */
function TempPwBanner({ email }) {
  const year = window.ESM.TODAY.getFullYear();
  const pw = "Temp#" + year;
  return (
    <div style={{ background: "var(--green-bg)", border: "1px solid", borderColor: "var(--green)", borderRadius: 10, padding: "14px 16px", marginTop: 16 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--green-text)", marginBottom: 8 }}>
        <Icon name="checkCircle" size={15} style={{ display: "inline", marginRight: 6 }} />
        Usuário criado! Senha temporária gerada.
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
        Um email com as credenciais foi enviado para <strong>{email}</strong>. O usuário será obrigado a trocar a senha no primeiro acesso.
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: 8, padding: "8px 12px", fontFamily: "monospace", fontWeight: 700, letterSpacing: ".06em", fontSize: 15 }}>{pw}</div>
        <CopyButton text={pw} />
      </div>
    </div>
  );
}

/* ---- Novo usuário modal ---- */
function NovoUsuarioModal({ open, onClose, onSave, existingEmails }) {
  const blank = { nome: "", email: "", perfil: "Secretário" };
  const [f, setF] = useState(blank);
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (open) { setF(blank); setSaved(false); } }, [open]);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const emailTaken = existingEmails.includes(f.email.trim().toLowerCase());
  const valid = f.nome.trim() && f.email.trim() && !emailTaken;

  function save() {
    onSave(f);
    setSaved(true);
  }

  return (
    <Modal open={open} onClose={onClose} width={500} title="Novo usuário" sub="Crie uma conta e defina o perfil de acesso" icon="userPlus">
      <div style={{ padding: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field"><label>Nome completo *</label>
            <input className="input" value={f.nome} onChange={e => set("nome", e.target.value)} placeholder="Nome completo" autoFocus disabled={saved} />
          </div>
          <div className="field"><label>Email *</label>
            <input className="input" type="email" value={f.email} onChange={e => set("email", e.target.value)} placeholder="usuario@school.com" disabled={saved} />
            {emailTaken && <span className="hint" style={{ color: "var(--red-text)" }}>Este email já está em uso.</span>}
          </div>
          <div className="field"><label>Perfil de acesso</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["Secretário", "Professor"].map(p => (
                <button key={p} type="button" disabled={saved} onClick={() => set("perfil", p)}
                  style={{ flex: 1, height: 42, borderRadius: 10, border: "1px solid " + (f.perfil === p ? "var(--blue)" : "var(--line-2)"), background: f.perfil === p ? "var(--blue-50)" : "var(--surface)", color: f.perfil === p ? "var(--blue)" : "var(--ink-2)", fontWeight: 600, fontSize: 13.5 }}>
                  {p}
                </button>
              ))}
            </div>
            <span className="hint">Administradores só podem ser criados por processo interno.</span>
          </div>
        </div>
        {saved && <TempPwBanner email={f.email} />}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 22px", borderTop: "1px solid var(--line)", background: "var(--surface-2)" }}>
        <button className="btn btn-ghost" onClick={onClose}>{saved ? "Fechar" : "Cancelar"}</button>
        {!saved && <button className="btn btn-primary" disabled={!valid} onClick={save}><Icon name="check" size={16} />Criar usuário</button>}
      </div>
    </Modal>
  );
}

/* ---- Editar usuário modal ---- */
function EditarUsuarioModal({ open, onClose, onSave, usuario }) {
  const [f, setF] = useState({ nome: "", email: "", status: "Ativo" });
  useEffect(() => { if (open && usuario) setF({ nome: usuario.nome, email: usuario.email, status: usuario.status }); }, [open, usuario]);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  if (!usuario) return null;
  return (
    <Modal open={open} onClose={onClose} width={460} title="Editar usuário" sub={usuario.perfil} icon="edit">
      <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="field"><label>Nome completo</label>
          <input className="input" value={f.nome} onChange={e => set("nome", e.target.value)} /></div>
        <div className="field"><label>Email</label>
          <input className="input" type="email" value={f.email} onChange={e => set("email", e.target.value)} /></div>
        <div className="field"><label>Perfil</label>
          <div className="input" style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface-2)", color: "var(--muted)", cursor: "not-allowed" }}>
            <PerfilBadge perfil={usuario.perfil} />
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Para alterar o perfil, inative e crie novo usuário.</span>
          </div>
        </div>
        <div className="field"><label>Status</label>
          <div style={{ display: "flex", gap: 8 }}>
            {["Ativo", "Inativo"].map(s => (
              <button key={s} onClick={() => set("status", s)} style={{ flex: 1, height: 40, borderRadius: 10, border: "1px solid " + (f.status === s ? "var(--blue)" : "var(--line-2)"), background: f.status === s ? "var(--blue-50)" : "var(--surface)", color: f.status === s ? "var(--blue)" : "var(--ink-2)", fontWeight: 600, fontSize: 13.5 }}>{s}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 22px", borderTop: "1px solid var(--line)", background: "var(--surface-2)" }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={() => onSave(usuario.id, f)}><Icon name="check" size={16} />Salvar alterações</button>
      </div>
    </Modal>
  );
}

/* ---- Detalhe do usuário ---- */
function UsuarioDetailModal({ usuario, onClose, onEdit, onToggleStatus, onResetSenha, currentUserId }) {
  const E = window.ESM;
  const [resetDone, setResetDone] = useState(false);
  const [confirmInativar, setConfirmInativar] = useState(false);
  useEffect(() => { if (!usuario) { setResetDone(false); setConfirmInativar(false); } }, [usuario]);
  if (!usuario) return null;
  const isSelf = usuario.id === currentUserId;
  const pw = "Temp#" + E.TODAY.getFullYear();

  return (
    <Modal open={!!usuario} onClose={onClose} width={500} title={usuario.nome} sub={usuario.email} icon="user">
      <div style={{ padding: "18px 22px 22px" }}>
        {/* Profile header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, padding: "16px 18px", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 12 }}>
          <Avatar name={usuario.nome} size="lg" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{usuario.nome}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <PerfilBadge perfil={usuario.perfil} />
              <StatusBadge status={usuario.status} />
              {usuario.precisaTrocarSenha && <span className="badge badge-amber"><span className="dot"></span>Troca de senha pendente</span>}
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", marginBottom: 20 }}>
          {[["Data de criação", E.fmtDate(usuario.criado)],
            ["Último acesso", usuario.ultimoAcesso ? E.fmtDateTime(usuario.ultimoAcesso) : "—"],
            ["Email", usuario.email], ["Perfil", usuario.perfil]].map(([k, v]) => (
            <div key={k}><div style={{ fontSize: 12, color: "var(--muted)" }}>{k}</div><div style={{ fontSize: 13.5, fontWeight: 500, marginTop: 2 }}>{v}</div></div>
          ))}
        </div>

        {/* Reset senha */}
        {resetDone ? (
          <div style={{ background: "var(--blue-50)", border: "1px solid var(--blue-100)", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--blue)", marginBottom: 8 }}>Nova senha temporária gerada</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: 8, padding: "7px 12px", fontFamily: "monospace", fontWeight: 700, fontSize: 14 }}>{pw}</div>
              <CopyButton text={pw} />
            </div>
          </div>
        ) : null}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(usuario)}><Icon name="edit" size={15} />Editar</button>
          {!resetDone && <button className="btn btn-ghost btn-sm" onClick={() => setResetDone(true)}><Icon name="lock" size={15} />Resetar senha</button>}
          {!isSelf && (
            confirmInativar ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "var(--red-bg)", border: "1px solid var(--red-border)", borderRadius: 9, flex: 1 }}>
                <span style={{ fontSize: 12.5, color: "var(--red-text)", flex: 1 }}>Confirmar {usuario.status === "Ativo" ? "inativação" : "reativação"}?</span>
                <button className="btn btn-subtle btn-sm" onClick={() => setConfirmInativar(false)}>Não</button>
                <button className={"btn btn-sm " + (usuario.status === "Ativo" ? "btn-danger" : "btn-success")}
                  onClick={() => { onToggleStatus(usuario); setConfirmInativar(false); }}>
                  {usuario.status === "Ativo" ? "Inativar" : "Reativar"}
                </button>
              </div>
            ) : (
              <button className={"btn btn-sm " + (usuario.status === "Ativo" ? "btn-danger" : "btn-success")} onClick={() => setConfirmInativar(true)}>
                <Icon name={usuario.status === "Ativo" ? "ban" : "check"} size={15} />{usuario.status === "Ativo" ? "Inativar" : "Reativar"}
              </button>
            )
          )}
          {isSelf && <span style={{ fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}><Icon name="alert" size={13} />Não é possível inativar sua própria conta.</span>}
        </div>
      </div>
    </Modal>
  );
}

/* ---- Tela principal ---- */
function UsuariosScreen({ currentUser }) {
  const E = window.ESM;
  const toast = useToast();
  const [baseUsers] = useState(() => buildAllUsers());
  const [overrides, setOverrides] = useState({});
  const [extra, setExtra] = useState([]);
  const [filter, setFilter] = useState("todos");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState(null); // {open, editing}

  const all = [...extra, ...baseUsers].map(u => overrides[u.id] ? { ...u, ...overrides[u.id] } : u);
  const counts = { todos: all.length };
  ["Administrador", "Secretário", "Professor"].forEach(p => counts[p] = all.filter(u => u.perfil === p && u.status === "Ativo").length);
  counts["Inativo"] = all.filter(u => u.status === "Inativo").length;

  const filtered = all.filter(u => {
    if (filter === "Inativo") return u.status === "Inativo";
    if (filter !== "todos" && u.perfil !== filter) return false;
    if (filter !== "Inativo" && u.status === "Inativo" && filter === "todos") {} // show all including inactive in "todos"
    if (q) { const t = q.toLowerCase(); if (!(u.nome.toLowerCase().includes(t) || u.email.toLowerCase().includes(t))) return false; }
    return true;
  });

  const existingEmails = all.map(u => u.email.toLowerCase());

  function saveNovo(f) {
    const nu = { id: "u-new-" + Date.now(), nome: f.nome, email: f.email.toLowerCase(), perfil: f.perfil,
      status: "Ativo", criado: E.TODAY, ultimoAcesso: null, precisaTrocarSenha: true };
    setExtra(x => [nu, ...x]);
    toast("Usuário criado. Senha temporária enviada por email.");
  }
  function saveEdit(id, f) {
    setOverrides(o => ({ ...o, [id]: { nome: f.nome, email: f.email, status: f.status } }));
    if (sel && sel.id === id) setSel(s => ({ ...s, ...f }));
    toast("Usuário atualizado. Alteração registrada na auditoria.");
    setForm(null);
  }
  function toggleStatus(u) {
    const novo = u.status === "Ativo" ? "Inativo" : "Ativo";
    setOverrides(o => ({ ...o, [u.id]: { ...o[u.id], status: novo } }));
    setSel(s => s && s.id === u.id ? { ...s, status: novo } : s);
    toast("Usuário " + u.nome.split(" ")[0] + " agora está " + novo + ".", novo === "Inativo" ? "warn" : "ok");
  }

  const statusOpts = [
    { value: "todos", label: "Todos" }, { value: "Administrador", label: "Administradores" },
    { value: "Secretário", label: "Secretários" }, { value: "Professor", label: "Professores" },
    { value: "Inativo", label: "Inativos" },
  ];

  return (
    <Page>
      <PageSection title="Usuários do sistema" sub="Gerencie contas e perfis de acesso · apenas administradores podem criar e inativar usuários">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 24 }}>
          <KpiCard label="Total de usuários" value={all.length} icon="users" tone="blue" />
          <KpiCard label="Administradores" value={counts["Administrador"]} icon="shield" tone="blue" />
          <KpiCard label="Secretários" value={counts["Secretário"]} icon="user" tone="gray" />
          <KpiCard label="Professores" value={counts["Professor"]} icon="graduation" tone="green" />
          <KpiCard label="Inativos" value={counts["Inativo"]} icon="ban" tone="red" />
        </div>
      </PageSection>

      <PageSection title="Lista de usuários" sub={filtered.length + " de " + all.length + " usuários"}
        action={<button className="btn btn-primary btn-sm" onClick={() => setForm({ open: true })}><Icon name="plus" size={16} />Novo usuário</button>}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap", justifyContent: "space-between" }}>
          <FilterChips options={statusOpts} value={filter} onChange={setFilter} counts={counts} />
          <SearchInput value={q} onChange={setQ} placeholder="Buscar nome ou email…" width={260} />
        </div>

        <div className="card tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Usuário</th><th>Email</th><th>Perfil</th><th>Status</th><th>Último acesso</th><th style={{ width: 40 }}></th></tr></thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} style={{ cursor: "pointer", opacity: u.status === "Inativo" ? 0.6 : 1 }} onClick={() => setSel(u)}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <Avatar name={u.nome} size="md" />
                    <div>
                      <div style={{ fontWeight: 500, color: "var(--ink)" }}>{u.nome}
                        {u.precisaTrocarSenha && <span className="badge badge-amber" style={{ marginLeft: 8, height: 18, fontSize: 11 }}>Troca pendente</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{u.id === currentUser.id ? "Você" : ""}</div>
                    </div>
                  </div></td>
                  <td className="muted">{u.email}</td>
                  <td><PerfilBadge perfil={u.perfil} /></td>
                  <td><StatusBadge status={u.status} /></td>
                  <td className="muted tnum">{u.ultimoAcesso ? E.fmtDateTime(u.ultimoAcesso) : "—"}</td>
                  <td><span style={{ color: "var(--muted-2)" }}><Icon name="chevR" size={16} /></span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <Empty icon="search" title="Nenhum usuário encontrado" sub="Ajuste os filtros." />}
        </div>
      </PageSection>

      <UsuarioDetailModal usuario={sel} onClose={() => setSel(null)}
        onEdit={u => { setSel(null); setForm({ open: true, editing: u }); }}
        onToggleStatus={toggleStatus} onResetSenha={() => {}}
        currentUserId={currentUser.id} />
      <NovoUsuarioModal open={!!form && !form.editing} onClose={() => setForm(null)} onSave={saveNovo} existingEmails={existingEmails} />
      <EditarUsuarioModal open={!!form && !!form.editing} usuario={form?.editing} onClose={() => setForm(null)} onSave={saveEdit} />
    </Page>
  );
}

Object.assign(window, { UsuariosScreen, PerfilBadge });
