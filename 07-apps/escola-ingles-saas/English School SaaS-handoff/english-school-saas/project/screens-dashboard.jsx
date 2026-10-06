/* ============================================================
   Dashboards — Administrador / Secretaria / Professor
   ============================================================ */

function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }

/* Reusable widget card listing rows */
function ListWidget({ title, sub, icon, rows, footer, onSeeAll }) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column" }}>
      <CardHead title={title} sub={sub}
        action={onSeeAll && <button className="btn btn-subtle btn-sm" onClick={onSeeAll} style={{ color: "var(--blue)" }}>Ver tudo<Icon name="chevR" size={14} /></button>} />
      <div style={{ flex: 1 }}>
        {rows.length === 0
          ? <Empty title="Nada por aqui" sub="Sem itens no momento." />
          : rows.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : "none" }}>
              {r.left}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink)" }} className="truncate">{r.title}</div>
                {r.sub && <div style={{ fontSize: 12, color: "var(--muted)" }} className="truncate">{r.sub}</div>}
              </div>
              {r.right}
            </div>
          ))}
      </div>
      {footer}
    </div>
  );
}

function MiniProgress({ value, total, color = "var(--blue)" }) {
  return (
    <div style={{ height: 7, background: "var(--track)", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ width: pct(value, total) + "%", height: "100%", background: color, borderRadius: 99, transition: "width .5s ease" }}></div>
    </div>
  );
}

