"use client";

import { useRouter } from "next/navigation";
import KpiCard from "@/components/ui/KpiCard";
import CardHead from "@/components/ui/CardHead";
import LineChart from "@/components/ui/LineChart";
import BarsChart from "@/components/ui/BarsChart";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import StatusBadge from "@/components/ui/StatusBadge";
import ListWidget from "@/components/dashboard/ListWidget";
import type {
  KpiCounts,
  FinanceMonth,
  SerieAluno,
  SerieFinanceiro,
  ProximoVencimento,
  PagamentoPendente,
  AuditLogEntry,
  AcessoVencendo,
} from "@/components/dashboard/types";

/** Formata valor monetário em R$ */
function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Formata ISO date para dd/mm/aaaa */
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

/** Formata ISO datetime para dd/mm hh:mm */
function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) +
    " " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}

/** Dias até uma data ISO (negativo se já passou) */
function diasAte(iso: string): number {
  return Math.ceil(
    (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

function pct(a: number, b: number): number {
  return b ? Math.round((a / b) * 100) : 0;
}

interface AdminDashboardProps {
  kpis: KpiCounts;
  finance: FinanceMonth;
  serieAlunos: SerieAluno[];
  serieFinanceiro: SerieFinanceiro[];
  proximosVencimentos: ProximoVencimento[];
  pagamentosPendentes: PagamentoPendente[];
  ultimasValidacoes: AuditLogEntry[];
  acessosVencendo: AcessoVencendo[];
}

export default function AdminDashboard({
  kpis,
  finance,
  serieAlunos,
  serieFinanceiro,
  proximosVencimentos,
  pagamentosPendentes,
  ultimasValidacoes,
  acessosVencendo,
}: AdminDashboardProps) {
  const router = useRouter();

  /* ---- Widgets ---- */

  const vencimentosRows = proximosVencimentos.map((p) => ({
    left: <Avatar name={p.nome} size="md" />,
    title: p.nome,
    sub:
      "Vence " +
      fmtDate(p.vencimento) +
      (p.forma_pagamento ? " · " + p.forma_pagamento : ""),
    right: (
      <span
        style={{
          fontWeight: 600,
          fontSize: 13.5,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {brl(p.valor)}
      </span>
    ),
    onClick: () => router.push("/alunos?aluno=" + p.id),
  }));

  const pendentesRows = pagamentosPendentes.map((p) => ({
    left: (
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          background: "var(--amber-bg)",
          color: "var(--amber-text)",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Icon name="receipt" size={17} />
      </span>
    ),
    title: p.nome,
    sub:
      p.competencia + (p.forma_pagamento ? " · " + p.forma_pagamento : ""),
    right: <StatusBadge status="Pendente de Validação" short />,
  }));

  const validacoesRows = ultimasValidacoes.map((l) => {
    const aprovado = l.acao.toLowerCase().includes("aprovado");
    return {
      left: (
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            display: "grid",
            placeItems: "center",
            background: aprovado ? "var(--green-bg)" : "var(--red-bg)",
            color: aprovado ? "var(--green-text)" : "var(--red-text)",
            flexShrink: 0,
          }}
        >
          <Icon name={aprovado ? "check" : "x"} size={17} />
        </span>
      ),
      title: l.alvo ?? l.acao,
      sub: l.acao + " · " + fmtDateTime(l.criado_em),
      right: (
        <span style={{ fontSize: 11.5, color: "var(--muted)", whiteSpace: "nowrap" }}>
          {l.usuario_nome.split(" ")[0]}
        </span>
      ),
    };
  });

  const acessosRows = acessosVencendo.map((a) => {
    const dias = diasAte(a.removido_em);
    const urgente = dias <= 7;
    return {
      left: <Avatar name={a.nome} size="md" />,
      title: a.nome,
      sub:
        dias >= 0
          ? `Acesso vence em ${dias} dia${dias === 1 ? "" : "s"}`
          : `Acesso venceu há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"}`,
      right: (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 9px",
            borderRadius: 99,
            fontSize: 12,
            fontWeight: 600,
            background: urgente ? "var(--red-bg)" : "var(--amber-bg)",
            color: urgente ? "var(--red-text)" : "var(--amber-text)",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 99,
              background: urgente ? "var(--red-text)" : "var(--amber-text)",
            }}
          />
          {fmtDate(a.removido_em)}
        </span>
      ),
      onClick: () => router.push("/alunos?aluno=" + a.id),
    };
  });

  /* ---- Chart delta label ---- */
  const growthAlunos =
    serieAlunos.length >= 2
      ? serieAlunos[serieAlunos.length - 1].value -
        serieAlunos[serieAlunos.length - 2].value
      : 0;

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ---- KPIs operacionais ---- */}
      <section>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 16, color: "var(--ink)" }}>
            Visão operacional
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
            Status atual da base de alunos
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 14,
          }}
        >
          <KpiCard
            label="Total de alunos"
            value={kpis.total}
            icon={<Icon name="graduation" size={16} />}
            tone="blue"
          />
          <KpiCard
            label="Ativos"
            value={kpis.ativos}
            icon={<Icon name="checkCircle" size={16} />}
            tone="green"
            onClick={() => router.push("/alunos?status=Ativo")}
          />
          <KpiCard
            label="Atrasados"
            value={kpis.atrasados}
            icon={<Icon name="alert" size={16} />}
            tone="red"
            onClick={() => router.push("/alunos?status=Atrasado")}
          />
          <KpiCard
            label="Pend. validação"
            value={kpis.pendentes}
            icon={<Icon name="receipt" size={16} />}
            tone="amber"
            onClick={() => router.push("/validacoes")}
          />
          <KpiCard
            label="Inativos"
            value={kpis.inativos}
            icon={<Icon name="user" size={16} />}
            tone="gray"
            onClick={() => router.push("/alunos?status=Inativo")}
          />
        </div>
      </section>

      {/* ---- Financeiro do mês ---- */}
      <section>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 16, color: "var(--ink)" }}>
            Financeiro do mês
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
            Valores consolidados da competência atual
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 14,
          }}
        >
          {/* Receita prevista */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-lg)",
              padding: 18,
              boxShadow: "var(--sh-sm)",
            }}
          >
            <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
              Receita prevista
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 600,
                marginTop: 10,
                letterSpacing: "-.02em",
                color: "var(--ink)",
              }}
            >
              {brl(finance.receitaPrevista)}
            </div>
            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  height: 7,
                  background: "var(--track)",
                  borderRadius: 99,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width:
                      pct(finance.receitaRecebida, finance.receitaPrevista) +
                      "%",
                    height: "100%",
                    background: "var(--blue)",
                    borderRadius: 99,
                    transition: "width .5s ease",
                  }}
                />
              </div>
            </div>
            <div
              style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8 }}
            >
              {pct(finance.receitaRecebida, finance.receitaPrevista)}% já
              recebido
            </div>
          </div>

          {/* Receita recebida */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-lg)",
              padding: 18,
              boxShadow: "var(--sh-sm)",
            }}
          >
            <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
              Receita recebida
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 600,
                marginTop: 10,
                letterSpacing: "-.02em",
                color: "var(--green-text)",
              }}
            >
              {brl(finance.receitaRecebida)}
            </div>
            <div style={{ marginTop: 14 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--green-text)",
                  background: "var(--green-bg)",
                  padding: "3px 9px",
                  borderRadius: 99,
                }}
              >
                <Icon name="trendUp" size={13} />
                Receita do mês atual
              </span>
            </div>
          </div>

          {/* Inadimplência */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-lg)",
              padding: 18,
              boxShadow: "var(--sh-sm)",
            }}
          >
            <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
              Inadimplência
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 600,
                marginTop: 10,
                letterSpacing: "-.02em",
                color: "var(--red-text)",
              }}
            >
              {brl(finance.inadimplencia)}
            </div>
            <div
              style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 14 }}
            >
              {finance.receitaPrevista > 0
                ? (
                    (finance.inadimplencia / finance.receitaPrevista) *
                    100
                  ).toFixed(1)
                : "0.0"}
              % da receita prevista · {kpis.atrasados} alunos
            </div>
          </div>
        </div>
      </section>

      {/* ---- Gráficos ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* LineChart: crescimento de alunos */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg)",
            boxShadow: "var(--sh-sm)",
          }}
        >
          <CardHead
            title="Crescimento de alunos"
            sub="Últimos 12 meses"
            action={
              growthAlunos !== 0 ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 9px",
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 600,
                    background:
                      growthAlunos >= 0
                        ? "var(--green-bg)"
                        : "var(--red-bg)",
                    color:
                      growthAlunos >= 0
                        ? "var(--green-text)"
                        : "var(--red-text)",
                  }}
                >
                  <Icon name="trendUp" size={12} />
                  {growthAlunos >= 0 ? "+" : ""}
                  {growthAlunos} este mês
                </span>
              ) : undefined
            }
          />
          <div style={{ padding: "12px 14px 6px" }}>
            <LineChart data={serieAlunos} />
          </div>
        </div>

        {/* BarsChart: receita prevista vs recebida */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg)",
            boxShadow: "var(--sh-sm)",
          }}
        >
          <CardHead
            title="Crescimento financeiro"
            sub="Receita prevista vs. recebida"
          />
          <div style={{ padding: "12px 14px 6px" }}>
            <BarsChart
              data={serieFinanceiro}
              valueFmt={(v) => "R$" + (v / 1000).toFixed(0) + "k"}
            />
            <div
              style={{
                display: "flex",
                gap: 18,
                padding: "4px 8px 8px",
                fontSize: 12,
                color: "var(--muted)",
              }}
            >
              <span
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: "var(--blue-100)",
                    flexShrink: 0,
                  }}
                />
                Prevista
              </span>
              <span
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: "var(--blue)",
                    flexShrink: 0,
                  }}
                />
                Recebida
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Widgets ---- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
        }}
      >
        <ListWidget
          title="Próximos vencimentos"
          sub="Recorrentes mais próximos da cobrança"
          rows={vencimentosRows}
          onSeeAll={() => router.push("/financeiro")}
        />
        <ListWidget
          title="Pagamentos pendentes"
          sub={
            pagamentosPendentes.length + " aguardando validação"
          }
          rows={pendentesRows}
          onSeeAll={() => router.push("/validacoes")}
        />
        <ListWidget
          title="Últimas validações"
          sub="Histórico de comprovantes"
          rows={validacoesRows}
        />
        <ListWidget
          title="Vencimento de acessos"
          sub={acessosVencendo.length + " alunos com acesso a vencer"}
          rows={acessosRows}
          onSeeAll={() => router.push("/alunos")}
        />
      </div>
    </div>
  );
}
