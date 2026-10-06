/* ============================================================
   Alunos — tabela + filtros + busca + cadastro (multi-professor)
   ============================================================ */

function MultiProfessorPicker({ value, onChange }) {
  const E = window.ESM;
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const h = e => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  const toggle = id => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div className="input" onClick={() => setOpen(o => !o)}
        style={{ height: "auto", minHeight: 40, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", padding: "6px 34px 6px 10px", cursor: "pointer", position: "relative" }}>
        {value.length === 0 && <span style={{ color: "var(--muted-2)" }}>Selecione um ou mais professores</span>}
        {value.map(id => (
          <span key={id} className="badge badge-blue" style={{ height: 26 }}>
            {E.profName(id)}
            <button type="button" onClick={e => { e.stopPropagation(); toggle(id); }} style={{ border: "none", background: "transparent", display: "grid", placeItems: "center", color: "inherit", padding: 0, marginLeft: 2 }}><Icon name="x" size={13} /></button>
          </span>
        ))}
        <span style={{ position: "absolute", right: 11, top: 12, color: "var(--muted-2)", pointerEvents: "none" }}><Icon name="chevD" size={16} /></span>
      </div>
      {open && (
        <div className="card fade-in" style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 6px)", zIndex: 50, boxShadow: "var(--sh-lg)", padding: 6, maxHeight: 240, overflowY: "auto" }}>
          {E.professores.map(p => {
            const on = value.includes(p.id);
            return (
              <button type="button" key={p.id} onClick={() => toggle(p.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 9px", border: "none", background: on ? "var(--blue-50)" : "transparent", borderRadius: 8, textAlign: "left" }}>
                <Avatar name={p.nome} size="sm" />
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: "var(--ink-2)" }}>{p.nome}</span>
                <span style={{ width: 18, height: 18, borderRadius: 5, border: "1.5px solid " + (on ? "var(--blue)" : "var(--chip-border)"), background: on ? "var(--blue)" : "#fff", display: "grid", placeItems: "center", color: "#fff" }}>
                  {on && <Icon name="check" size={12} strokeWidth={3} />}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NovoAlunoModal({ open, onClose, onSave }) {
  const E = window.ESM;
  const empty = { nome: "", telefone: "", email: "", plano: "Intermediário", nivel: "B1", valor: "390", diaVencimento: "10", dataEntrada: "", professores: [], cargaHoraria: E.CARGAS[1], observacoes: "" };
  const [f, setF] = useState(empty);
  useEffect(() => { if (open) setF(empty); }, [open]);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const valid = f.nome.trim() && f.telefone.trim() && f.professores.length > 0 && f.valor;

  function planoChange(nome) {
    const p = E.PLANOS.find(x => x.nome === nome);
    setF(s => ({ ...s, plano: nome, valor: p ? String(p.valor) : s.valor }));
  }

  return (
    <Modal open={open} onClose={onClose} width={640} title="Novo aluno" sub="Cadastre um aluno e vincule a um ou mais professores" icon="graduation">
      <div style={{ padding: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxHeight: "62vh", overflowY: "auto" }}>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Nome completo *</label>
          <input className="input" value={f.nome} onChange={e => set("nome", e.target.value)} placeholder="Ex.: Mariana Souza Lima" autoFocus />
        </div>
        <div className="field"><label>Telefone *</label><input className="input" value={f.telefone} onChange={e => set("telefone", e.target.value)} placeholder="(11) 99999-9999" /></div>
        <div className="field"><label>Email</label><input className="input" type="email" value={f.email} onChange={e => set("email", e.target.value)} placeholder="aluno@email.com" /></div>
        <div className="field"><label>Plano</label>
          <select className="select" value={f.plano} onChange={e => planoChange(e.target.value)}>
            {E.PLANOS.map(p => <option key={p.nome}>{p.nome}</option>)}
          </select>
        </div>
        <div className="field"><label>Nível de inglês</label>
          <select className="select" value={f.nivel} onChange={e => set("nivel", e.target.value)}>
            {E.NIVEIS.map(n => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div className="field"><label>Valor da mensalidade (R$)</label>
          <input className="input" type="number" value={f.valor} onChange={e => set("valor", e.target.value)} /></div>
        <div className="field"><label>Dia de vencimento</label>
          <select className="select" value={f.diaVencimento} onChange={e => set("diaVencimento", e.target.value)}>
            {[5, 8, 10, 12, 15, 20, 25].map(d => <option key={d} value={d}>Dia {d}</option>)}
          </select>
        </div>
        <div className="field"><label>Data de entrada</label><input className="input" type="date" value={f.dataEntrada} onChange={e => set("dataEntrada", e.target.value)} /></div>
        <div className="field"><label>Carga horária</label>
          <select className="select" value={f.cargaHoraria} onChange={e => set("cargaHoraria", e.target.value)}>
            {E.CARGAS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Professor(es) * <span className="hint" style={{ display: "inline", fontWeight: 400 }}>— um aluno pode ter mais de um professor</span></label>
          <MultiProfessorPicker value={f.professores} onChange={v => set("professores", v)} />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Observações</label>
          <textarea className="textarea" value={f.observacoes} onChange={e => set("observacoes", e.target.value)} placeholder="Anotações internas, preferências, restrições…" />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 22px", borderTop: "1px solid var(--line)", background: "var(--surface-2)" }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valid} onClick={() => onSave(f)}>
          <Icon name="check" size={16} />Cadastrar aluno
        </button>
      </div>
    </Modal>
  );
}

/* ---- M5: InativarAlunoModal ---- */
function InativarAlunoModal({ open, aluno, onClose, onConfirm }) {
  const E = window.ESM;
  const [motivo, setMotivo] = useState("");
  useEffect(() => { if (open) setMotivo(""); }, [open]);
  if (!aluno) return null;
  return (
    <Modal open={open} onClose={onClose} width={460} title="Inativar aluno" sub="O histórico permanece preservado" icon="ban">
      <div style={{ padding: 22 }}>
        <div className="card" style={{ padding: "12px 14px", background: "var(--surface-2)", marginBottom: 16 }}>
          <div style={{ fontWeight: 600 }}>{aluno.nome}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>{aluno.plano} · {E.brl(aluno.valor)}/mês</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 9, background: "var(--amber-bg)", border: "1px solid var(--amber)", borderRadius: 9, padding: "11px 13px", marginBottom: 16, fontSize: 12.5, color: "var(--amber-text)" }}>
          <Icon name="alert" size={16} style={{ flex: "none", marginTop: 1 }} />
          O aluno perderá acesso ao agendamento de novas aulas. O histórico permanece preservado.
        </div>
        <div className="field">
          <label>Motivo da inativação (opcional)</label>
          <textarea className="textarea" value={motivo} onChange={e => setMotivo(e.target.value)}
            placeholder="Ex.: Encerramento voluntário, inadimplência prolongada, mudança de cidade…" />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 22px", borderTop: "1px solid var(--line)", background: "var(--surface-2)" }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-danger" onClick={() => onConfirm(aluno, motivo)}><Icon name="ban" size={16} />Inativar aluno</button>
      </div>
    </Modal>
  );
}

/* ---- M6: AlunoDetail — view | edit modes ---- */
function AlunoDetail({ aluno: alunoInit, onClose, onVerAgenda, onStatusChange, perfil }) {
  const E = window.ESM;
  if (!alunoInit) return null;

  const [aluno, setAluno] = useState(alunoInit);
  const [mode, setMode] = useState("view"); // view | edit
  const [edit, setEdit] = useState({});
  const [inativar, setInativar] = useState(false);
  const [confirmReativar, setConfirmReativar] = useState(false);
  const toast = useToast();

  useEffect(() => { setAluno(alunoInit); setMode("view"); }, [alunoInit]);

  const pagamentos = E.pagamentos.filter(p => p.alunoId === aluno.id).slice(0, 4);
  const proximas = E.agenda
    .filter(ev => ev.alunoId === aluno.id && ev.status === "Agendada" && ev.start >= E.TODAY)
    .slice(0, 3);
  const weekMs = 7 * 86400000;
  const freqSemana = E.agenda.filter(ev => ev.alunoId === aluno.id && ev.status !== "Cancelada" &&
    ev.start >= E.TODAY && ev.start < new Date(E.TODAY.getTime() + weekMs)).length;

  const isInativo = aluno.status === "Inativo";
  const isBlocked = aluno.status === "Inativo" || aluno.status === "Atrasado"; // blocks scheduling
  const canEdit = perfil !== "Professor";

  function startEdit() {
    setEdit({
      telefone: aluno.telefone, email: aluno.email, plano: aluno.plano,
      nivel: aluno.nivel, valor: String(aluno.valor), diaVencimento: String(aluno.diaVencimento),
      cargaHoraria: aluno.cargaHoraria, professores: [...aluno.professores], observacoes: aluno.observacoes || ""
    });
    setMode("edit");
  }
  function saveEdit() {
    const updated = { ...aluno, ...edit, valor: Number(edit.valor), diaVencimento: Number(edit.diaVencimento) };
    setAluno(updated);
    setMode("view");
    toast("Dados de " + aluno.nome + " atualizados. Alteração registrada na auditoria.");
  }
  function handleInativar(a, motivo) {
    const updated = { ...aluno, status: "Inativo" };
    setAluno(updated);
    setInativar(false);
    if (onStatusChange) onStatusChange(aluno.id, "Inativo");
    toast("Aluno inativado. Histórico preservado. Ação registrada na auditoria.", "warn");
    setTimeout(onClose, 1600);
  }
  function handleReativar() {
    const updated = { ...aluno, status: "Ativo" };
    setAluno(updated);
    setConfirmReativar(false);
    if (onStatusChange) onStatusChange(aluno.id, "Ativo");
    toast("Aluno reativado com sucesso.");
  }

  const rowsInfo = [
    ["Email", mode === "edit" ? <input className="input" style={{ height: 34 }} value={edit.email} onChange={e => setEdit(x => ({...x, email: e.target.value}))} /> : aluno.email],
    ["Telefone", mode === "edit" ? <input className="input" style={{ height: 34 }} value={edit.telefone} onChange={e => setEdit(x => ({...x, telefone: e.target.value}))} /> : aluno.telefone],
    ["Plano", mode === "edit" ? <select className="select" style={{ height: 34 }} value={edit.plano} onChange={e => setEdit(x => ({...x, plano: e.target.value}))}>{E.PLANOS.map(p => <option key={p.nome}>{p.nome}</option>)}</select> : aluno.plano],
    ["Nível", mode === "edit" ? <select className="select" style={{ height: 34 }} value={edit.nivel} onChange={e => setEdit(x => ({...x, nivel: e.target.value}))}>{E.NIVEIS.map(n => <option key={n}>{n}</option>)}</select> : aluno.nivel],
    ["Carga horária", mode === "edit" ? <select className="select" style={{ height: 34 }} value={edit.cargaHoraria} onChange={e => setEdit(x => ({...x, cargaHoraria: e.target.value}))}>{E.CARGAS.map(c => <option key={c}>{c}</option>)}</select> : aluno.cargaHoraria],
    ["Mensalidade", mode === "edit" && perfil !== "Secretário"
      ? <input className="input tnum" style={{ height: 34 }} type="number" value={edit.valor} onChange={e => setEdit(x => ({...x, valor: e.target.value}))} />
      : mode === "edit" && perfil === "Secretário"
        ? <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--muted)", fontSize: 13 }}><Icon name="lock" size={14} />{E.brl(aluno.valor)} <span style={{ fontSize: 11 }}>(somente admin)</span></div>
        : E.brl(aluno.valor)],
    ["Vencimento", mode === "edit" ? <select className="select" style={{ height: 34 }} value={edit.diaVencimento} onChange={e => setEdit(x => ({...x, diaVencimento: e.target.value}))}>{[5,8,10,12,15,20,25].map(d => <option key={d} value={d}>Dia {d}</option>)}</select> : "Dia " + aluno.diaVencimento],
    ["Entrada", E.fmtDate(aluno.dataEntrada)],
  ];

  return (
    <>
    <Modal open={!!alunoInit} onClose={onClose} width={600}
      title={mode === "edit" ? "Editar aluno" : aluno.nome}
      sub={mode === "edit" ? aluno.nome + " · " + aluno.plano : aluno.plano + " · Nível " + aluno.nivel}
      icon="user">
      <div style={{ padding: 22, maxHeight: "65vh", overflowY: "auto" }}>
        {/* Action bar */}
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
          <StatusBadge status={aluno.status} />
          <span style={{ fontWeight: 600 }}>{E.brl(aluno.valor)}<span style={{ color: "var(--muted)", fontWeight: 400 }}> / mês</span></span>
          <div style={{ flex: 1 }}></div>
          {mode === "view" && canEdit && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={startEdit}><Icon name="edit" size={15} />Editar</button>
              {!isInativo && (aluno.status === "Ativo" || aluno.status === "Atrasado") && (
                confirmReativar ? null :
                <button className="btn btn-danger btn-sm" onClick={() => setInativar(true)}><Icon name="ban" size={15} />Inativar aluno</button>
              )}
              {isInativo && (
                confirmReativar ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--green-bg)", border: "1px solid var(--green)", borderRadius: 9, padding: "5px 10px" }}>
                    <span style={{ fontSize: 12.5, color: "var(--green-text)" }}>Reativar {aluno.nome.split(" ")[0]}?</span>
                    <button className="btn btn-subtle btn-sm" onClick={() => setConfirmReativar(false)}>Não</button>
                    <button className="btn btn-success btn-sm" onClick={handleReativar}>Reativar</button>
                  </div>
                ) : (
                  <button className="btn btn-success btn-sm" onClick={() => setConfirmReativar(true)}><Icon name="check" size={15} />Reativar aluno</button>
                )
              )}
            </>
          )}
          {mode === "edit" && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setMode("view")}>Cancelar</button>
              <button className="btn btn-primary btn-sm" onClick={saveEdit}><Icon name="check" size={15} />Salvar alterações</button>
            </>
          )}
        </div>

        {/* Info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px", marginBottom: 20 }}>
          {rowsInfo.map(([k, v]) => (
            <div key={k}><div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{k}</div>
              <div style={{ fontSize: 13.5, fontWeight: mode === "edit" && typeof v !== "string" ? 400 : 500, marginTop: 2 }}>{v}</div>
            </div>
          ))}
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>Professores {mode === "edit" ? "(editar)" : ""}</div>
            {mode === "edit"
              ? <MultiProfessorPicker value={edit.professores} onChange={v => setEdit(x => ({...x, professores: v}))} />
              : <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {aluno.professores.map(id => <span key={id} className="badge badge-blue"><Avatar name={E.profName(id)} size="sm" />{E.profName(id)}</span>)}
              </div>
            }
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Observações</div>
            {mode === "edit"
              ? <textarea className="textarea" value={edit.observacoes} onChange={e => setEdit(x => ({...x, observacoes: e.target.value}))} />
              : <div style={{ fontSize: 13.5 }}>{aluno.observacoes || <span className="muted">—</span>}</div>
            }
          </div>
        </div>

        {/* Agenda rápida */}
        {mode === "view" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)" }}>Agenda do aluno
                <span className="badge badge-blue" style={{ marginLeft: 8, height: 20 }}>{freqSemana}x / semana</span>
              </div>
              {isBlocked
                ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--muted)" }}><Icon name="ban" size={13} />Agendamento bloqueado — {aluno.status === "Inativo" ? "aluno inativo" : "pagamentos em atraso"}</span>
                : onVerAgenda && <button className="btn btn-subtle btn-sm" style={{ color: "var(--blue)", height: 24 }} onClick={() => onVerAgenda(aluno)}>Ver na agenda<Icon name="chevR" size={14} /></button>
              }
            </div>
            <div className="card" style={{ overflow: "hidden", marginBottom: 20 }}>
              {isBlocked
                ? <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}><Icon name="ban" size={14} />{aluno.status === "Inativo" ? "Aluno inativo" : "Aluno com pagamentos em atraso"} — nenhuma nova aula pode ser agendada.</div>
                : proximas.length === 0
                  ? <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--muted)" }}>Sem aulas futuras agendadas.</div>
                  : proximas.map((ev, i) => (
                    <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 14px", borderBottom: i < proximas.length - 1 ? "1px solid var(--line)" : "none" }}>
                      <span style={{ width: 34, height: 34, borderRadius: 8, background: "var(--blue-50)", color: "var(--blue)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="calendar" size={16} /></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{E.WEEKDAYS_FULL[ev.start.getDay()]} · {E.hhmm(ev.start)} <span className="muted" style={{ fontWeight: 400 }}>· {ev.dur} min</span></div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>com {E.profName(ev.profId)}{ev.observacoes ? " · " + ev.observacoes : ""}</div>
                      </div>
                      <span className="muted tnum" style={{ fontSize: 12 }}>{E.fmtDate(ev.start)}</span>
                    </div>
                  ))
              }
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)", marginBottom: 8 }}>Histórico financeiro recente</div>
            <div className="card" style={{ overflow: "hidden" }}>
              {pagamentos.map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: i < pagamentos.length - 1 ? "1px solid var(--line)" : "none" }}>
                  <div style={{ fontSize: 13 }}>{p.competencia} <span className="muted">· {p.forma}</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="tnum" style={{ fontWeight: 500, fontSize: 13 }}>{E.brl(p.valor)}</span>
                    <StatusBadge status={p.status} short />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
    <InativarAlunoModal open={inativar} aluno={aluno} onClose={() => setInativar(false)} onConfirm={handleInativar} />
    </>
  );
}