/* ---------- Administrador ---------- */
function AdminDashboard({ onNav }) {
  const E = window.ESM;
  const k = E.kpis, f = E.finance;
  const growthAlunos = E.serieAlunos[E.serieAlunos.length - 1].valor - E.serieAlunos[E.serieAlunos.length - 2].valor;

  return (
    <Page>
      {/* Operação */}
      <PageSection title="Visão operacional" sub="Status atual da base de alunos">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
          <KpiCard label="Total de alunos" value={k.totalAlunos} icon="graduation" tone="blue" onClick={() => onNav("alunos")} />
          <KpiCard label="Ativos" value={k.ativos} icon="checkCircle" tone="green" onClick={() => onNav("alunos", { status: "Ativo" })} />
          <KpiCard label="Atrasados" value={k.atrasados} icon="alert" tone="red" onClick={() => onNav("alunos", { status: "Atrasado" })} />
          <KpiCard label="Pend. validação" value={k.pendentes} icon="receipt" tone="amber" onClick={() => onNav("validacoes")} />
          <KpiCard label="Inativos" value={k.inativos} icon="user" tone="gray" onClick={() => onNav("alunos", { status: "Inativo" })} />
        </div>
      </PageSection>

      {/* Financeiro */}
      <PageSection title="Financeiro do mês" sub="Competência mai/26 · valores consolidados">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>Receita prevista</div>
            <div style={{ fontSize: 26, fontWeight: 600, marginTop: 10, letterSpacing: "-.02em" }}>{E.brl(f.receitaPrevista)}</div>
            <div style={{ marginTop: 14 }}><MiniProgress value={f.receitaRecebida} total={f.receitaPrevista} /></div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8 }}>{pct(f.receitaRecebida, f.receitaPrevista)}% já recebido</div>
          </div>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>Receita recebida</div>
            <div style={{ fontSize: 26, fontWeight: 600, marginTop: 10, letterSpacing: "-.02em", color: "var(--green-text)" }}>{E.brl(f.receitaRecebida)}</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 14, fontSize: 12.5, fontWeight: 600, color: "var(--green-text)", background: "var(--green-bg)", padding: "3px 9px", borderRadius: 99 }}>
              <Icon name="trendUp" size={13} />+8,2% vs. abr/26
            </div>
          </div>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>Inadimplência</div>
            <div style={{ fontSize: 26, fontWeight: 600, marginTop: 10, letterSpacing: "-.02em", color: "var(--red-text)" }}>{E.brl(f.inadimplencia)}</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 14 }}>{(f.taxaInad * 100).toFixed(1)}% da receita prevista · {k.atrasados} alunos</div>
          </div>
        </div>
      </PageSection>

      {/* Charts */}
      <PageSection>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div className="card">
            <CardHead title="Crescimento de alunos" sub="Últimos 12 meses"
              action={<span className="badge badge-green"><Icon name="trendUp" size={13} />+{growthAlunos} este mês</span>} />
            <div style={{ padding: "12px 14px 6px" }}><LineChart series={E.serieAlunos} /></div>
          </div>
          <div className="card">
            <CardHead title="Crescimento financeiro" sub="Receita prevista vs. recebida" />
            <div style={{ padding: "12px 14px 6px" }}>
              <BarsChart series={E.serieFinanceiro} valueFmt={v => "R$" + (v / 1000).toFixed(0) + "k"} />
              <div style={{ display: "flex", gap: 18, padding: "4px 8px 8px", fontSize: 12, color: "var(--muted)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--blue-100)" }}></span>Prevista</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--blue)" }}></span>Recebida</span>
              </div>
            </div>
          </div>
        </div>
      </PageSection>

      {/* Widgets row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
        <ProximosVencimentos onNav={onNav} />
        <PagamentosPendentes onNav={onNav} />
        <UltimasValidacoes />
        <AlunosRiscoInativacao onNav={onNav} />
      </div>
    </Page>
  );
}

/* ---------- Shared widgets ---------- */
function ProximosVencimentos({ onNav }) {
  const E = window.ESM;
  const rows = E.proximosVencimentos.map(p => ({
    left: <Avatar name={p.aluno} size="md" />,
    title: p.aluno,
    sub: "Vence " + E.fmtDate(p.vencimento) + " · " + p.forma,
    right: <span style={{ fontWeight: 600, fontSize: 13.5, fontVariantNumeric: "tabular-nums" }}>{E.brl(p.valor)}</span>,
  }));
  return <ListWidget title="Próximos vencimentos" sub="Mensalidades a vencer" rows={rows} onSeeAll={() => onNav("financeiro")} />;
}

function PagamentosPendentes({ onNav }) {
  const E = window.ESM;
  const rows = E.pendentes.slice(0, 6).map(p => ({
    left: <span style={{ width: 36, height: 36, borderRadius: 9, background: "var(--amber-bg)", color: "var(--amber-text)", display: "grid", placeItems: "center" }}><Icon name="receipt" size={17} /></span>,
    title: p.aluno,
    sub: p.competencia + " · " + p.forma,
    right: <StatusBadge status="Pendente de Validação" short />,
  }));
  return <ListWidget title="Pagamentos pendentes" sub={E.pendentes.length + " aguardando validação"} rows={rows} onSeeAll={() => onNav("validacoes")} />;
}

function UltimasValidacoes() {
  const E = window.ESM;
  const logs = E.auditoria.filter(l => l.acao.indexOf("Comprovante") >= 0).slice(0, 6);
  const rows = logs.map(l => ({
    left: <span style={{ width: 36, height: 36, borderRadius: 9, display: "grid", placeItems: "center",
      background: l.acao.indexOf("aprovado") >= 0 ? "var(--green-bg)" : "var(--red-bg)",
      color: l.acao.indexOf("aprovado") >= 0 ? "var(--green-text)" : "var(--red-text)" }}>
      <Icon name={l.acao.indexOf("aprovado") >= 0 ? "check" : "x"} size={17} /></span>,
    title: l.alvo || l.acao,
    sub: l.acao + " · " + E.fmtDateTime(l.data),
    right: <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{l.usuario.split(" ")[0]}</span>,
  }));
  return <ListWidget title="Últimas validações" sub="Histórico de comprovantes" rows={rows} />;
}

/* ---------- Secretaria ---------- */
function SecretariaDashboard({ onNav }) {
  const E = window.ESM;
  const k = E.kpis;
  return (
    <Page>
      <PageSection title="Operação do dia" sub="Acompanhe alunos, pagamentos e validações">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <KpiCard label="Total de alunos" value={k.totalAlunos} icon="graduation" tone="blue" onClick={() => onNav("alunos")} />
          <KpiCard label="Ativos" value={k.ativos} icon="checkCircle" tone="green" onClick={() => onNav("alunos", { status: "Ativo" })} />
          <KpiCard label="Atrasados" value={k.atrasados} icon="alert" tone="red" onClick={() => onNav("alunos", { status: "Atrasado" })} />
          <KpiCard label="Pend. validação" value={k.pendentes} icon="receipt" tone="amber" onClick={() => onNav("validacoes")} />
        </div>
      </PageSection>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 26 }}>
        <PagamentosPendentes onNav={onNav} />
        <ProximosVencimentos onNav={onNav} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 26 }}>
        <AlunosRiscoInativacao onNav={onNav} />
        <UltimasValidacoes />
      </div>
    </Page>
  );
}

