/* ============================================================
   Financeiro + Validação de comprovantes
   M2: ComprovanteUploader (4 estados)
   M4: RejeicaoModal com motivo obrigatório
   ============================================================ */

/* Fake comprovante preview */
function ComprovantePreview({ pag }) {
  const E = window.ESM;
  const isPix = pag.forma === "PIX";
  return (
    <div style={{ background: "var(--hover)", borderRadius: 12, padding: 18, display: "grid", placeItems: "center" }}>
      <div style={{ width: 280, background: "var(--surface)", borderRadius: 10, boxShadow: "var(--sh)", overflow: "hidden" }}>
        <div style={{ background: isPix ? "#0F8C6C" : "#1E3A8A", color: "#fff", padding: "14px 16px", display: "flex", alignItems: "center", gap: 9 }}>
          <Icon name={isPix ? "checkCircle" : "receipt"} size={18} />
          <div style={{ fontWeight: 700, fontSize: 14 }}>{isPix ? "Comprovante PIX" : "Boleto pago"}</div>
        </div>
        <div style={{ padding: "16px 16px 18px" }}>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Valor</div>
          <div style={{ fontSize: 23, fontWeight: 700, marginBottom: 12 }}>{E.brl(pag.valor)}</div>
          {[["Pagador", pag.aluno], ["Recebedor", "English School LTDA"], ["Competência", pag.competencia], ["Data", E.fmtDate(pag.vencimento)]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "5px 0", borderBottom: "1px dashed var(--line-2)" }}>
              <span style={{ color: "var(--muted)" }}>{k}</span><span style={{ fontWeight: 600, maxWidth: 150, textAlign: "right" }} className="truncate">{v}</span>
            </div>
          ))}
          <div style={{ marginTop: 14, height: 40, background: isPix
            ? "conic-gradient(var(--ink) 0 25%, var(--surface) 0 50%, var(--ink) 0 75%, var(--surface) 0)"
            : "repeating-linear-gradient(90deg,var(--ink) 0 2px,var(--surface) 2px 4px,var(--ink) 4px 5px,var(--surface) 5px 9px)", borderRadius: 4 }}></div>
        </div>
      </div>
    </div>
  );
}

/* ---- M2: ComprovanteUploader ---- */
const FAKE_HASHES = ["a3f2b1c9", "d7e4f890", "1b2c3d4e", "9f8e7d6c", "4a5b6c7d"];
function shortHash() { return FAKE_HASHES[Math.floor(Math.random() * FAKE_HASHES.length)] + "..." + Math.random().toString(16).slice(2, 6); }

