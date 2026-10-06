"use client";

import KpiCard from "@/components/ui/KpiCard";
import Avatar from "@/components/ui/Avatar";
import Icon from "@/components/ui/Icon";
import StatusBadge from "@/components/ui/StatusBadge";
import Empty from "@/components/ui/Empty";
import type { ProfessorAluno } from "@/components/dashboard/types";

/** Formata ISO date para dd/mm/aaaa */
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

interface ProfessorDashboardProps {
  nomeProf: string;
  alunos: ProfessorAluno[];
}

export default function ProfessorDashboard({
  nomeProf,
  alunos,
}: ProfessorDashboardProps) {
  const primeiroNome = nomeProf.split(" ")[0];

  const cnt = (st: string) => alunos.filter((a) => a.status === st).length;
  const cntPendente = alunos.filter(
    (a) => a.status === "Pendente de Validação" || a.status === "Atrasado"
  ).length;

  return (
    <div
      style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24 }}
    >
      {/* ---- KPIs ---- */}
      <section>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 16, color: "var(--ink)" }}>
            Olá, {primeiroNome}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
            {alunos.length}{" "}
            {alunos.length === 1
              ? "aluno sob sua responsabilidade"
              : "alunos sob sua responsabilidade"}
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
            label="Meus alunos"
            value={alunos.length}
            icon={<Icon name="graduation" size={16} />}
            tone="blue"
          />
          <KpiCard
            label="Ativos"
            value={cnt("Ativo")}
            icon={<Icon name="checkCircle" size={16} />}
            tone="green"
          />
          <KpiCard
            label="Pendentes"
            value={cntPendente}
            icon={<Icon name="clock" size={16} />}
            tone="amber"
            sub="status pendente de regularização"
          />
          <KpiCard
            label="Inativos"
            value={cnt("Inativo")}
            icon={<Icon name="user" size={16} />}
            tone="gray"
          />
        </div>
      </section>

      {/* ---- Tabela de alunos — sem colunas financeiras ---- */}
      <section>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 16, color: "var(--ink)" }}>
            Meus alunos
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
            Lista completa das suas turmas
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg)",
            boxShadow: "var(--sh-sm)",
            overflow: "hidden",
          }}
        >
          {alunos.length === 0 ? (
            <Empty
              title="Nenhum aluno vinculado"
              description="Você ainda não possui alunos atribuídos."
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13.5,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "var(--hover)",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    {["Aluno", "Nível", "Plano", "Carga horária", "Entrada", "Status"].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            padding: "10px 14px",
                            textAlign: "left",
                            fontWeight: 600,
                            fontSize: 12.5,
                            color: "var(--muted)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {alunos.map((a, i) => (
                    <tr
                      key={a.id}
                      style={{
                        borderBottom:
                          i < alunos.length - 1
                            ? "1px solid var(--line)"
                            : "none",
                      }}
                    >
                      {/* Aluno */}
                      <td style={{ padding: "12px 14px" }}>
                        <div
                          style={{ display: "flex", alignItems: "center", gap: 11 }}
                        >
                          <Avatar name={a.nome} size="md" />
                          <div>
                            <div
                              style={{
                                fontWeight: 500,
                                color: "var(--ink)",
                                fontSize: 13.5,
                              }}
                            >
                              {a.nome}
                            </div>
                            <div
                              style={{ fontSize: 12, color: "var(--muted)" }}
                            >
                              {a.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Nível */}
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "3px 9px",
                            borderRadius: 99,
                            fontSize: 12,
                            fontWeight: 600,
                            background: "var(--blue-50)",
                            color: "var(--blue)",
                          }}
                        >
                          {a.nivel_ingles}
                        </span>
                      </td>

                      {/* Plano */}
                      <td
                        style={{
                          padding: "12px 14px",
                          color: "var(--ink-2)",
                          fontSize: 13.5,
                        }}
                      >
                        {a.plano}
                      </td>

                      {/* Carga horária */}
                      <td
                        style={{
                          padding: "12px 14px",
                          color: "var(--muted)",
                          fontSize: 13.5,
                        }}
                      >
                        {a.carga_horaria ?? "—"}
                      </td>

                      {/* Entrada */}
                      <td
                        style={{
                          padding: "12px 14px",
                          color: "var(--muted)",
                          fontSize: 13.5,
                          fontVariantNumeric: "tabular-nums",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {a.data_entrada ? fmtDate(a.data_entrada) : "—"}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "12px 14px" }}>
                        <StatusBadge
                          status={
                            a.status === "Pendente de Validação"
                              ? "Atrasado"
                              : a.status
                          }
                          short
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
