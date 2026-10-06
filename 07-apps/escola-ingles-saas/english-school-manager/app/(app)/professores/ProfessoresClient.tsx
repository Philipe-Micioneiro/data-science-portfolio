"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import Avatar from "@/components/ui/Avatar";
import StatusBadge from "@/components/ui/StatusBadge";
import SearchInput from "@/components/ui/SearchInput";
import FilterChips from "@/components/ui/FilterChips";
import Empty from "@/components/ui/Empty";
import Modal from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import ExportMenu from "@/components/ui/ExportMenu";
import {
  criarProfessorAction,
  editarProfessorAction,
  toggleStatusProfessorAction,
  type ActionResult,
} from "./actions";

// ---------------------------------------------------------------------------
// Tipos de dados vindos do Server Component
// ---------------------------------------------------------------------------
export interface ProfessorRow {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  valor_hora: number | null;
  forma_pagamento: string | null;
  obs_financeiras: string | null;
  status: string;
  criado_em: string;
  num_alunos: number;
  aulas_no_mes: number;
  aulas_realizadas: number;
}

export interface AlunoVinculado {
  id: string;
  nome: string;
  email: string | null;
  plano: string | null;
  nivel_ingles: string | null;
  valor_mensalidade: number | null;
  status: string;
}

export interface TeacherPaymentKpi {
  teacher_id: string;
  valor_devido: number | null;
  valor_pago: number | null;
  status: string | null;
}

interface ProfessoresClientProps {
  professores: ProfessorRow[];
  alunosPorProfessor: Record<string, AlunoVinculado[]>;
  kpisPagamento: Record<string, TeacherPaymentKpi>;
}

