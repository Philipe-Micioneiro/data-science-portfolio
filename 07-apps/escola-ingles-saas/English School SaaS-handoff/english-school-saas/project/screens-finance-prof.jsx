/* ============================================================
   Financeiro Professores — pagamento por aula realizada
   Visível para Administrador e Secretaria
   ============================================================ */

function ProfStatusBadge({ status }) {
  const map = { "Pago": "badge-green", "Parcial": "badge-amber", "Pendente": "badge-red" };
  return <span className={"badge " + (map[status] || "badge-gray")}><span className="dot"></span>{status}</span>;
}

function PagarProfModal({ open, onClose, row, onConfirm }) {
  const E = window.ESM;
  const [valor, setValor] = useState("");
  useEffect(() => { if (open && row) setValor(String(row.devido - row.pago)); }, [open, row]);
  if (!row) return null;
  const restante = row.devido - row.pago;
  return (
    <Modal open={open} onClose={onClose} width={440} title="Registrar pagamento" sub={row.professor} icon="dollar">
      <div style={{ padding: 22 }}>
        <div className="card" style={{ padding: 16, marginBottom: 16, background: "var(--surface-2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, paddingBottom: 8 }}><span className="muted">Total devido</span><span className="tnum" style={{ fontWeight: 600 }}>{E.brl(row.devido)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, paddingBottom: 8 }}><span className="muted">Já pago</span><span className="tnum" style={{ fontWeight: 600 }}>{E.brl(row.pago)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, paddingTop: 8, borderTop: "1px solid var(--line)" }}><span style={{ fontWeight: 600 }}>Restante</span><span className="tnum" style={{ fontWeight: 700, color: "var(--red-text)" }}>{E.brl(restante)}</span></div>
        </div>
        <div className="field"><label>Valor a pagar agora (R$)</label>
          <input className="input tnum" type="number" value={valor} onChange={e => setValor(e.target.value)} max={restante} />
          <span className="hint">Forma: {row.forma}. Pagamento parcial é permitido para professores.</span>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 22px", borderTop: "1px solid var(--line)", background: "var(--surface-2)" }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valor || Number(valor) <= 0} onClick={() => onConfirm(row, Number(valor))}><Icon name="check" size={16} />Confirmar pagamento</button>
      </div>
    </Modal>
  );
}

function FinanceiroProfScreen() {
  const E = window.ESM;
  const toast = useToast();
  const [rows, setRows] = useState(() => E.pagamentosProf.map(r => ({ ...r })));
  const [status, setStatus] = useState("todos");
  const [q, setQ] = useState("");
  const [pagar, setPagar] = useState(null);

  const counts = { todos: rows.length };
  ["Pago", "Parcial", "Pendente"].forEach(s => counts[s] = rows.filter(r => r.status === s).length);
  const filtered = rows.filter(r => {
    if (status !== "todos" && r.status !== status) return false;
    if (q && !r.professor.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const totalAPagar = rows.reduce((s, r) => s + r.devido, 0);
  const totalPago = rows.reduce((s, r) => s + r.pago, 0);
  const totalPendente = totalAPagar - totalPago;

  const cols = [
    { label: "Professor", get: r => r.professor }, { label: "Hora Aula", get: r => r.valorHora },
    { label: "Qtd Aulas", get: r => r.aulas }, { label: "Horas", get: r => r.horas },
    { label: "Total Devido", get: r => r.devido }, { label: "Total Pago", get: r => r.pago }, { label: "Status", get: r => r.status },
  ];
  function doExport(kind) { (kind === "csv" ? exportCSV : exportXLSX)("financeiro_professores", cols, filtered); toast("Exportado " + filtered.length + " professores (" + kind.toUpperCase() + ")."); }

  function confirmPay(row, valor) {
    setRows(rs => rs.map(r => {
      if (r.profId !== row.profId) return r;
      const novoPago = Math.min(r.devido, r.pago + valor);
      const novoStatus = novoPago >= r.devido ? "Pago" : novoPago > 0 ? "Parcial" : "Pendente";
      return { ...r, pago: novoPago, status: novoStatus };
    }));
    setPagar(null);
    toast("Pagamento de " + E.brl(valor) + " registrado para " + row.professor.split(" ")[0] + ".");
  }

  return (
    <Page>
      <PageSection title="Financeiro dos professores" sub="Pagamento calculado automaticamente: aulas realizadas × valor hora/aula · competência mai/26">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          <KpiCard label="Total a pagar este mês" value={E.brl(totalAPagar)} icon="briefcase" tone="blue" />
          <KpiCard label="Total pago" value={E.brl(totalPago)} icon="check" tone="green" sub={Math.round(totalPago / (totalAPagar || 1) * 100) + "% quitado"} />
          <KpiCard label="Total pendente" value={E.brl(totalPendente)} icon="clock" tone="amber" />
        </div>
      </PageSection>

      <PageSection title="Pagamentos por professor" sub={filtered.length + " professores ativos"}
        action={<ExportMenu onExport={doExport} />}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap", justifyContent: "space-between" }}>
          <FilterChips options={[{ value: "todos", label: "Todos" }, { value: "Pago", label: "Pagos" }, { value: "Parcial", label: "Parciais" }, { value: "Pendente", label: "Pendentes" }]} value={status} onChange={setStatus} counts={counts} />
          <SearchInput value={q} onChange={setQ} placeholder="Buscar professor…" width={240} />
        </div>

        <div className="card tbl-wrap">
          <table className="tbl">
            <thead><tr>
              <th>Professor</th><th>Hora/Aula</th><th>Qtd Aulas</th><th>Cálculo</th><th>Total Devido</th><th>Total Pago</th><th>Status</th><th style={{ width: 90 }}></th>
            </tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.profId}>
                  <td><div style={{ display: "flex", alignItems: "center", gap: 11 }}><Avatar name={r.professor} size="md" /><span style={{ fontWeight: 500, color: "var(--ink)" }}>{r.professor}</span></div></td>
                  <td className="tnum">{E.brl(r.valorHora)}</td>
                  <td className="tnum" style={{ fontWeight: 600, color: "var(--ink)" }}>{r.aulas}</td>
                  <td className="muted tnum" style={{ fontSize: 12.5 }}>{r.horas}h × {E.brl(r.valorHora)}</td>
                  <td className="tnum" style={{ fontWeight: 600, color: "var(--ink)" }}>{E.brl(r.devido)}</td>
                  <td className="tnum" style={{ color: r.pago > 0 ? "var(--green-text)" : "var(--muted)" }}>{E.brl(r.pago)}</td>
                  <td><ProfStatusBadge status={r.status} /></td>
                  <td>{r.status !== "Pago"
                    ? <button className="btn btn-ghost btn-sm" onClick={() => setPagar(r)}><Icon name="dollar" size={14} />Pagar</button>
                    : <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--green-text)", fontWeight: 600 }}><Icon name="checkCircle" size={15} />Quitado</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <Empty icon="search" title="Nenhum professor" sub="Ajuste os filtros." />}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--muted)", marginTop: 12, padding: "12px 16px", background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 10 }}>
          <Icon name="alert" size={15} />
          <span><strong>Cálculo automático:</strong> total devido = soma das horas das aulas realizadas no mês × valor hora/aula do professor. Aulas canceladas não são contabilizadas.</span>
        </div>
      </PageSection>

      <PagarProfModal open={!!pagar} row={pagar} onClose={() => setPagar(null)} onConfirm={confirmPay} />
    </Page>
  );
}

Object.assign(window, { FinanceiroProfScreen });
