/* ============================================================
   Gestão de Professores — tabela CRUD + dashboard de distribuição
   ============================================================ */

/* ---------- Ranking card (distribuição de carga) ---------- */
function RankingCard({ title, icon, tone, items, unit, accent }) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
        <span style={{ width: 32, height: 32, borderRadius: 9, background: tone.bg, color: tone.c, display: "grid", placeItems: "center" }}><Icon name={icon} size={17} /></span>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
      </div>
      <div style={{ padding: "6px 0" }}>
        {items.map((it, i) => (
          <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 16px" }}>
            <span style={{ width: 22, height: 22, borderRadius: 99, background: i === 0 ? accent : "var(--hover)", color: i === 0 ? "#fff" : "var(--muted)", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, flex: "none" }}>{i + 1}</span>
            <Avatar name={it.nome} size="sm" />
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, minWidth: 0 }} className="truncate">{it.nome}</span>
            <span className="tnum" style={{ fontSize: 14, fontWeight: 700 }}>{it.value}<span style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 500, marginLeft: 3 }}>{unit}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Cadastrar / Editar professor ---------- */
function ProfessorFormModal({ open, onClose, onSave, editing }) {
  const E = window.ESM;
  const blank = { nome: "", email: "", telefone: "", valorHora: "65", formaPagamento: "PIX", obsFinanceiras: "", status: "Ativo" };
  const [f, setF] = useState(blank);
  useEffect(() => {
    if (!open) return;
    setF(editing ? { nome: editing.nome, email: editing.email, telefone: editing.telefone, valorHora: String(editing.valorHora), formaPagamento: editing.formaPagamento, obsFinanceiras: editing.obsFinanceiras || "", status: editing.status } : blank);
  }, [open, editing]);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const valid = f.nome.trim() && f.email.trim() && f.valorHora;

  return (
    <Modal open={open} onClose={onClose} width={560} title={editing ? "Editar professor" : "Cadastrar professor"} sub={editing ? editing.nome : "Adicione um novo professor à escola"} icon="userPlus">
      <div style={{ padding: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="field" style={{ gridColumn: "1 / -1" }}><label>Nome completo *</label><input className="input" value={f.nome} onChange={e => set("nome", e.target.value)} placeholder="Ex.: Roberto Lemos" autoFocus /></div>
        <div className="field"><label>Email *</label><input className="input" type="email" value={f.email} onChange={e => set("email", e.target.value)} placeholder="professor@school.com" /></div>
        <div className="field"><label>Telefone</label><input className="input" value={f.telefone} onChange={e => set("telefone", e.target.value)} placeholder="(11) 99999-9999" /></div>

        <div style={{ gridColumn: "1 / -1", fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em", marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="briefcase" size={14} />Dados financeiros
        </div>
        <div className="field"><label>Valor hora/aula (R$) *</label><input className="input tnum" type="number" value={f.valorHora} onChange={e => set("valorHora", e.target.value)} /></div>
        <div className="field"><label>Forma de pagamento</label>
          <select className="select" value={f.formaPagamento} onChange={e => set("formaPagamento", e.target.value)}>
            {E.FORMAS_PROF.map(x => <option key={x}>{x}</option>)}
          </select>
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}><label>Observações financeiras</label>
          <textarea className="textarea" value={f.obsFinanceiras} onChange={e => set("obsFinanceiras", e.target.value)} placeholder="Ex.: recebe via PJ, emite nota fiscal…" />
        </div>
        {editing && (
          <div className="field" style={{ gridColumn: "1 / -1" }}><label>Status</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["Ativo", "Inativo"].map(s => (
                <button key={s} onClick={() => set("status", s)} style={{ flex: 1, height: 40, borderRadius: 10, border: "1px solid " + (f.status === s ? "var(--blue)" : "var(--line-2)"), background: f.status === s ? "var(--blue-50)" : "var(--surface)", color: f.status === s ? "var(--blue)" : "var(--ink-2)", fontWeight: 600, fontSize: 13.5 }}>{s}</button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 22px", borderTop: "1px solid var(--line)", background: "var(--surface-2)" }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valid} onClick={() => onSave(f)}><Icon name="check" size={16} />{editing ? "Salvar alterações" : "Cadastrar professor"}</button>
      </div>
    </Modal>
  );
}

/* ---------- Detalhes do professor (com alunos em tabela) ---------- */
function ProfessorDetailModal({ professor, onClose, onEdit, onToggleStatus }) {
  const E = window.ESM;
  const toast = useToast();
  const [status, setStatus] = useState("todos");
  if (!professor) return null;

  const meus = E.alunos.filter(a => a.professores.includes(professor.id));
  const counts = { todos: meus.length };
  E.STATUSES.forEach(s => counts[s] = meus.filter(a => a.status === s).length);
  const filtered = meus.filter(a => status === "todos" || a.status === status);
  const pgto = E.pagamentosProf.find(x => x.profId === professor.id);

  const statusOpts = [
    { value: "todos", label: "Todos" }, { value: "Ativo", label: "Ativos" },
    { value: "Atrasado", label: "Atrasados" }, { value: "Pendente de Validação", label: "Pendentes" }, { value: "Inativo", label: "Inativos" },
  ];
  const cols = [
    { label: "Aluno", get: a => a.nome }, { label: "Email", get: a => a.email },
    { label: "Plano", get: a => a.plano }, { label: "Nível", get: a => a.nivel },
    { label: "Mensalidade", get: a => a.valor }, { label: "Status", get: a => a.status },
  ];
  function doExport(kind) {
    (kind === "csv" ? exportCSV : exportXLSX)("alunos_" + professor.nome.split(" ")[0].toLowerCase(), cols, filtered);
    toast("Exportado " + filtered.length + " alunos (" + kind.toUpperCase() + ").");
  }

  const info = [
    ["Email", professor.email], ["Telefone", professor.telefone],
    ["Data de cadastro", E.fmtDate(professor.dataCadastro)], ["Valor hora/aula", E.brl(professor.valorHora)],
    ["Forma de pagamento", professor.formaPagamento], ["Aulas no mês", professor.aulasNoMes + " aulas"],
  ];

  return (
    <Modal open={!!professor} onClose={onClose} width={880} title={professor.nome}
      sub={professor.email} icon="user">
      <div style={{ padding: "18px 22px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <StatusBadge status={professor.status} />
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(professor)}><Icon name="edit" size={15} />Editar</button>
          <button className={"btn btn-sm " + (professor.status === "Ativo" ? "btn-danger" : "btn-success")} onClick={() => onToggleStatus(professor)}>
            <Icon name={professor.status === "Ativo" ? "ban" : "check"} size={15} />{professor.status === "Ativo" ? "Inativar" : "Reativar"}
          </button>
        </div>

        {/* info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px 20px", marginBottom: 18, padding: "16px 18px", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 12 }}>
          {info.map(([k, v]) => (
            <div key={k}><div style={{ fontSize: 12, color: "var(--muted)" }}>{k}</div><div style={{ fontSize: 13.5, fontWeight: 500, marginTop: 2 }}>{v}</div></div>
          ))}
          {professor.obsFinanceiras && <div style={{ gridColumn: "1 / -1" }}><div style={{ fontSize: 12, color: "var(--muted)" }}>Observações financeiras</div><div style={{ fontSize: 13.5, marginTop: 2 }}>{professor.obsFinanceiras}</div></div>}
        </div>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
          {[["Alunos", meus.length, "var(--ink)"], ["Ativos", counts["Ativo"], "var(--green-text)"],
            ["Aulas / mês", professor.aulasNoMes, "var(--blue)"],
            ["A receber", pgto ? E.brl(pgto.devido) : "—", "var(--ink)"]].map(([l, v, c]) => (
            <div key={l} className="card" style={{ padding: "12px 14px", background: "var(--surface-2)" }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Alunos do professor</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <FilterChips options={statusOpts} value={status} onChange={setStatus} counts={counts} />
            <ExportMenu onExport={doExport} />
          </div>
        </div>
        <div className="card tbl-wrap" style={{ maxHeight: 300, overflowY: "auto" }}>
          <table className="tbl">
            <thead><tr><th>Aluno</th><th>Plano</th><th>Nível</th><th>Mensalidade</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 11 }}><Avatar name={a.nome} size="md" /><div><div style={{ fontWeight: 500, color: "var(--ink)" }}>{a.nome}</div><div style={{ fontSize: 12, color: "var(--muted)" }}>{a.email}</div></div></div></td>
                  <td>{a.plano}</td><td><span className="badge badge-blue">{a.nivel}</span></td>
                  <td className="tnum" style={{ fontWeight: 500, color: "var(--ink)" }}>{E.brl(a.valor)}</td>
                  <td><StatusBadge status={a.status} short /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <Empty icon="graduation" title="Nenhum aluno" sub="Sem alunos neste status." />}
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Tela principal ---------- */
function ProfessoresScreen() {
  const E = window.ESM;
  const toast = useToast();
  const [overrides, setOverrides] = useState({}); // id -> {status, ...edits}
  const [extra, setExtra] = useState([]);
  const [status, setStatus] = useState("todos");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState(null); // {open, editing}

  // merge overrides
  const base = [...extra, ...E.professores].map(p => overrides[p.id] ? { ...p, ...overrides[p.id] } : p);

  const counts = { todos: base.length, Ativo: base.filter(p => p.status === "Ativo").length, Inativo: base.filter(p => p.status === "Inativo").length };
  const filtered = base.filter(p => {
    if (status !== "todos" && p.status !== status) return false;
    if (q) { const t = q.toLowerCase(); if (!(p.nome.toLowerCase().includes(t) || p.email.toLowerCase().includes(t))) return false; }
    return true;
  });

  // Distribution rankings (active professors)
  const ativos = base.filter(p => p.status === "Ativo");
  const byAlunos = [...ativos].sort((a, b) => b.numAlunos - a.numAlunos);
  const byAulas = [...ativos].sort((a, b) => b.aulasNoMes - a.aulasNoMes);
  const mk = (arr, key) => arr.slice(0, 5).map(p => ({ id: p.id, nome: p.nome, value: p[key] }));

  const cols = [
    { label: "Nome", get: p => p.nome }, { label: "Email", get: p => p.email }, { label: "Telefone", get: p => p.telefone },
    { label: "Data de Cadastro", get: p => E.fmtDate(p.dataCadastro) }, { label: "Qtd Alunos", get: p => p.numAlunos },
    { label: "Aulas no Mês", get: p => p.aulasNoMes }, { label: "Valor Hora", get: p => p.valorHora }, { label: "Status", get: p => p.status },
  ];
  function doExport(kind) { (kind === "csv" ? exportCSV : exportXLSX)("professores", cols, filtered); toast("Exportado " + filtered.length + " professores (" + kind.toUpperCase() + ")."); }

  function saveForm(f) {
    if (form.editing) {
      setOverrides(o => ({ ...o, [form.editing.id]: { ...o[form.editing.id], nome: f.nome, email: f.email, telefone: f.telefone, valorHora: Number(f.valorHora), formaPagamento: f.formaPagamento, obsFinanceiras: f.obsFinanceiras, status: f.status } }));
      toast("Professor '" + f.nome + "' atualizado.");
      if (sel && sel.id === form.editing.id) setSel(s => ({ ...s, ...f, valorHora: Number(f.valorHora) }));
    } else {
      const np = { id: "p-new-" + Date.now(), nome: f.nome, email: f.email, telefone: f.telefone, perfil: "Professor",
        dataCadastro: E.TODAY, valorHora: Number(f.valorHora), formaPagamento: f.formaPagamento, obsFinanceiras: f.obsFinanceiras,
        status: "Ativo", numAlunos: 0, aulasNoMes: 0, aulasRealizadas: 0 };
      setExtra(x => [np, ...x]);
      toast("Professor '" + f.nome + "' cadastrado.");
    }
    setForm(null);
  }
  function toggleStatus(p) {
    const novo = p.status === "Ativo" ? "Inativo" : "Ativo";
    setOverrides(o => ({ ...o, [p.id]: { ...o[p.id], status: novo } }));
    setSel(s => s && s.id === p.id ? { ...s, status: novo } : s);
    toast("Professor " + p.nome.split(" ")[0] + " agora está " + novo + ".", novo === "Inativo" ? "warn" : "ok");
  }

  return (
    <Page>
      {/* Distribuição de carga */}
      <PageSection title="Distribuição de carga" sub="Inteligência operacional para equilibrar alunos e aulas entre professores">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <RankingCard title="Mais alunos" icon="users" tone={{ bg: "var(--blue-50)", c: "var(--blue)" }} accent="var(--blue)" items={mk(byAlunos, "numAlunos")} unit="alunos" />
          <RankingCard title="Menos alunos" icon="users" tone={{ bg: "var(--amber-bg)", c: "var(--amber-text)" }} accent="var(--amber)" items={mk([...byAlunos].reverse(), "numAlunos")} unit="alunos" />
          <RankingCard title="Mais aulas" icon="calendar" tone={{ bg: "var(--green-bg)", c: "var(--green-text)" }} accent="var(--green)" items={mk(byAulas, "aulasNoMes")} unit="aulas" />
          <RankingCard title="Menos aulas" icon="calendar" tone={{ bg: "var(--red-bg)", c: "var(--red-text)" }} accent="var(--red)" items={mk([...byAulas].reverse(), "aulasNoMes")} unit="aulas" />
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="alert" size={13} />Quantidade de <strong>alunos</strong> e de <strong>aulas</strong> são métricas distintas — um professor pode ter poucos alunos com muitas aulas semanais.
        </div>
      </PageSection>

      {/* Tabela */}
      <PageSection title="Professores" sub={filtered.length + " de " + base.length + " professores"}
        action={
          <div style={{ display: "flex", gap: 10 }}>
            <ExportMenu onExport={doExport} />
            <button className="btn btn-primary btn-sm" onClick={() => setForm({ open: true, editing: null })}><Icon name="plus" size={16} />Novo professor</button>
          </div>
        }>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap", justifyContent: "space-between" }}>
          <FilterChips options={[{ value: "todos", label: "Todos" }, { value: "Ativo", label: "Ativos" }, { value: "Inativo", label: "Inativos" }]} value={status} onChange={setStatus} counts={counts} />
          <SearchInput value={q} onChange={setQ} placeholder="Buscar nome ou email…" width={260} />
        </div>

        <div className="card tbl-wrap">
          <table className="tbl">
            <thead><tr>
              <th>Nome</th><th>Email</th><th>Telefone</th><th>Data de Cadastro</th>
              <th>Alunos</th><th>Aulas no Mês</th><th>Valor Hora</th><th>Status</th><th style={{ width: 40 }}></th>
            </tr></thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ cursor: "pointer", opacity: p.status === "Inativo" ? 0.62 : 1 }} onClick={() => setSel(p)}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 11 }}><Avatar name={p.nome} size="md" /><span style={{ fontWeight: 500, color: "var(--ink)" }}>{p.nome}</span></div></td>
                  <td className="muted">{p.email}</td>
                  <td className="muted tnum">{p.telefone}</td>
                  <td className="muted tnum">{E.fmtDate(p.dataCadastro)}</td>
                  <td className="tnum" style={{ fontWeight: 600, color: "var(--ink)" }}>{p.numAlunos}</td>
                  <td className="tnum" style={{ fontWeight: 600, color: "var(--ink)" }}>{p.aulasNoMes}</td>
                  <td className="tnum">{E.brl(p.valorHora)}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td><span style={{ color: "var(--muted-2)" }}><Icon name="chevR" size={16} /></span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <Empty icon="search" title="Nenhum professor" sub="Ajuste os filtros ou a busca." />}
        </div>
      </PageSection>

      <ProfessorDetailModal professor={sel} onClose={() => setSel(null)} onEdit={p => { setSel(null); setForm({ open: true, editing: p }); }} onToggleStatus={toggleStatus} />
      <ProfessorFormModal open={!!form} editing={form?.editing} onClose={() => setForm(null)} onSave={saveForm} />
    </Page>
  );
}

Object.assign(window, { ProfessoresScreen, ProfessorDetailModal, ProfessorFormModal, RankingCard });