// ---------------------------------------------------------------------------
// Helpers de formatação
// ---------------------------------------------------------------------------
function brl(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

// ---------------------------------------------------------------------------
// RankingCard
// ---------------------------------------------------------------------------
interface RankingItem {
  id: string;
  nome: string;
  value: number;
}

interface RankingCardProps {
  title: string;
  icon: "users" | "calendar";
  toneBg: string;
  toneC: string;
  accent: string;
  items: RankingItem[];
  unit: string;
}

function RankingCard({ title, icon, toneBg, toneC, accent, items, unit }: RankingCardProps) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--sh-sm)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 16px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: toneBg,
            color: toneC,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={17} />
        </span>
        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{title}</div>
      </div>
      <div style={{ padding: "6px 0" }}>
        {items.length === 0 && (
          <div style={{ padding: "16px", fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
            Sem dados
          </div>
        )}
        {items.map((it, i) => (
          <div
            key={it.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "9px 16px",
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 99,
                background: i === 0 ? accent : "var(--hover)",
                color: i === 0 ? "#fff" : "var(--muted)",
                display: "grid",
                placeItems: "center",
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </span>
            <Avatar name={it.nome} size="sm" />
            <span
              style={{
                flex: 1,
                fontSize: 13.5,
                fontWeight: 500,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: "var(--ink)",
              }}
            >
              {it.nome}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>
              {it.value}
              <span style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 500, marginLeft: 3 }}>
                {unit}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Distribuição de carga (4 cards calculados client-side)
// ---------------------------------------------------------------------------
function DistribuicaoCarga({ professores }: { professores: ProfessorRow[] }) {
  const ativos = professores.filter((p) => p.status === "Ativo");

  const byAlunos = [...ativos].sort((a, b) => b.num_alunos - a.num_alunos);
  const byAulas = [...ativos].sort((a, b) => b.aulas_no_mes - a.aulas_no_mes);

  const mk = (arr: ProfessorRow[], key: "num_alunos" | "aulas_no_mes"): RankingItem[] =>
    arr.slice(0, 5).map((p) => ({ id: p.id, nome: p.nome, value: p[key] }));

  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>
          Distribuição de carga
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
          Inteligência operacional para equilibrar alunos e aulas entre professores
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
        }}
      >
        <RankingCard
          title="Mais alunos"
          icon="users"
          toneBg="var(--blue-50)"
          toneC="var(--blue)"
          accent="var(--blue)"
          items={mk(byAlunos, "num_alunos")}
          unit="alunos"
        />
        <RankingCard
          title="Menos alunos"
          icon="users"
          toneBg="var(--amber-bg)"
          toneC="var(--amber-text)"
          accent="var(--amber)"
          items={mk([...byAlunos].reverse(), "num_alunos")}
          unit="alunos"
        />
        <RankingCard
          title="Mais aulas"
          icon="calendar"
          toneBg="var(--green-bg)"
          toneC="var(--green-text)"
          accent="var(--green)"
          items={mk(byAulas, "aulas_no_mes")}
          unit="aulas"
        />
        <RankingCard
          title="Menos aulas"
          icon="calendar"
          toneBg="var(--red-bg)"
          toneC="var(--red-text)"
          accent="var(--red)"
          items={mk([...byAulas].reverse(), "aulas_no_mes")}
          unit="aulas"
        />
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--muted)",
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Icon name="alert" size={13} />
        Quantidade de <strong>alunos</strong> e de <strong>aulas</strong> são métricas distintas
        — um professor pode ter poucos alunos com muitas aulas semanais.
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// TempPwBanner — exibido após criação bem-sucedida
// ---------------------------------------------------------------------------
function TempPwBanner({ senha, onClose }: { senha: string; onClose: () => void }) {
  return (
    <div
      style={{
        background: "var(--blue-50)",
        border: "1px solid var(--blue-100)",
        borderRadius: "var(--r-lg)",
        padding: "14px 18px",
        marginBottom: 18,
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <span style={{ color: "var(--blue)", flexShrink: 0, marginTop: 1 }}>
        <Icon name="lock" size={18} />
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--blue)", marginBottom: 4 }}>
          Professor cadastrado com sucesso
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 6 }}>
          Senha temporária gerada. Compartilhe com o professor:
        </div>
        <code
          style={{
            display: "inline-block",
            background: "var(--surface)",
            border: "1px solid var(--blue-100)",
            borderRadius: 8,
            padding: "6px 14px",
            fontFamily: "monospace",
            fontSize: 16,
            fontWeight: 700,
            color: "var(--blue)",
            letterSpacing: 1,
          }}
        >
          {senha}
        </code>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
          O professor deverá alterar a senha no primeiro acesso.
        </div>
      </div>
      <button
        onClick={onClose}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--muted)",
          padding: 4,
          borderRadius: 6,
          flexShrink: 0,
        }}
        aria-label="Fechar aviso"
      >
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProfessorFormModal
// ---------------------------------------------------------------------------
const FORMAS_PAGAMENTO = ["PIX", "Transferência", "Dinheiro", "Boleto", "Outro"];

interface ProfessorFormData {
  nome: string;
  email: string;
  telefone: string;
  valor_hora: string;
  forma_pagamento: string;
  obs_financeiras: string;
  status: "Ativo" | "Inativo";
}

interface ProfessorFormModalProps {
  open: boolean;
  onClose: () => void;
  editing: ProfessorRow | null;
  onSuccess: (result: ActionResult) => void;
}

const BLANK_FORM: ProfessorFormData = {
  nome: "",
  email: "",
  telefone: "",
  valor_hora: "65",
  forma_pagamento: "PIX",
  obs_financeiras: "",
  status: "Ativo",
};

function professorToForm(p: ProfessorRow): ProfessorFormData {
  return {
    nome: p.nome,
    email: p.email,
    telefone: p.telefone ?? "",
    valor_hora: p.valor_hora != null ? String(p.valor_hora) : "65",
    forma_pagamento: p.forma_pagamento ?? "PIX",
    obs_financeiras: p.obs_financeiras ?? "",
    status: (p.status as "Ativo" | "Inativo") ?? "Ativo",
  };
}