/* ---------- Professor ---------- */
function ProfessorDashboard({ onNav, professor }) {
  const E = window.ESM;
  const meus = E.alunos.filter(a => a.professores.includes(professor.id));
  const cnt = st => meus.filter(a => a.status === st).length;
  return (
    <Page>
      <PageSection title={"Olá, " + professor.nome.split(" ")[0]} sub={meus.length + " alunos sob sua responsabilidade"}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          <KpiCard label="Meus alunos" value={meus.length} icon="graduation" tone="blue" />
          <KpiCard label="Ativos" value={cnt("Ativo")} icon="checkCircle" tone="green" />
          <KpiCard label="Atrasados" value={cnt("Atrasado") + cnt("Pendente de Validação")} icon="clock" tone="amber" sub="status pendente de regularização" />
          <KpiCard label="Inativos" value={cnt("Inativo")} icon="user" tone="gray" />
        </div>
      </PageSection>

      <PageSection title="Meus alunos" sub="Lista completa das suas turmas"
        action={<button className="btn btn-ghost btn-sm" onClick={() => onNav("dashboard")}>Ver lista detalhada<Icon name="chevR" size={14} /></button>}>
        <ProfessorAlunosTable alunos={meus} />
      </PageSection>
    </Page>
  );
}

/* Professor sees students WITHOUT any financial column */
function ProfessorAlunosTable({ alunos }) {
  const E = window.ESM;
  return (
    <div className="card tbl-wrap">
      <table className="tbl">
        <thead><tr>
          <th>Aluno</th><th>Nível</th><th>Plano</th><th>Carga horária</th><th>Entrada</th><th>Status</th>
        </tr></thead>
        <tbody>
          {alunos.map(a => (
            <tr key={a.id}>
              <td><div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <Avatar name={a.nome} size="md" />
                <div><div style={{ fontWeight: 500, color: "var(--ink)" }}>{a.nome}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{a.email}</div></div>
              </div></td>
              <td><span className="badge badge-blue">{a.nivel}</span></td>
              <td>{a.plano}</td>
              <td className="muted">{a.cargaHoraria}</td>
              <td className="muted tnum">{E.fmtDate(a.dataEntrada)}</td>
              <td><StatusBadge status={a.status === "Pendente de Validação" ? "Atrasado" : a.status} short /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---- M7: Risco de inativação widget ---- */
function AlunosRiscoInativacao({ onNav }) {
  const E = window.ESM;
  const atrasados = E.alunos.filter(a => a.status === "Atrasado").slice(0, 6);
  const rows = atrasados.map((a, i) => ({
    left: <Avatar name={a.nome} size="md" />,
    title: a.nome,
    sub: "há " + (5 + i * 3) + " dias atrasado",
    right: <span className="badge badge-red"><span className="dot"></span>Risco</span>,
  }));
  return <ListWidget
    title="Risco de inativação"
    sub={atrasados.length + " alunos entre 20–30 dias de atraso"}
    rows={rows}
    onSeeAll={() => onNav("alunos", { status: "Atrasado" })}
  />;
}

Object.assign(window, { AdminDashboard, SecretariaDashboard, ProfessorDashboard, ProfessorAlunosTable, ListWidget, AlunosRiscoInativacao, pct });
