/* ============================================================
   Agenda — calendário Dia / Semana / Mês
   Admin/Secretaria: veem todos ou individual (somente leitura)
   Professor: gerencia a própria agenda (criar / reagendar / cancelar)
   ============================================================ */

const H_START = 7, H_END = 21, ROW_H = 46; // 7h–21h

function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function startOfWeek(d) { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); x.setHours(0, 0, 0, 0); return x; }
function ymd(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function profHue(id) { return avColor(window.ESM.profName(id)); }

/* Interval-partition events of one day into columns to avoid overlap */
function layoutDay(events) {
  const sorted = [...events].sort((a, b) => a.start - b.start || b.dur - a.dur);
  const out = [];
  let cluster = [], clusterEnd = 0;
  function flush() {
    // assign columns within cluster
    const cols = [];
    cluster.forEach(ev => {
      let placed = false;
      for (let c = 0; c < cols.length; c++) {
        if (cols[c] <= ev.start.getTime()) { ev._col = c; cols[c] = ev.start.getTime() + ev.dur * 60000; placed = true; break; }
      }
      if (!placed) { ev._col = cols.length; cols.push(ev.start.getTime() + ev.dur * 60000); }
    });
    cluster.forEach(ev => { ev._cols = cols.length; out.push(ev); });
    cluster = [];
  }
  sorted.forEach(ev => {
    const s = ev.start.getTime(), e = s + ev.dur * 60000;
    if (cluster.length && s >= clusterEnd) flush();
    cluster.push(ev); clusterEnd = Math.max(clusterEnd, e);
  });
  if (cluster.length) flush();
  return out;
}

/* ---------- Event block (week/day) ---------- */
function EventBlock({ ev, onClick, dayStart }) {
  const E = window.ESM;
  const top = ((ev.start.getHours() - H_START) + ev.start.getMinutes() / 60) * ROW_H;
  const height = Math.max(ev.dur / 60 * ROW_H - 3, 22);
  const cancelled = ev.status === "Cancelada";
  const hue = profHue(ev.profId);
  const w = 100 / (ev._cols || 1);
  return (
    <button onClick={() => onClick(ev)} title={ev.aluno}
      style={{ position: "absolute", top: top + 1, height, left: `calc(${(ev._col || 0) * w}% + 2px)`, width: `calc(${w}% - 4px)`,
        background: cancelled ? "var(--surface)" : hue + "1f", borderLeft: "3px solid " + hue,
        border: "1px solid " + (cancelled ? "var(--line-2)" : hue + "55"), borderLeftWidth: 3,
        borderRadius: 7, padding: "4px 7px", textAlign: "left", overflow: "hidden", cursor: "pointer",
        opacity: cancelled ? 0.55 : 1, textDecoration: cancelled ? "line-through" : "none", transition: "transform .1s" }}
      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.01)"}
      onMouseLeave={e => e.currentTarget.style.transform = "none"}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.aluno}</div>
      <div style={{ fontSize: 10.5, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{E.hhmm(ev.start)} · {ev.dur}min</div>
      {height > 52 && ev.observacoes && <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>{ev.observacoes}</div>}
    </button>
  );
}

/* ---------- Time grid (week or day) ---------- */
function TimeGrid({ days, events, onEventClick, onSlotClick }) {
  const E = window.ESM;
  const hours = []; for (let h = H_START; h < H_END; h++) hours.push(h);
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {/* header row */}
      <div style={{ display: "grid", gridTemplateColumns: `56px repeat(${days.length}, 1fr)`, borderBottom: "1px solid var(--line)", background: "var(--surface-2)" }}>
        <div></div>
        {days.map((d, i) => {
          const today = sameDay(d, E.TODAY);
          return (
            <div key={i} style={{ padding: "10px 8px", textAlign: "center", borderLeft: "1px solid var(--line)" }}>
              <div style={{ fontSize: 11.5, color: today ? "var(--blue)" : "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".03em" }}>{E.WEEKDAYS[d.getDay()]}</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2, color: today ? "var(--blue)" : "var(--ink)", width: 30, height: 30, borderRadius: 99, display: "grid", placeItems: "center", margin: "2px auto 0", background: today ? "var(--blue-50)" : "transparent" }}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>
      {/* scroll body */}
      <div style={{ maxHeight: 560, overflowY: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: `56px repeat(${days.length}, 1fr)`, position: "relative" }}>
          {/* hour labels */}
          <div>
            {hours.map(h => <div key={h} style={{ height: ROW_H, fontSize: 11, color: "var(--muted-2)", textAlign: "right", paddingRight: 8, transform: "translateY(-6px)" }}>{String(h).padStart(2, "0")}:00</div>)}
          </div>
          {/* day columns */}
          {days.map((d, di) => {
            const dayEvents = layoutDay(events.filter(ev => sameDay(ev.start, d)));
            return (
              <div key={di} style={{ position: "relative", borderLeft: "1px solid var(--line)" }}>
                {hours.map((h, hi) => (
                  <div key={h} onClick={() => onSlotClick && onSlotClick(d, h)}
                    style={{ height: ROW_H, borderBottom: "1px solid var(--line)", cursor: onSlotClick ? "pointer" : "default" }}></div>
                ))}
                {dayEvents.map(ev => <EventBlock key={ev.id} ev={ev} onClick={onEventClick} />)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Month grid ---------- */
function MonthGrid({ refDate, events, onEventClick, onDayClick }) {
  const E = window.ESM;
  const first = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const cells = []; for (let i = 0; i < 42; i++) cells.push(addDays(gridStart, i));
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid var(--line)", background: "var(--surface-2)" }}>
        {E.WEEKDAYS.map(w => <div key={w} style={{ padding: "9px 10px", fontSize: 11.5, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".03em", textAlign: "center" }}>{w}</div>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gridAutoRows: "minmax(104px, 1fr)" }}>
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === refDate.getMonth();
          const today = sameDay(d, E.TODAY);
          const dayEvents = events.filter(ev => sameDay(ev.start, d) && ev.status !== "Cancelada").sort((a, b) => a.start - b.start);
          return (
            <div key={i} onClick={() => onDayClick && onDayClick(d)} style={{ borderLeft: i % 7 ? "1px solid var(--line)" : "none", borderTop: i >= 7 ? "1px solid var(--line)" : "none", padding: 6, background: inMonth ? "var(--surface)" : "var(--surface-2)", minHeight: 104, cursor: onDayClick ? "pointer" : "default" }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: today ? "#fff" : inMonth ? "var(--ink-2)" : "var(--muted-2)", width: 22, height: 22, borderRadius: 99, display: "grid", placeItems: "center", background: today ? "var(--blue)" : "transparent", marginBottom: 3 }}>{d.getDate()}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {dayEvents.slice(0, 3).map(ev => {
                  const hue = profHue(ev.profId);
                  return (
                    <button key={ev.id} onClick={e => { e.stopPropagation(); onEventClick(ev); }}
                      style={{ display: "flex", alignItems: "center", gap: 5, background: hue + "1f", border: "none", borderRadius: 5, padding: "2px 5px", textAlign: "left", cursor: "pointer", width: "100%" }}>
                      <span style={{ width: 5, height: 5, borderRadius: 99, background: hue, flex: "none" }}></span>
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{E.hhmm(ev.start)} {ev.aluno.split(" ")[0]}</span>
                    </button>
                  );
                })}
                {dayEvents.length > 3 && <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 600, paddingLeft: 5 }}>+{dayEvents.length - 3} mais</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Aula modal (detalhe / criar / reagendar / cancelar) ---------- */
function AulaModal({ open, onClose, ev, canEdit, alunosDisponiveis, profId, onSave, onCancelAula }) {
  const E = window.ESM;
  const toast = useToast();
  const isNew = ev && ev.__new;
  const [edit, setEdit] = useState(false);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("08:00");
  const [dur, setDur] = useState(60);
  const [alunoId, setAlunoId] = useState("");
  const [obs, setObs] = useState("");

  useEffect(() => {
    if (!open || !ev) return;
    setEdit(!!ev.__new);
    setData(ymd(ev.start || E.TODAY));
    setHora(ev.start ? E.hhmm(ev.start) : "08:00");
    setDur(ev.dur || 60);
    setAlunoId(ev.alunoId || (alunosDisponiveis[0] && alunosDisponiveis[0].id) || "");
    setObs(ev.observacoes || "");
  }, [open, ev]);

  if (!ev) return null;

  function build() {
    const [hh, mm] = hora.split(":").map(Number);
    const [y, mo, dd] = data.split("-").map(Number);
    const start = new Date(y, mo - 1, dd, hh, mm, 0, 0);
    const aluno = E.alunoById(alunoId);
    return { ...ev, alunoId, aluno: aluno ? aluno.nome : ev.aluno, start, dur: Number(dur), observacoes: obs, status: "Agendada", __new: false };
  }

  const title = isNew ? "Nova aula" : ev.aluno;
  const cancelled = ev.status === "Cancelada";

  return (
    <Modal open={open} onClose={onClose} width={480} title={title} sub={isNew ? "Agende uma nova aula" : (E.WEEKDAYS_FULL[ev.start.getDay()] + " · " + E.fmtDate(ev.start))} icon="calendar">
      <div style={{ padding: 22 }}>
        {!edit ? (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <span className={"badge " + (cancelled ? "badge-red" : ev.status === "Realizada" ? "badge-green" : "badge-blue")}><span className="dot"></span>{ev.status}</span>
            </div>
            <div style={{ display: "grid", gap: 13 }}>
              {[["Aluno", ev.aluno], ["Professor", E.profName(ev.profId)], ["Horário", E.hhmm(ev.start) + " – " + E.hhmm(new Date(ev.start.getTime() + ev.dur * 60000))], ["Duração", ev.dur + " minutos"], ["Observações", ev.observacoes || "—"]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 16, paddingBottom: 11, borderBottom: "1px solid var(--line)" }}>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{k}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, textAlign: "right" }}>{v}</span>
                </div>
              ))}
            </div>
            {canEdit && !cancelled && (
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEdit(true)}><Icon name="repeat" size={16} />Reagendar</button>
                <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => { onCancelAula(ev); toast("Aula de " + ev.aluno + " cancelada.", "warn"); onClose(); }}><Icon name="ban" size={16} />Cancelar aula</button>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {isNew && (
              <div className="field"><label>Aluno</label>
                <select className="select" value={alunoId} onChange={e => setAlunoId(e.target.value)}>
                  {alunosDisponiveis.map(a => <option key={a.id} value={a.id}>{a.nome}{a.status === "Inativo" ? " (inativo)" : ""}</option>)}
                </select>
                {(() => { const sel = alunosDisponiveis.find(a => a.id === alunoId); return sel && (sel.status === "Inativo" || sel.status === "Atrasado") ? (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "var(--amber-bg)", border: "1px solid var(--amber)", borderRadius: 9, padding: "9px 12px", fontSize: 12.5, color: "var(--amber-text)", marginTop: 6 }}>
                    <Icon name="alert" size={15} style={{ flex: "none", marginTop: 1 }} />
                    {sel.nome} está {sel.status === "Inativo" ? "inativo" : "com pagamentos em atraso"}. Novos agendamentos não são permitidos.
                  </div>
                ) : null; })()}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
              <div className="field"><label>Data</label><input className="input" type="date" value={data} onChange={e => setData(e.target.value)} /></div>
              <div className="field"><label>Horário</label><input className="input" type="time" value={hora} onChange={e => setHora(e.target.value)} step="900" /></div>
            </div>
            <div className="field"><label>Duração</label>
              <select className="select" value={dur} onChange={e => setDur(Number(e.target.value))}>
                {[30, 45, 60, 90, 120].map(d => <option key={d} value={d}>{d} minutos</option>)}
              </select>
            </div>
            <div className="field"><label>Observações</label><textarea className="textarea" value={obs} onChange={e => setObs(e.target.value)} placeholder="Conteúdo da aula, foco, material…" /></div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
              <button className="btn btn-ghost" onClick={() => isNew ? onClose() : setEdit(false)}>Cancelar</button>
              <button className="btn btn-primary"
                disabled={isNew && (() => { const sel = alunosDisponiveis.find(a => a.id === alunoId); return sel && (sel.status === "Inativo" || sel.status === "Atrasado"); })()}
                onClick={() => { onSave(build()); toast(isNew ? "Aula agendada." : "Aula reagendada."); onClose(); }}><Icon name="check" size={16} />{isNew ? "Agendar aula" : "Salvar"}</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ---------- Tela principal ---------- */
function AgendaScreen({ user, initialParams }) {
  const E = window.ESM;
  const isProf = user.perfil === "Professor";
  const myId = isProf ? user.id : null;

  const [events, setEvents] = useState(() => E.agenda.map(e => ({ ...e })));
  const [view, setView] = useState("semana");
  const [ref, setRef] = useState(new Date(E.TODAY));
  const [profFilter, setProfFilter] = useState(isProf ? myId : (initialParams?.profId || "todos"));
  const [modal, setModal] = useState(null); // event or {__new}

  const canEdit = isProf;

  const shown = events.filter(ev => {
    if (isProf) return ev.profId === myId;
    if (profFilter !== "todos") return ev.profId === profFilter;
    return true;
  });

  // navigation
  function shift(dir) {
    if (view === "dia") setRef(r => addDays(r, dir));
    else if (view === "semana") setRef(r => addDays(r, dir * 7));
    else setRef(r => new Date(r.getFullYear(), r.getMonth() + dir, 1));
  }
  const weekDays = []; { const s = startOfWeek(ref); for (let i = 0; i < 7; i++) weekDays.push(addDays(s, i)); }

  let rangeLabel;
  if (view === "dia") rangeLabel = E.WEEKDAYS_FULL[ref.getDay()] + ", " + ref.getDate() + " de " + E.MESES_FULL[ref.getMonth()];
  else if (view === "semana") rangeLabel = weekDays[0].getDate() + " – " + weekDays[6].getDate() + " de " + E.MESES_FULL[weekDays[6].getMonth()] + " " + weekDays[6].getFullYear();
  else rangeLabel = E.MESES_FULL[ref.getMonth()] + " " + ref.getFullYear();

  function openSlot(day, hour) {
    if (!canEdit) return;
    const start = new Date(day); start.setHours(hour, 0, 0, 0);
    setModal({ __new: true, id: "ev-new-" + Date.now(), profId: myId, start, dur: 60, observacoes: "", status: "Agendada", alunoId: "" });
  }
  function saveEvent(updated) {
    setEvents(evs => {
      const exists = evs.some(e => e.id === updated.id);
      return exists ? evs.map(e => e.id === updated.id ? updated : e) : [...evs, updated];
    });
  }
  function cancelEvent(ev) { setEvents(evs => evs.map(e => e.id === ev.id ? { ...e, status: "Cancelada" } : e)); }

  const myStudents = isProf ? E.alunos.filter(a => a.professores.includes(myId) && a.status !== "Inativo") : [];

  return (
    <Page max={1320}>
      <PageSection
        title={isProf ? "Minha agenda" : "Agenda dos professores"}
        sub={isProf ? "Gerencie suas aulas — crie, reagende ou cancele" : "Visualize a agenda de todos os professores ou individual"}
        action={canEdit ? <button className="btn btn-primary btn-sm" onClick={() => { const start = new Date(E.TODAY); start.setHours(8, 0, 0, 0); setModal({ __new: true, id: "ev-new-" + Date.now(), profId: myId, start, dur: 60, observacoes: "", status: "Agendada", alunoId: "" }); }}><Icon name="plus" size={16} />Nova aula</button> : null}>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => shift(-1)}><Icon name="chevL" size={16} /></button>
            <button className="btn btn-ghost btn-sm" onClick={() => setRef(new Date(E.TODAY))}>Hoje</button>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => shift(1)}><Icon name="chevR" size={16} /></button>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, minWidth: 200, textTransform: "capitalize" }}>{rangeLabel}</div>
          <div style={{ flex: 1 }}></div>
          {!isProf && (
            <select className="select" style={{ width: 220, height: 36 }} value={profFilter} onChange={e => setProfFilter(e.target.value)}>
              <option value="todos">Todos os professores</option>
              {E.professores.filter(p => p.status === "Ativo").map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          )}
          <div style={{ display: "flex", background: "var(--hover)", borderRadius: 9, padding: 3, gap: 2 }}>
            {[["dia", "Dia"], ["semana", "Semana"], ["mes", "Mês"]].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} style={{ height: 30, padding: "0 14px", borderRadius: 7, border: "none", fontSize: 13, fontWeight: 600, background: view === v ? "var(--surface)" : "transparent", color: view === v ? "var(--ink)" : "var(--muted)", boxShadow: view === v ? "var(--sh-sm)" : "none" }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Legend (admin todos) */}
        {!isProf && profFilter === "todos" && (
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
            {E.professores.filter(p => p.status === "Ativo").map(p => (
              <span key={p.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: profHue(p.id) }}></span>{p.nome.split(" ")[0]}
              </span>
            ))}
          </div>
        )}

        {view === "mes"
          ? <MonthGrid refDate={ref} events={shown} onEventClick={setModal} onDayClick={d => { setRef(d); setView("dia"); }} />
          : <TimeGrid days={view === "dia" ? [ref] : weekDays} events={shown} onEventClick={setModal} onSlotClick={canEdit ? openSlot : null} />}

        {canEdit && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}><Icon name="plus" size={13} />Clique em um horário vazio para agendar uma nova aula.</div>}
      </PageSection>

      <AulaModal open={!!modal} ev={modal} onClose={() => setModal(null)} canEdit={canEdit}
        alunosDisponiveis={myStudents} profId={myId} onSave={saveEvent} onCancelAula={cancelEvent} />
    </Page>
  );
}

Object.assign(window, { AgendaScreen });
