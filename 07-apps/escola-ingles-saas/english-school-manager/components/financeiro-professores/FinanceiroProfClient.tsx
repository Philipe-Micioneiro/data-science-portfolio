'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';
import KpiCard from '@/components/ui/KpiCard';
import Modal from '@/components/ui/Modal';
import FilterChips from '@/components/ui/FilterChips';
import ExportMenu from '@/components/ui/ExportMenu';
import Empty from '@/components/ui/Empty';
import { useToast } from '@/components/ui/Toast';
import { pagarProfessorAction, registrarExportacaoProfAction } from '@/app/(app)/financeiro-professores/actions';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos exportados
// ─────────────────────────────────────────────────────────────────────────────

export interface ProfPaymentRow {
  /** ID do registro em teacher_payments */
  id: string;
  teacher_id: string;
  professor: string;
  valor_hora: number | null;
  forma_pagamento_prof: string | null;
  /** Quantidade de aulas realizadas no mês */
  aulas: number;
  /** Total de minutos de aulas realizadas no mês */
  total_min: number;
  valor_devido: number;
  valor_pago: number;
  /** Enum: Pago | Parcial | Pendente */
  status: string;
  competencia: string;
}

interface FinanceiroProfClientProps {
  payments: ProfPaymentRow[];
  mes: string; // "YYYY-MM"
}

// ─────────────────────────────────────────────────────────────────────────────
// Ícones inline
// ─────────────────────────────────────────────────────────────────────────────

const IconBriefcase = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconDollar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const IconCheckCircle = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const IconAlert = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconSearch = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Utilitários
// ─────────────────────────────────────────────────────────────────────────────