function ComprovanteUploader({ forma, aluno, onStateChange }) {
  const [state, setState] = useState("idle");
  const [hashVal, setHashVal] = useState("");

  function set(s) { setState(s); onStateChange(s); }

  function handleClick() {
    set("verificando");
    setHashVal(shortHash());
    setTimeout(() => set(Math.random() < 0.3 ? "duplicata" : "aprovado"), 1200);
  }

  const filename = forma === "PIX" ? "comprovante-pix.png" : "boleto-pago.pdf";

  if (forma === "Cartão") return (
    <div style={{ fontSize: 13, color: "var(--muted)", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px" }}>
      Pagamentos por cartão são confirmados automaticamente — não exigem comprovante.
    </div>
  );

  if (state === "idle") return (
    <button onClick={handleClick} style={{ width: "100%", border: "1.5px dashed var(--chip-border)", borderRadius: 10, background: "var(--surface-2)", padding: "18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "var(--muted)" }}>
      <Icon name="download" size={20} style={{ transform: "rotate(180deg)" }} />
      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>Clique para anexar o comprovante</span>
      <span style={{ fontSize: 12 }}>PNG, JPG ou PDF · até 5 MB</span>
    </button>
  );

  if (state === "verificando") return (
    <div style={{ border: "1px solid var(--blue-100)", background: "var(--blue-50)", borderRadius: 10, padding: "16px 14px", display: "flex", alignItems: "center", gap: 12 }}>
      <Icon name="clock" size={20} className="spin" style={{ color: "var(--blue)", flex: "none" }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--blue)" }}>Verificando autenticidade do arquivo…</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Calculando hash SHA-256 e verificando duplicatas</div>
      </div>
    </div>
  );

  if (state === "aprovado") return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 14px" }}>
      <span style={{ width: 34, height: 34, borderRadius: 8, background: "var(--green-bg)", color: "var(--green-text)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="file" size={17} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{filename}</div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", fontFamily: "monospace" }}>SHA256: {hashVal} · 248 KB</div>
      </div>
      <button className="btn btn-subtle btn-icon btn-sm" onClick={() => set("idle")}><Icon name="x" size={16} /></button>
    </div>
  );

  if (state === "duplicata") return (
    <div style={{ background: "var(--red-bg)", border: "1px solid var(--red-border)", borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
        <Icon name="alert" size={18} style={{ color: "var(--red-text)", flex: "none" }} />
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--red-text)" }}>Comprovante já utilizado</span>
      </div>
      <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "var(--red-text)", lineHeight: 1.5 }}>
        Este arquivo já foi registrado anteriormente. Não é possível reutilizar comprovantes.
      </p>
      <button className="btn btn-danger btn-sm" onClick={() => set("idle")}><Icon name="repeat" size={14} />Enviar outro comprovante</button>
    </div>
  );

  return null;
}

/* ---- Registrar pagamento ---- */
function RegistrarPagamentoModal({ open, onClose, onSave }) {
  const E = window.ESM;
  const [alunoId, setAlunoId] = useState("");
  const [q, setQ] = useState("");
  const [forma, setForma] = useState("PIX");
  const [uploadState, setUploadState] = useState("idle");
  useEffect(() => { if (open) { setAlunoId(""); setQ(""); setForma("PIX"); setUploadState("idle"); } }, [open]);

  const aluno = E.alunoById(alunoId);
  const matches = q ? E.alunos.filter(a => a.nome.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  const needsComp = forma !== "Cartão";
  const canSave = aluno && (!needsComp || uploadState === "aprovado");

  return (
    <Modal open={open} onClose={onClose} width={560} title="Registrar pagamento" sub="Localize o aluno, informe a forma e anexe o comprovante" icon="wallet">
      <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Step 1 */}
        <div className="field">
          <label>1 · Localizar aluno</label>
          {!aluno ? (
            <div style={{ position: "relative" }}>
              <SearchInput value={q} onChange={setQ} placeholder="Digite o nome do aluno…" width="100%" />
              {matches.length > 0 && (
                <div className="card" style={{ position: "absolute", left: 0, right: 0, top: 44, zIndex: 30, padding: 6, boxShadow: "var(--sh-lg)" }}>
                  {matches.map(a => (
                    <button key={a.id} onClick={() => { setAlunoId(a.id); setQ(""); }}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 9px", border: "none", background: "transparent", borderRadius: 8, textAlign: "left" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <Avatar name={a.nome} size="sm" />
                      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{a.nome}</span>
                      <span className="tnum muted" style={{ fontSize: 12.5 }}>{E.brl(a.valor)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--blue-50)", borderColor: "var(--blue-100)" }}>
              <Avatar name={aluno.nome} size="md" />
              <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13.5 }}>{aluno.nome}</div><div style={{ fontSize: 12, color: "var(--muted)" }}>{aluno.plano} · {E.brl(aluno.valor)}/mês</div></div>
              <button className="btn btn-subtle btn-sm" onClick={() => setAlunoId("")}>Trocar</button>
            </div>
          )}
        </div>

        {/* Step 2 */}
        <div className="field">
          <label>2 · Forma de pagamento</label>
          <div style={{ display: "flex", gap: 8 }}>
            {E.FORMAS.map(fo => (
              <button key={fo} onClick={() => { setForma(fo); setUploadState("idle"); }}
                style={{ flex: 1, height: 44, borderRadius: 10, border: "1px solid " + (forma === fo ? "var(--blue)" : "var(--line-2)"), background: forma === fo ? "var(--blue-50)" : "var(--surface)", color: forma === fo ? "var(--blue)" : "var(--ink-2)", fontWeight: 600, fontSize: 13.5 }}>
                {fo}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: M2 uploader */}
        <div className="field">
          <label>3 · Comprovante {needsComp ? "(obrigatório)" : ""}</label>
          <ComprovanteUploader key={forma + alunoId} forma={forma} aluno={aluno} onStateChange={setUploadState} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "16px 22px", borderTop: "1px solid var(--line)", background: "var(--surface-2)" }}>
        <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{needsComp ? "Gerará status Pendente de Validação." : "Será marcado como Pago."}</span>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!canSave} onClick={() => onSave({ aluno, forma, comprovante: needsComp })}><Icon name="check" size={16} />Registrar</button>
        </div>
      </div>
    </Modal>
  );
}

/* ---- FinanceiroScreen ---- */
function FinanceiroScreen({ perfil }) {
  const E = window.ESM;
  const toast = useToast();
  const [status, setStatus] = useState("todos");
  const [forma, setForma] = useState("todas");
  const [q, setQ] = useState("");
  const [reg, setReg] = useState(false);
  const isAdmin = perfil === "Administrador";

  const all = E.pagamentos;
  const filtered = all.filter(p => {
    if (status !== "todos" && p.status !== status) return false;
    if (forma !== "todas" && p.forma !== forma) return false;
    if (q && !p.aluno.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const counts = { todos: all.length };
  ["Pago", "Atrasado", "Pendente de Validação"].forEach(s => counts[s] = all.filter(p => p.status === s).length);

  const cols = [
    { label: "Aluno", get: p => p.aluno }, { label: "Competência", get: p => p.competencia },
    { label: "Valor", get: p => p.valor }, { label: "Forma", get: p => p.forma },
    { label: "Vencimento", get: p => E.fmtDate(p.vencimento) }, { label: "Status", get: p => p.status },
    { label: "Comprovante", get: p => p.comprovante ? "Sim" : "Não" },
  ];
  function doExport(kind) {
    (kind === "csv" ? exportCSV : exportXLSX)("financeiro", cols, filtered);
    toast("Exportado " + filtered.length + " lançamentos (" + kind.toUpperCase() + ").");
  }

  const statusOpts = [
    { value: "todos", label: "Todos" }, { value: "Pago", label: "Pagos" },
    { value: "Atrasado", label: "Atrasados" }, { value: "Pendente de Validação", label: "Pend. validação" },
  ];

  return (
    <Page>
      {isAdmin && (
        <PageSection>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
            <KpiCard label="Receita prevista (mai/26)" value={E.brl(E.finance.receitaPrevista)} icon="wallet" tone="blue" />
            <KpiCard label="Recebida" value={E.brl(E.finance.receitaRecebida)} icon="trendUp" tone="green" />
            <KpiCard label="Inadimplência" value={E.brl(E.finance.inadimplencia)} icon="alert" tone="red" sub={(E.finance.taxaInad * 100).toFixed(1) + "% da receita prevista"} />
          </div>
        </PageSection>
      )}

      <PageSection title={isAdmin ? "Lançamentos financeiros" : "Pagamentos"} sub={filtered.length + " lançamentos"}
        action={
          <div style={{ display: "flex", gap: 10 }}>
            <ExportMenu onExport={doExport} />
            <button className="btn btn-primary btn-sm" onClick={() => setReg(true)}><Icon name="plus" size={16} />Registrar pagamento</button>
          </div>
        }>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap", justifyContent: "space-between" }}>
          <FilterChips options={statusOpts} value={status} onChange={setStatus} counts={counts} />
          <div style={{ display: "flex", gap: 10 }}>
            <select className="select" style={{ width: 160, height: 38 }} value={forma} onChange={e => setForma(e.target.value)}>
              <option value="todas">Todas as formas</option>
              {E.FORMAS.map(f => <option key={f}>{f}</option>)}
            </select>
            <SearchInput value={q} onChange={setQ} placeholder="Buscar aluno…" width={240} />
          </div>
        </div>
        <div className="card tbl-wrap">
          <table className="tbl">
            <thead><tr>
              <th>Aluno</th><th>Competência</th><th>Valor</th><th>Forma</th><th>Vencimento</th><th>Comprovante</th><th>Status</th>
            </tr></thead>
            <tbody>
              {filtered.slice(0, 60).map(p => (
                <tr key={p.id}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 11 }}><Avatar name={p.aluno} size="md" /><span style={{ fontWeight: 500, color: "var(--ink)" }}>{p.aluno}</span></div></td>
                  <td className="muted">{p.competencia}</td>
                  <td className="tnum" style={{ fontWeight: 500, color: "var(--ink)" }}>{E.brl(p.valor)}</td>
                  <td><span className="badge badge-gray">{p.forma}</span></td>
                  <td className="muted tnum">{E.fmtDate(p.vencimento)}</td>
                  <td>{p.comprovante
                    ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--blue)", fontWeight: 500 }}><Icon name="file" size={15} />{p.comprovanteNome}</span>
                    : <span className="muted" style={{ fontSize: 12.5 }}>{p.forma === "Cartão" ? "Automático" : "—"}</span>}</td>
                  <td><StatusBadge status={p.status} short /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <Empty icon="search" title="Nenhum lançamento" sub="Ajuste os filtros." />}
          {filtered.length > 60 && <div style={{ padding: "12px 16px", fontSize: 12.5, color: "var(--muted)", textAlign: "center", borderTop: "1px solid var(--line)" }}>Exibindo 60 de {filtered.length} · refine os filtros para ver mais</div>}
        </div>
      </PageSection>

      <RegistrarPagamentoModal open={reg} onClose={() => setReg(false)} onSave={({ aluno, forma, comprovante }) => {
        setReg(false);
        toast(comprovante
          ? "Pagamento de " + aluno.nome + " registrado como 'Pendente de Validação'."
          : "Pagamento de " + aluno.nome + " registrado como 'Pago'.", comprovante ? "warn" : "ok");
      }} />
    </Page>
  );
}

/* ---- M4: RejeicaoModal ---- */
function RejeicaoModal({ open, pag, onClose, onConfirm }) {
  const E = window.ESM;
  const [motivo, setMotivo] = useState("");
  useEffect(() => { if (open) setMotivo(""); }, [open]);
  if (!pag) return null;
  const minChars = 20;
  const canConfirm = motivo.trim().length >= minChars;

  return (
    <Modal open={open} onClose={onClose} width={500} title="Rejeitar comprovante" sub="Informe o motivo para registro em auditoria" icon="xCircle">
      <div style={{ padding: 22 }}>
        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
          {[["Aluno", pag.aluno], ["Competência", pag.competencia], ["Valor", E.brl(pag.valor)]].map(([k, v]) => (
            <div key={k} className="card" style={{ padding: "10px 14px", background: "var(--surface-2)" }}>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{k}</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
        <div className="field">
          <label>Motivo da rejeição *</label>
          <textarea className="textarea" style={{ minHeight: 100 }} value={motivo} onChange={e => setMotivo(e.target.value)}
            placeholder="Descreva o motivo da rejeição para registro em auditoria e notificação ao responsável…" autoFocus />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: motivo.trim().length < minChars ? "var(--red-text)" : "var(--green-text)", marginTop: 4 }}>
            <span>{motivo.trim().length < minChars ? "Mínimo " + minChars + " caracteres" : "Motivo válido"}</span>
            <span className="tnum">{motivo.trim().length} / {minChars} mín.</span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 22px", borderTop: "1px solid var(--line)", background: "var(--surface-2)" }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-danger" disabled={!canConfirm} onClick={() => onConfirm(pag, motivo)}>
          <Icon name="xCircle" size={16} />Confirmar rejeição
        </button>
      </div>
    </Modal>
  );
}

/* ---- ValidacoesScreen (with M4 wired) ---- */
function ValidacoesScreen() {
  const E = window.ESM;
  const toast = useToast();
  const [resolved, setResolved] = useState({});
  const [sel, setSel] = useState(E.pendentes[0]?.id || null);
  const [rejeicao, setRejeicao] = useState(null); // pag being rejected

  const pending = E.pendentes.filter(p => !resolved[p.id]);
  const current = E.pendentes.find(p => p.id === sel && !resolved[p.id]) || pending[0];

  function approve(id) {
    setResolved(r => ({ ...r, [id]: "aprovado" }));
    const next = pending.find(p => p.id !== id);
    setSel(next ? next.id : null);
    const p = E.pendentes.find(x => x.id === id);
    toast("Comprovante de " + p.aluno + " aprovado · aluno marcado como Ativo.");
  }

  function confirmRejeicao(pag, motivo) {
    setResolved(r => ({ ...r, [pag.id]: "rejeitado" }));
    const next = pending.find(p => p.id !== pag.id);
    setSel(next ? next.id : null);
    setRejeicao(null);
    toast("Comprovante rejeitado. Aluno notificado por email. Ação registrada na auditoria.", "err");
  }

  return (
    <Page max={1180}>
      <PageSection title="Validação de comprovantes" sub={pending.length + " comprovantes aguardando revisão"}>
        {pending.length === 0 ? (
          <div className="card"><Empty icon="checkCircle" title="Tudo validado!" sub="Não há comprovantes pendentes no momento." /></div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, alignItems: "start" }}>
            <div className="card" style={{ overflow: "hidden", maxHeight: 560, overflowY: "auto" }}>
              <CardHead title="Fila" sub={pending.length + " pendentes"} />
              {pending.map(p => {
                const on = current && current.id === p.id;
                return (
                  <button key={p.id} onClick={() => setSel(p.id)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "12px 16px", border: "none", borderBottom: "1px solid var(--line)", background: on ? "var(--blue-50)" : "var(--surface)", textAlign: "left", borderLeft: on ? "3px solid var(--blue)" : "3px solid transparent" }}>
                    <Avatar name={p.aluno} size="md" />
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 500 }} className="truncate">{p.aluno}</div><div style={{ fontSize: 12, color: "var(--muted)" }}>{p.competencia} · {p.forma}</div></div>
                    <span className="tnum" style={{ fontSize: 12.5, fontWeight: 600 }}>{E.brl(p.valor)}</span>
                  </button>
                );
              })}
            </div>

            {current && (
              <div className="card" key={current.id}>
                <CardHead title="Revisar comprovante" sub={current.aluno + " · " + current.competencia}
                  action={<span className="badge badge-amber"><span className="dot"></span>Pendente</span>} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, padding: 22 }}>
                  <ComprovantePreview pag={current} />
                  <div>
                    <div style={{ display: "grid", gap: 14 }}>
                      {[["Aluno", current.aluno], ["Competência", current.competencia], ["Valor declarado", E.brl(current.valor)], ["Forma de pagamento", current.forma], ["Vencimento", E.fmtDate(current.vencimento)]].map(([k, v]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
                          <span style={{ fontSize: 13, color: "var(--muted)" }}>{k}</span>
                          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
                      <button className="btn btn-success" style={{ height: 44 }} onClick={() => approve(current.id)}>
                        <Icon name="checkCircle" size={18} />Aprovar pagamento
                      </button>
                      <button className="btn btn-danger" style={{ height: 44 }} onClick={() => setRejeicao(current)}>
                        <Icon name="xCircle" size={18} />Rejeitar comprovante
                      </button>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 14, lineHeight: 1.5 }}>
                      Ao aprovar, o aluno passa a <strong style={{ color: "var(--green-text)" }}>Ativo</strong>. Toda decisão é registrada na auditoria.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </PageSection>

      <RejeicaoModal open={!!rejeicao} pag={rejeicao} onClose={() => setRejeicao(null)} onConfirm={confirmRejeicao} />
    </Page>
  );
}

Object.assign(window, { FinanceiroScreen, ValidacoesScreen, RegistrarPagamentoModal, ComprovanteUploader, RejeicaoModal });