function ProfessorFormModal({ open, onClose, editing, onSuccess }: ProfessorFormModalProps) {
  // Lazy initializer: estado derivado do `editing` no momento em que o componente é montado.
  // O componente é remontado via `key` no pai sempre que `editing` ou `open` muda,
  // garantindo que o form inicia com os dados corretos sem precisar de sync em useEffect.
  const [form, setForm] = useState<ProfessorFormData>(() =>
    editing ? professorToForm(editing) : { ...BLANK_FORM }
  );

  const criarInitial: ActionResult = { ok: false };
  const editarInitial: ActionResult = { ok: false };

  const [criarState, criarDispatch, criarPending] = useActionState(
    criarProfessorAction,
    criarInitial
  );
  const [editarState, editarDispatch, editarPending] = useActionState(
    editarProfessorAction,
    editarInitial
  );

  const isPending = criarPending || editarPending;
  const state = editing ? editarState : criarState;

  // Notificar pai ao sucesso
  const successCalledRef = useRef(false);
  useEffect(() => {
    if (!state.ok) return;
    if (successCalledRef.current) return;
    successCalledRef.current = true;
    onSuccess(state);
    onClose();
  }, [state.ok, state, onSuccess, onClose]);

  // Resetar flag de sucesso ao reabrir
  useEffect(() => {
    if (open) {
      successCalledRef.current = false;
    }
  }, [open]);

  const set = useCallback(<K extends keyof ProfessorFormData>(k: K, v: ProfessorFormData[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  }, []);

  const valid = form.nome.trim() !== "" && form.email.trim() !== "" && form.valor_hora !== "";

  const action = editing ? editarDispatch : criarDispatch;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={editing ? "Editar professor" : "Cadastrar professor"}
      sub={editing ? editing.nome : "Adicione um novo professor à escola"}
      icon={<Icon name="userPlus" size={20} />}
    >
      <form action={action}>
        {editing && <input type="hidden" name="id" value={editing.id} />}

        <div
          style={{
            padding: 22,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          {/* Nome */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label
              style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink-2)", marginBottom: 6 }}
            >
              Nome completo *
            </label>
            <input
              name="nome"
              className="input"
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              placeholder="Ex.: Roberto Lemos"
              autoFocus
              style={inputStyle}
            />
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>Email *</label>
            <input
              name="email"
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="professor@school.com"
              style={inputStyle}
            />
          </div>

          {/* Telefone */}
          <div>
            <label style={labelStyle}>Telefone</label>
            <input
              name="telefone"
              className="input"
              value={form.telefone}
              onChange={(e) => set("telefone", e.target.value)}
              placeholder="(11) 99999-9999"
              style={inputStyle}
            />
          </div>

          {/* Seção financeira */}
          <div
            style={{
              gridColumn: "1 / -1",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: ".04em",
              marginTop: 4,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Icon name="briefcase" size={14} />
            Dados financeiros
          </div>

          {/* Valor hora */}
          <div>
            <label style={labelStyle}>Valor hora/aula (R$) *</label>
            <input
              name="valor_hora"
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={form.valor_hora}
              onChange={(e) => set("valor_hora", e.target.value)}
              style={{ ...inputStyle, fontVariantNumeric: "tabular-nums" }}
            />
          </div>

          {/* Forma de pagamento */}
          <div>
            <label style={labelStyle}>Forma de pagamento</label>
            <select
              name="forma_pagamento"
              value={form.forma_pagamento}
              onChange={(e) => set("forma_pagamento", e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {FORMAS_PAGAMENTO.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>

          {/* Obs financeiras */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Observações financeiras</label>
            <textarea
              name="obs_financeiras"
              value={form.obs_financeiras}
              onChange={(e) => set("obs_financeiras", e.target.value)}
              placeholder="Ex.: recebe via PJ, emite nota fiscal…"
              rows={3}
              style={{
                ...inputStyle,
                height: "auto",
                resize: "vertical",
                paddingTop: 10,
                paddingBottom: 10,
              }}
            />
          </div>

          {/* Status (apenas no modo edição) */}
          {editing && (
            <div style={{ gridColumn: "1 / -1" }}>
              <input type="hidden" name="status" value={form.status} />
              <label style={labelStyle}>Status</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["Ativo", "Inativo"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("status", s)}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 10,
                      border:
                        "1px solid " +
                        (form.status === s ? "var(--blue)" : "var(--line-2)"),
                      background:
                        form.status === s ? "var(--blue-50)" : "var(--surface)",
                      color:
                        form.status === s ? "var(--blue)" : "var(--ink-2)",
                      fontWeight: 600,
                      fontSize: 13.5,
                      cursor: "pointer",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Erro */}
          {state.error && (
            <div
              style={{
                gridColumn: "1 / -1",
                background: "var(--red-bg)",
                border: "1px solid var(--red-border)",
                borderRadius: "var(--r)",
                padding: "10px 14px",
                fontSize: 13,
                color: "var(--red-text)",
              }}
            >
              {state.error}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            padding: "16px 22px",
            borderTop: "1px solid var(--line)",
            background: "var(--surface-2)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            style={btnGhostStyle}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!valid || isPending}
            style={{
              ...btnPrimaryStyle,
              opacity: !valid || isPending ? 0.6 : 1,
            }}
          >
            <Icon name="check" size={16} />
            {isPending
              ? "Salvando…"
              : editing
              ? "Salvar alterações"
              : "Cadastrar professor"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// ProfessorDetailModal
// ---------------------------------------------------------------------------
interface ProfessorDetailModalProps {
  professor: ProfessorRow | null;
  alunos: AlunoVinculado[];
  kpi: TeacherPaymentKpi | null;
  onClose: () => void;
  onEdit: (p: ProfessorRow) => void;
  onToggleStatus: (p: ProfessorRow) => void;
}

function ProfessorDetailModal({
  professor,
  alunos,
  kpi,
  onClose,
  onEdit,
  onToggleStatus,
}: ProfessorDetailModalProps) {
  const [alunoStatus, setAlunoStatus] = useState("todos");
  const [confirmando, setConfirmando] = useState(false);

  if (!professor) return null;

  const counts: Record<string, number> = { todos: alunos.length };
  const statusKeys = ["Ativo", "Atrasado", "Pendente de Validação", "Inativo"];
  statusKeys.forEach((s) => {
    counts[s] = alunos.filter((a) => a.status === s).length;
  });
  const filtered =
    alunoStatus === "todos"
      ? alunos
      : alunos.filter((a) => a.status === alunoStatus);

  const statusOpts = [
    { value: "todos", label: "Todos" },
    { value: "Ativo", label: "Ativos" },
    { value: "Atrasado", label: "Atrasados" },
    { value: "Pendente de Validação", label: "Pendentes" },
    { value: "Inativo", label: "Inativos" },
  ];

  const info: [string, string][] = [
    ["Email", professor.email],
    ["Telefone", professor.telefone ?? "—"],
    ["Data de cadastro", fmtDate(professor.criado_em)],
    ["Valor hora/aula", brl(professor.valor_hora)],
    ["Forma de pagamento", professor.forma_pagamento ?? "—"],
    ["Aulas no mês", professor.aulas_no_mes + " aulas"],
  ];

  const exportData = filtered.map((a) => ({
    nome: a.nome,
    email: a.email ?? "",
    plano: a.plano ?? "",
    nivel_ingles: a.nivel_ingles ?? "",
    mensalidade: a.valor_mensalidade != null ? brl(a.valor_mensalidade) : "—",
    status: a.status,
  }));

  const exportCols = [
    { label: "Aluno", key: "nome" },
    { label: "Email", key: "email" },
    { label: "Plano", key: "plano" },
    { label: "Nível", key: "nivel_ingles" },
    { label: "Mensalidade", key: "mensalidade" },
    { label: "Status", key: "status" },
  ];

  return (
    <Modal
      open={!!professor}
      onClose={onClose}
      size="xl"
      title={professor.nome}
      sub={professor.email}
      icon={<Icon name="user" size={20} />}
    >
      <div style={{ padding: "18px 22px 22px" }}>
        {/* Barra de ações */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <StatusBadge status={professor.status} />
          <div style={{ flex: 1 }} />
          <button
            style={btnGhostSmStyle}
            onClick={() => onEdit(professor)}
          >
            <Icon name="edit" size={15} />
            Editar
          </button>
          {confirmando ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>
                {professor.status === "Ativo" ? "Inativar" : "Reativar"} professor?
              </span>
              <button
                style={{
                  ...btnSmBase,
                  background: professor.status === "Ativo" ? "var(--red-bg)" : "var(--green-bg)",
                  color: professor.status === "Ativo" ? "var(--red-text)" : "var(--green-text)",
                  border: "1px solid " + (professor.status === "Ativo" ? "var(--red-border)" : "transparent"),
                }}
                onClick={() => {
                  setConfirmando(false);
                  onToggleStatus(professor);
                }}
              >
                <Icon name={professor.status === "Ativo" ? "ban" : "check"} size={14} />
                Confirmar
              </button>
              <button
                style={btnGhostSmStyle}
                onClick={() => setConfirmando(false)}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              style={{
                ...btnSmBase,
                background: professor.status === "Ativo" ? "var(--red-bg)" : "var(--green-bg)",
                color: professor.status === "Ativo" ? "var(--red-text)" : "var(--green-text)",
                border: "1px solid " + (professor.status === "Ativo" ? "var(--red-border)" : "transparent"),
              }}
              onClick={() => setConfirmando(true)}
            >
              <Icon name={professor.status === "Ativo" ? "ban" : "check"} size={14} />
              {professor.status === "Ativo" ? "Inativar" : "Reativar"}
            </button>
          )}
        </div>

        {/* Info grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: "14px 20px",
            marginBottom: 18,
            padding: "16px 18px",
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: 12,
          }}
        >
          {info.map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{k}</div>
              <div style={{ fontSize: 13.5, fontWeight: 500, marginTop: 2, color: "var(--ink)" }}>
                {v}
              </div>
            </div>
          ))}
          {professor.obs_financeiras && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Observações financeiras
              </div>
              <div style={{ fontSize: 13.5, marginTop: 2, color: "var(--ink-2)" }}>
                {professor.obs_financeiras}
              </div>
            </div>
          )}
        </div>

        {/* KPI strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 10,
            marginBottom: 16,
          }}
        >
          {(
            [
              ["Alunos", alunos.length, "var(--ink)"],
              ["Ativos", counts["Ativo"] ?? 0, "var(--green-text)"],
              ["Aulas / mês", professor.aulas_no_mes, "var(--blue)"],
              ["A receber", kpi ? brl(kpi.valor_devido) : "—", "var(--ink)"],
            ] as [string, number | string, string][]
          ).map(([l, v, c]) => (
            <div
              key={l}
              style={{
                padding: "12px 14px",
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-lg)",
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: c,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {v}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Header tabela de alunos */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
            Alunos do professor
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <FilterChips
              options={statusOpts}
              value={alunoStatus}
              onChange={setAlunoStatus}
              counts={counts}
            />
            <ExportMenu
              data={exportData}
              filename={"alunos_" + professor.nome.split(" ")[0].toLowerCase()}
              columns={exportCols}
            />
          </div>
        </div>

        {/* Tabela de alunos */}
        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg)",
            overflow: "hidden",
            maxHeight: 300,
            overflowY: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13.5,
            }}
          >
            <thead>
              <tr style={{ background: "var(--surface-2)" }}>
                {["Aluno", "Plano", "Nível", "Mensalidade", "Status"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 14px",
                      fontWeight: 600,
                      fontSize: 12,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: ".04em",
                      textAlign: "left",
                      borderBottom: "1px solid var(--line)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr
                  key={a.id}
                  style={{
                    background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)",
                    opacity: a.status === "Inativo" ? 0.62 : 1,
                  }}
                >
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <Avatar name={a.nome} size="md" />
                      <div>
                        <div style={{ fontWeight: 500, color: "var(--ink)" }}>{a.nome}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>{a.email ?? ""}</div>
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}>{a.plano ?? "—"}</td>
                  <td style={tdStyle}>
                    {a.nivel_ingles ? (
                      <span
                        style={{
                          background: "var(--blue-50)",
                          color: "var(--blue)",
                          borderRadius: 99,
                          padding: "2px 9px",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {a.nivel_ingles}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: 500,
                      color: "var(--ink)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {brl(a.valor_mensalidade)}
                  </td>
                  <td style={tdStyle}>
                    <StatusBadge status={a.status} short />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <Empty
              title="Nenhum aluno"
              description="Sem alunos neste status."
              icon={
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 10 12 5 2 10l10 5 10-5Z" />
                  <path d="M6 12v5c0 1 2.5 2.5 6 2.5s6-1.5 6-2.5v-5" />
                </svg>
              }
            />
          )}
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Tabela principal de professores
// ---------------------------------------------------------------------------
interface TabelaProfessoresProps {
  professores: ProfessorRow[];
  onSelect: (p: ProfessorRow) => void;
  onNew: () => void;
}

function TabelaProfessores({
  professores,
  onSelect,
  onNew,
}: TabelaProfessoresProps) {
  const [statusFilter, setStatusFilter] = useState("todos");
  const [q, setQ] = useState("");

  const counts = {
    todos: professores.length,
    Ativo: professores.filter((p) => p.status === "Ativo").length,
    Inativo: professores.filter((p) => p.status === "Inativo").length,
  };

  const filtered = professores.filter((p) => {
    if (statusFilter !== "todos" && p.status !== statusFilter) return false;
    if (q) {
      const t = q.toLowerCase();
      if (
        !p.nome.toLowerCase().includes(t) &&
        !p.email.toLowerCase().includes(t)
      )
        return false;
    }
    return true;
  });

  const exportData = filtered.map((p) => ({
    nome: p.nome,
    email: p.email,
    telefone: p.telefone ?? "",
    data_cadastro: fmtDate(p.criado_em),
    qtd_alunos: p.num_alunos,
    aulas_mes: p.aulas_no_mes,
    aulas_realizadas: p.aulas_realizadas,
    valor_hora: p.valor_hora != null ? brl(p.valor_hora) : "—",
    status: p.status,
  }));

  const exportCols = [
    { label: "Nome", key: "nome" },
    { label: "Email", key: "email" },
    { label: "Telefone", key: "telefone" },
    { label: "Data de Cadastro", key: "data_cadastro" },
    { label: "Qtd Alunos", key: "qtd_alunos" },
    { label: "Aulas no Mês", key: "aulas_mes" },
    { label: "Aulas Realizadas", key: "aulas_realizadas" },
    { label: "Valor Hora", key: "valor_hora" },
    { label: "Status", key: "status" },
  ];

  return (
    <section>
      {/* Header da seção */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>
            Professores
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
            {filtered.length} de {professores.length} professores
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <ExportMenu data={exportData} filename="professores" columns={exportCols} />
          <button
            onClick={onNew}
            style={btnPrimaryStyle}
          >
            <Icon name="plus" size={16} />
            Novo professor
          </button>
        </div>
      </div>

      {/* Filtros e busca */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 14,
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        <FilterChips
          options={[
            { value: "todos", label: "Todos" },
            { value: "Ativo", label: "Ativos" },
            { value: "Inativo", label: "Inativos" },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
          counts={counts}
        />
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Buscar nome ou email…"
          width={260}
        />
      </div>

      {/* Tabela */}
      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: "var(--r-lg)",
          overflow: "hidden",
          background: "var(--surface)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13.5,
          }}
        >
          <thead>
            <tr style={{ background: "var(--surface-2)" }}>
              {["Nome", "Email", "Telefone", "Data de Cadastro", "Alunos", "Aulas no Mês", "Realizadas", "Valor Hora", "Status", ""].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 14px",
                      fontWeight: 600,
                      fontSize: 12,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: ".04em",
                      textAlign: "left",
                      borderBottom: "1px solid var(--line)",
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
            {filtered.map((p, i) => (
              <tr
                key={p.id}
                onClick={() => onSelect(p)}
                style={{
                  cursor: "pointer",
                  opacity: p.status === "Inativo" ? 0.62 : 1,
                  background:
                    i % 2 === 0 ? "var(--surface)" : "var(--surface-2)",
                  transition: "background .1s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background = "var(--hover)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background =
                    i % 2 === 0 ? "var(--surface)" : "var(--surface-2)";
                }}
              >
                <td style={tdStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <Avatar name={p.nome} size="md" />
                    <span style={{ fontWeight: 500, color: "var(--ink)" }}>{p.nome}</span>
                  </div>
                </td>
                <td style={{ ...tdStyle, color: "var(--muted)" }}>{p.email}</td>
                <td style={{ ...tdStyle, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                  {p.telefone ?? "—"}
                </td>
                <td style={{ ...tdStyle, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                  {fmtDate(p.criado_em)}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    fontWeight: 600,
                    color: "var(--ink)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {p.num_alunos}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    fontWeight: 600,
                    color: "var(--ink)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {p.aulas_no_mes}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    fontWeight: 600,
                    color: "var(--green-text)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {p.aulas_realizadas}
                </td>
                <td
                  style={{
                    ...tdStyle,
                    fontVariantNumeric: "tabular-nums",
                    color: "var(--ink-2)",
                  }}
                >
                  {brl(p.valor_hora)}
                </td>
                <td style={tdStyle}>
                  <StatusBadge status={p.status} />
                </td>
                <td style={{ ...tdStyle, color: "var(--muted-2)", width: 40 }}>
                  <Icon name="chevR" size={16} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <Empty
            title="Nenhum professor"
            description="Ajuste os filtros ou a busca."
            icon={
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            }
            action={
              <button onClick={onNew} style={btnPrimaryStyle}>
                <Icon name="plus" size={15} />
                Cadastrar professor
              </button>
            }
          />
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Componente raiz — ProfessoresClient
// ---------------------------------------------------------------------------
export default function ProfessoresClient({
  professores: initialProfessores,
  alunosPorProfessor,
  kpisPagamento,
}: ProfessoresClientProps) {
  const { toast } = useToast();

  // Estado local de professores para atualizações otimistas (ex: toggle de status).
  // Inicializado via lazy initializer — não usa useEffect para evitar violação do ESLint.
  // Após revalidatePath no Server Action, Next.js re-renderiza o Server Component e
  // passa novas props. O estado é reiniciado pela remontagem automática do componente.
  const [professores, setProfessores] = useState<ProfessorRow[]>(() => initialProfessores);

  const [sel, setSel] = useState<ProfessorRow | null>(null);
  const [form, setForm] = useState<{ open: boolean; editing: ProfessorRow | null }>({
    open: false,
    editing: null,
  });
  const [tempSenha, setTempSenha] = useState<string | null>(null);
  const [isPendingToggle, startToggle] = useTransition();

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleFormSuccess = useCallback(
    (result: ActionResult) => {
      if (result.senhaTemp) {
        setTempSenha(result.senhaTemp);
        toast(
          result.emailFalhou
            ? "Professor cadastrado. Email de boas-vindas não enviado — compartilhe a senha manualmente."
            : "Professor cadastrado com sucesso.",
          result.emailFalhou ? "warn" : "ok"
        );
      } else {
        toast("Professor atualizado com sucesso.", "ok");
      }
      setSel(null);
    },
    [toast]
  );

  const handleToggleStatus = useCallback(
    (p: ProfessorRow) => {
      const novoStatus = p.status === "Ativo" ? "Inativo" : "Ativo";
      startToggle(async () => {
        const result = await toggleStatusProfessorAction(p.id, novoStatus as "Ativo" | "Inativo");
        if (result.ok) {
          setProfessores((prev) =>
            prev.map((x) => (x.id === p.id ? { ...x, status: novoStatus } : x))
          );
          // Atualizar sel se for o mesmo professor
          setSel((prev) =>
            prev?.id === p.id ? { ...prev, status: novoStatus } : prev
          );
          toast(
            `Professor ${p.nome.split(" ")[0]} agora está ${novoStatus}.`,
            novoStatus === "Inativo" ? "warn" : "ok"
          );
        } else {
          toast(result.error ?? "Erro ao atualizar status.", "err");
        }
      });
    },
    [toast]
  );

  const handleEdit = useCallback((p: ProfessorRow) => {
    setSel(null);
    setForm({ open: true, editing: p });
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div style={{ padding: "24px 28px", maxWidth: 1440, margin: "0 auto" }}>
      {/* Banner de senha temporária */}
      {tempSenha && (
        <TempPwBanner senha={tempSenha} onClose={() => setTempSenha(null)} />
      )}

      {/* Distribuição de carga */}
      <DistribuicaoCarga professores={professores} />

      {/* Tabela principal */}
      <TabelaProfessores
        professores={professores}
        onSelect={setSel}
        onNew={() => setForm({ open: true, editing: null })}
      />

      {/* Modal de detalhe */}
      <ProfessorDetailModal
        professor={sel}
        alunos={sel ? (alunosPorProfessor[sel.id] ?? []) : []}
        kpi={sel ? (kpisPagamento[sel.id] ?? null) : null}
        onClose={() => setSel(null)}
        onEdit={handleEdit}
        onToggleStatus={handleToggleStatus}
      />

      {/* Modal de criação/edição
          key garante remontagem ao trocar de professor ou abrir modo novo,
          fazendo com que o lazy initializer recalcule o estado do form. */}
      <ProfessorFormModal
        key={form.editing?.id ?? "new"}
        open={form.open}
        onClose={() => setForm({ open: false, editing: null })}
        editing={form.editing}
        onSuccess={handleFormSuccess}
      />

      {/* Overlay de pending para toggle de status */}
      {isPendingToggle && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            background: "transparent",
            cursor: "wait",
            pointerEvents: "all",
          }}
          aria-label="Processando…"
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Estilos inline compartilhados
// ---------------------------------------------------------------------------
const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  padding: "0 12px",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r)",
  background: "var(--surface)",
  color: "var(--ink)",
  fontSize: 14,
  outline: "none",
  boxShadow: "var(--sh-sm)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--ink-2)",
  marginBottom: 6,
};

const btnPrimaryStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  height: 36,
  padding: "0 16px",
  background: "var(--blue)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--r)",
  fontWeight: 600,
  fontSize: 13.5,
  cursor: "pointer",
  boxShadow: "var(--sh-sm)",
};

const btnGhostStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  height: 36,
  padding: "0 14px",
  background: "transparent",
  color: "var(--ink-2)",
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r)",
  fontWeight: 500,
  fontSize: 13.5,
  cursor: "pointer",
};

const btnSmBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 12px",
  borderRadius: "var(--r)",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const btnGhostSmStyle: React.CSSProperties = {
  ...btnSmBase,
  background: "transparent",
  border: "1px solid var(--line-2)",
  color: "var(--ink-2)",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderBottom: "1px solid var(--line)",
  fontSize: 13.5,
  color: "var(--ink-2)",
  verticalAlign: "middle",
};