function fmtMoeda(v: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtHoras(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Gera lista dos últimos 12 meses no formato "YYYY-MM" */
function ultimosDozeMeses(): Array<{ value: string; label: string }> {
  const result: Array<{ value: string; label: string }> = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    result.push({ value, label });
  }
  return result;
}

/** Formata "YYYY-MM" em "MMM/AAAA" para exibição compacta */
function fmtMesCompetencia(mes: string): string {
  const [ano, m] = mes.split('-');
  const d = new Date(Number(ano), Number(m) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}

// StatusBadge para teacher_payments tem estados diferentes dos alunos
// Pago → verde | Parcial → âmbar | Pendente → vermelho
function ProfStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; dot: string }> = {
    Pago: { bg: 'var(--green-bg)', text: 'var(--green-text)', dot: 'var(--green-text)' },
    Parcial: { bg: 'var(--amber-bg)', text: 'var(--amber-text)', dot: 'var(--amber-text)' },
    Pendente: { bg: 'var(--red-bg)', text: 'var(--red-text)', dot: 'var(--red-text)' },
  };
  const cfg = map[status] ?? { bg: 'var(--hover)', text: 'var(--muted)', dot: 'var(--muted)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 9px', borderRadius: 99, fontSize: 12.5, fontWeight: 600,
      background: cfg.bg, color: cfg.text, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: cfg.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PagarProfModal — inline no mesmo arquivo
// ─────────────────────────────────────────────────────────────────────────────

interface PagarProfModalProps {
  open: boolean;
  row: ProfPaymentRow | null;
  onClose: () => void;
  onConfirm: (row: ProfPaymentRow, valorNovo: number, formaPagamento: string) => void;
  isPending: boolean;
  serverError: string | null;
}

const FORMAS_PROF = ['PIX', 'Transferência', 'Dinheiro', 'Outro'] as const;
type FormaPagProf = (typeof FORMAS_PROF)[number];

function PagarProfModal({
  open,
  row,
  onClose,
  onConfirm,
  isPending,
  serverError,
}: PagarProfModalProps) {
  const restante = row ? row.valor_devido - row.valor_pago : 0;

  // Estado local do modal — valor e forma
  const [valor, setValor] = useState<string>('');
  const [forma, setForma] = useState<FormaPagProf>('PIX');

  // Reset ao abrir: usar key no pai (ver abaixo)

  const valorNum = parseFloat(valor.replace(',', '.')) || 0;
  const canConfirm = valorNum > 0 && valorNum <= restante && !isPending;

  function handleConfirm() {
    if (!row || !canConfirm) return;
    onConfirm(row, valorNum, forma);
  }

  if (!row) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Registrar pagamento"
      sub={row.professor}
      icon={<IconDollar />}
    >
      <div style={{ padding: 22 }}>
        {/* Resumo financeiro */}
        <div style={{
          background: 'var(--surface-2)', border: '1px solid var(--line)',
          borderRadius: 10, padding: 16, marginBottom: 18,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 8 }}>
            <span style={{ color: 'var(--muted)' }}>Competência</span>
            <span style={{ fontWeight: 600 }}>{fmtMesCompetencia(row.competencia)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 8 }}>
            <span style={{ color: 'var(--muted)' }}>Total devido</span>
            <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtMoeda(row.valor_devido)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 8 }}>
            <span style={{ color: 'var(--muted)' }}>Já pago</span>
            <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: row.valor_pago > 0 ? 'var(--green-text)' : 'var(--muted)' }}>
              {fmtMoeda(row.valor_pago)}
            </span>
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', fontSize: 13,
            paddingTop: 8, borderTop: '1px solid var(--line)',
          }}>
            <span style={{ fontWeight: 600 }}>Restante</span>
            <span style={{
              fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              color: restante > 0 ? 'var(--red-text)' : 'var(--green-text)',
            }}>
              {fmtMoeda(restante)}
            </span>
          </div>
        </div>

        {/* Campo valor */}
        <div className="field" style={{ marginBottom: 14 }}>
          <label>Valor a pagar agora (R$)</label>
          <input
            className="input"
            type="number"
            min="0.01"
            step="0.01"
            max={restante}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            style={{ fontVariantNumeric: 'tabular-nums' }}
            autoFocus
          />
          {row.forma_pagamento_prof && (
            <span style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
              Forma preferida do professor: {row.forma_pagamento_prof}. Pagamento parcial permitido.
            </span>
          )}
        </div>

        {/* Forma de pagamento */}
        <div className="field">
          <label>Forma de pagamento</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FORMAS_PROF.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setForma(f)}
                style={{
                  flex: 1, minWidth: 80, height: 38, borderRadius: 10,
                  border: '1px solid ' + (forma === f ? 'var(--blue)' : 'var(--line-2)'),
                  background: forma === f ? 'var(--blue-50)' : 'var(--surface)',
                  color: forma === f ? 'var(--blue)' : 'var(--ink-2)',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {serverError && (
          <div style={{
            marginTop: 12, padding: '10px 14px',
            background: 'var(--red-bg)', borderRadius: 9,
            fontSize: 13, color: 'var(--red-text)', border: '1px solid var(--red-border)',
          }}>
            {serverError}
          </div>
        )}
      </div>

      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: 10,
        padding: '16px 22px', borderTop: '1px solid var(--line)', background: 'var(--surface-2)',
      }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canConfirm}
          onClick={handleConfirm}
        >
          {isPending ? 'Registrando…' : <><IconCheck />Confirmar pagamento</>}
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function FinanceiroProfClient({
  payments: initialPayments,
  mes,
}: FinanceiroProfClientProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Lista local de pagamentos — atualizada otimisticamente após pagar
  const [payments, setPayments] = useState<ProfPaymentRow[]>(initialPayments);

  // Modal
  const [modalRow, setModalRow] = useState<ProfPaymentRow | null>(null);
  const [modalKey, setModalKey] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);

  // Filtros client-side
  const [filterStatus, setFilterStatus] = useState('todos');
  const [query, setQuery] = useState('');

  // ── Seletor de mês ─────────────────────────────────────────────────────────
  const meses = ultimosDozeMeses();

  function handleMesChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`?mes=${e.target.value}`);
  }

  // ── Abrir modal ────────────────────────────────────────────────────────────
  const handleOpenModal = useCallback((row: ProfPaymentRow) => {
    setModalRow(row);
    setModalKey((k) => k + 1); // força remontagem do modal → reseta campos
    setServerError(null);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalRow(null);
    setServerError(null);
  }, []);

  // ── Confirmar pagamento ────────────────────────────────────────────────────
  function handleConfirm(row: ProfPaymentRow, valorNovo: number, formaPagamento: string) {
    setServerError(null);

    startTransition(async () => {
      const result = await pagarProfessorAction(
        row.id,
        valorNovo,
        formaPagamento,
        row.professor
      );

      if (!result.ok) {
        setServerError(result.error ?? 'Erro desconhecido.');
        return;
      }

      // Atualizar lista local otimisticamente
      setPayments((prev) =>
        prev.map((p) => {
          if (p.id !== row.id) return p;
          return {
            ...p,
            valor_pago: result.novoValorPago ?? p.valor_pago,
            status: result.novoStatus ?? p.status,
          };
        })
      );

      handleCloseModal();
      toast(
        `Pagamento de ${fmtMoeda(valorNovo)} registrado para ${row.professor.split(' ')[0]}.`
      );
    });
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalAPagar = payments.reduce((s, r) => s + r.valor_devido, 0);
  const totalPago = payments.reduce((s, r) => s + r.valor_pago, 0);
  const totalPendente = totalAPagar - totalPago;
  const pctQuitado = totalAPagar > 0 ? Math.round((totalPago / totalAPagar) * 100) : 0;

  // ── Filtros ───────────────────────────────────────────────────────────────
  const counts: Record<string, number> = {
    todos: payments.length,
    Pago: payments.filter((r) => r.status === 'Pago').length,
    Parcial: payments.filter((r) => r.status === 'Parcial').length,
    Pendente: payments.filter((r) => r.status === 'Pendente').length,
  };

  const filtered = payments.filter((r) => {
    if (filterStatus !== 'todos' && r.status !== filterStatus) return false;
    if (query && !r.professor.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  // ── Export ────────────────────────────────────────────────────────────────
  const exportData = filtered.map((r) => ({
    professor: r.professor,
    valor_hora: r.valor_hora ?? '',
    aulas: r.aulas,
    horas: fmtHoras(r.total_min),
    valor_devido: r.valor_devido,
    valor_pago: r.valor_pago,
    status: r.status,
  }));

  const exportColumns = [
    { label: 'Professor', key: 'professor' },
    { label: 'Hora/Aula (R$)', key: 'valor_hora' },
    { label: 'Qtd Aulas', key: 'aulas' },
    { label: 'Horas', key: 'horas' },
    { label: 'Total Devido (R$)', key: 'valor_devido' },
    { label: 'Total Pago (R$)', key: 'valor_pago' },
    { label: 'Status', key: 'status' },
  ];

  function handleExport(tipo: 'xlsx' | 'csv') {
    void registrarExportacaoProfAction(tipo, mes, filtered.length);
    toast(`Exportado ${filtered.length} professores (${tipo.toUpperCase()}).`);
  }

  const statusOpts = [
    { value: 'todos', label: 'Todos' },
    { value: 'Pago', label: 'Pagos' },
    { value: 'Parcial', label: 'Parciais' },
    { value: 'Pendente', label: 'Pendentes' },
  ];

  return (
    <>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        <KpiCard
          label={`Total a pagar — ${fmtMesCompetencia(mes)}`}
          value={fmtMoeda(totalAPagar)}
          icon={<IconBriefcase />}
          tone="blue"
        />
        <KpiCard
          label="Total pago"
          value={fmtMoeda(totalPago)}
          icon={<IconCheck />}
          tone="green"
          sub={`${pctQuitado}% quitado`}
        />
        <KpiCard
          label="Total pendente"
          value={fmtMoeda(totalPendente)}
          icon={<IconClock />}
          tone="amber"
        />
      </div>

      {/* Seção principal */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px 14px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap', gap: 10,
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>
              Pagamentos por professor
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
              {filtered.length} professor{filtered.length !== 1 ? 'es' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Seletor de mês */}
            <select
              className="input"
              style={{ height: 34, fontSize: 13, paddingRight: 28 }}
              value={mes}
              onChange={handleMesChange}
            >
              {meses.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <ExportMenu
              data={exportData as Record<string, unknown>[]}
              filename={`financeiro_professores_${mes}`}
              columns={exportColumns}
              label="Exportar"
              onExport={handleExport}
            />
          </div>
        </div>

        {/* Filtros */}
        <div style={{
          padding: '12px 22px', borderBottom: '1px solid var(--line)',
          display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}>
          <FilterChips
            options={statusOpts}
            value={filterStatus}
            onChange={setFilterStatus}
            counts={counts}
          />
          <input
            className="input"
            style={{ width: 240, height: 38, fontSize: 13 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar professor…"
          />
        </div>

        {/* Tabela */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Professor', 'Hora/Aula', 'Qtd Aulas', 'Cálculo', 'Total Devido', 'Total Pago', 'Status', ''].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 16px', textAlign: 'left',
                      fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const horasFormatado = fmtHoras(r.total_min);
                const horasDecimal = (r.total_min / 60).toFixed(1);
                return (
                  <tr
                    key={r.id}
                    style={{ borderBottom: '1px solid var(--line)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--hover)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
                  >
                    {/* Professor */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <Avatar name={r.professor} size="md" />
                        <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{r.professor}</span>
                      </div>
                    </td>
                    {/* Hora/Aula */}
                    <td style={{ padding: '12px 16px', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtMoeda(r.valor_hora)}
                    </td>
                    {/* Qtd Aulas */}
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                      {r.aulas}
                    </td>
                    {/* Cálculo */}
                    <td style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
                      {horasFormatado} ({horasDecimal}h) × {fmtMoeda(r.valor_hora)}
                    </td>
                    {/* Total Devido */}
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtMoeda(r.valor_devido)}
                    </td>
                    {/* Total Pago */}
                    <td style={{
                      padding: '12px 16px', fontVariantNumeric: 'tabular-nums',
                      color: r.valor_pago > 0 ? 'var(--green-text)' : 'var(--muted)',
                    }}>
                      {fmtMoeda(r.valor_pago)}
                    </td>
                    {/* Status */}
                    <td style={{ padding: '12px 16px' }}>
                      <ProfStatusBadge status={r.status} />
                    </td>
                    {/* Ação */}
                    <td style={{ padding: '12px 16px', width: 100 }}>
                      {r.status !== 'Pago' ? (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOpenModal(r)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                        >
                          <IconDollar />Pagar
                        </button>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 12.5, color: 'var(--green-text)', fontWeight: 600,
                        }}>
                          <IconCheckCircle />Quitado
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <Empty
              icon={<IconSearch />}
              title="Nenhum professor encontrado"
              description="Ajuste os filtros ou o termo de busca."
            />
          )}
        </div>

        {/* Rodapé informativo */}
        {payments.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5,
            color: 'var(--muted)', padding: '12px 16px',
            background: 'var(--surface-2)', borderTop: '1px solid var(--line)',
          }}>
            <IconAlert />
            <span>
              <strong>Cálculo automático:</strong> total devido = soma das horas das aulas realizadas no mês × valor hora/aula do professor. Aulas canceladas ou agendadas não são contabilizadas.
            </span>
          </div>
        )}
      </div>

      {/* Modal pagar — remontado via key para reset limpo */}
      <PagarProfModal
        key={`pagar-${modalKey}`}
        open={modalRow !== null}
        row={modalRow}
        onClose={handleCloseModal}
        onConfirm={handleConfirm}
        isPending={isPending}
        serverError={serverError}
      />
    </>
  );
}