function AlunosScreen({ initialFilter, perfil, onNav }) {
  const E = window.ESM;
  const toast = useToast();
  const [extra, setExtra] = useState([]); // newly created students
  const [status, setStatus] = useState(initialFilter?.status || "todos");
  const [prof, setProf] = useState("todos");
  const [q, setQ] = useState("");
  const [novo, setNovo] = useState(false);
  const [detail, setDetail] = useState(null);

  useEffect(() => { if (initialFilter?.status) setStatus(initialFilter.status); }, [initialFilter]);

  const all = [...extra, ...E.alunos];
  const risco = all.filter(a => a.status === "Atrasado");
  const counts = { todos: all.length };
  E.STATUSES.forEach(s => counts[s] = all.filter(a => a.status === s).length);
  counts["risco"] = risco.length;
  const [statusOverrides, setStatusOverrides] = useState({});
  function handleStatusChange(id, novoStatus) { setStatusOverrides(o => ({...o, [id]: novoStatus})); }

  const allEff = all.map(a => statusOverrides[a.id] ? {...a, status: statusOverrides[a.id]} : a);

  const filtered = allEff.filter(a => {
    if (status === "risco") return a.status === "Atrasado";
    if (status !== "todos" && a.status !== status) return false;
    if (prof !== "todos" && !a.professores.includes(prof)) return false;
    if (q) {
      const t = q.toLowerCase();
      if (!(a.nome.toLowerCase().includes(t) || a.email.toLowerCase().includes(t) || a.telefone.includes(t))) return false;
    }
    return true;
  });

  const statusOpts = [
    { value: "todos", label: "Todos" },
    { value: "Ativo", label: "Ativos" },
    { value: "Atrasado", label: "Atrasados" },
    { value: "Pendente de Validação", label: "Pend. validação" },
    { value: "Inativo", label: "Inativos" },
    { value: "risco", label: "⚠️ Risco de inativação" },
  ];

  const cols = [
    { label: "Nome", get: a => a.nome }, { label: "Telefone", get: a => a.telefone },
    { label: "Email", get: a => a.email }, { label: "Professor(es)", get: a => a.professores.map(E.profName).join(", ") },
    { label: "Plano", get: a => a.plano }, { label: "Nível", get: a => a.nivel },
    { label: "Mensalidade", get: a => a.valor }, { label: "Vencimento", get: a => "Dia " + a.diaVencimento },
    { label: "Status", get: a => a.status },
  ];
  function doExport(kind) {
    const fn = "alunos_" + (status === "todos" ? "todos" : status.replace(/\s+/g, "-").toLowerCase());
    (kind === "csv" ? exportCSV : exportXLSX)(fn, cols, filtered);
    toast("Exportado " + filtered.length + " alunos (" + kind.toUpperCase() + ") respeitando os filtros.");
  }
  function saveNovo(f) {
    const novo = {
      id: "a-new-" + Date.now(), nome: f.nome, email: f.email || "—", telefone: f.telefone,
      plano: f.plano, nivel: f.nivel, valor: Number(f.valor), diaVencimento: Number(f.diaVencimento),
      dataEntrada: f.dataEntrada ? new Date(f.dataEntrada) : E.TODAY, professores: f.professores,
      cargaHoraria: f.cargaHoraria, observacoes: f.observacoes, status: "Ativo",
    };
    setExtra(x => [novo, ...x]);
    setNovo(false);
    toast("Aluno '" + f.nome + "' cadastrado. Ação registrada na auditoria.");
  }

  return (
    <Page>
      <PageSection title="Alunos" sub={filtered.length + " de " + all.length + " alunos"}
        action={
          <div style={{ display: "flex", gap: 10 }}>
            <ExportMenu onExport={doExport} />
            <button className="btn btn-primary btn-sm" onClick={() => setNovo(true)}><Icon name="plus" size={16} />Novo aluno</button>
          </div>
        }>
        {/* Toolbar */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap", justifyContent: "space-between" }}>
          <FilterChips options={statusOpts} value={status} onChange={setStatus} counts={counts} />
          <div style={{ display: "flex", gap: 10 }}>
            <select className="select" style={{ width: 200, height: 38 }} value={prof} onChange={e => setProf(e.target.value)}>
              <option value="todos">Todos os professores</option>
              {E.professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <SearchInput value={q} onChange={setQ} placeholder="Buscar nome, email, telefone…" />
          </div>
        </div>

        <div className="card tbl-wrap">
          <table className="tbl">
            <thead><tr>
              <th>Nome</th><th>Telefone</th><th>Professor(es)</th><th>Data de Cadastro</th>
              <th>Mensalidade</th><th>Vencimento</th><th>Status</th><th style={{ width: 40 }}></th>
            </tr></thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} style={{ cursor: "pointer" }} onClick={() => setDetail(a)}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <Avatar name={a.nome} size="md" />
                    <div><div style={{ fontWeight: 500, color: "var(--ink)" }}>{a.nome}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{a.email}</div></div>
                  </div></td>
                  <td className="muted tnum">{a.telefone}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {a.professores.slice(0, 3).map((id, i) => (
                        <span key={id} title={E.profName(id)} style={{ marginLeft: i ? -8 : 0, border: "2px solid var(--surface)", borderRadius: 99 }}><Avatar name={E.profName(id)} size="sm" /></span>
                      ))}
                      {a.professores.length > 1 && <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>{a.professores.length} profs.</span>}
                    </div>
                  </td>
                  <td className="muted tnum">{E.fmtDate(a.dataEntrada)}</td>
                  <td className="tnum" style={{ fontWeight: 500, color: "var(--ink)" }}>{E.brl(a.valor)}</td>
                  <td className="muted tnum">Dia {a.diaVencimento}</td>
                  <td><StatusBadge status={a.status} short /></td>
                  <td><span style={{ color: "var(--muted-2)" }}><Icon name="chevR" size={16} /></span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <Empty icon="search" title="Nenhum aluno encontrado" sub="Ajuste os filtros ou a busca." />}
        </div>
      </PageSection>

      <NovoAlunoModal open={novo} onClose={() => setNovo(false)} onSave={saveNovo} />
      <AlunoDetail aluno={detail} onClose={() => setDetail(null)}
        onVerAgenda={onNav ? (a) => { setDetail(null); onNav("agenda", { profId: a.professores[0], focusAluno: a.id }); } : null}
        onStatusChange={handleStatusChange} perfil={perfil} />
    </Page>
  );
}

Object.assign(window, { AlunosScreen, NovoAlunoModal, AlunoDetail });
