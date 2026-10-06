"use client";

import { useRouter } from "next/navigation";
import KpiCard from "@/components/ui/KpiCard";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import StatusBadge from "@/components/ui/StatusBadge";
import ListWidget from "@/components/dashboard/ListWidget";
import type {
  KpiCounts,
  ProximoVencimento,
  PagamentoPendente,
  AuditLogEntry,
  AcessoVencendo,
} from "@/components/dashboard/types";

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

/** Formata valor monetário em R$ */
function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface SecretariaDashboardProps {
  kpis: KpiCounts;
  proximosVencimentos: ProximoVencimento[];
  pagamentosPendentes: PagamentoPendente[];
  ultimasValidacoes: AuditLogEntry[];
  acessosVencendo: AcessoVencendo[];
}

export default function SecretariaDashboard({
  kpis,
  proximosVencimentos,
  pagamentosPendentes,
  ultimasValidacoes,
  acessosVencendo,
}: SecretariaDashboardProps) {
  const router = useRouter();

  /* ---- Widget rows ---- */

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
        <span
          style={{ fontSize: 11.5, color: "var(--muted)", whiteSpace: "nowrap" }}
        >
          {l.usuario_nome.split(" ")[0]}
        </span>
      ),
    };
  });

  return (
    <div
      style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24 }}
    >
      {/* ---- KPIs operacionais — sem financeiro ---- */}
      <section>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 16, color: "var(--ink)" }}>
            Operação do dia
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
            Acompanhe alunos, pagamentos e validações
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
          }}
        >
          <KpiCard
            label="Total de alunos"
            value={kpis.total}
            icon={<Icon name="graduation" size={16} />}
            tone="blue"
            onClick={() => router.push("/alunos")}
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
        </div>
      </section>

      {/* ---- Widgets linha 1 ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <ListWidget
          title="Pagamentos pendentes"
          sub={pagamentosPendentes.length + " aguardando validação"}
          rows={pendentesRows}
          onSeeAll={() => router.push("/validacoes")}
        />
        <ListWidget
          title="Próximos vencimentos"
          sub="Recorrentes mais próximos da cobrança"
          rows={vencimentosRows}
          onSeeAll={() => router.push("/financeiro")}
        />
      </div>

      {/* ---- Widgets linha 2 ---- */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <ListWidget
          title="Vencimento de acessos"
          sub={acessosVencendo.length + " alunos com acesso a vencer"}
          rows={acessosRows}
          onSeeAll={() => router.push("/alunos")}
        />
        <ListWidget
          title="Últimas validações"
          sub="Histórico de comprovantes"
          rows={validacoesRows}
        />
      </div>
    </div>
  );
}
