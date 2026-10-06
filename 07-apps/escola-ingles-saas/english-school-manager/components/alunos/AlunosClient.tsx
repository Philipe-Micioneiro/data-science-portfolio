'use client';

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  useTransition,
} from 'react';
import Avatar from '@/components/ui/Avatar';
import StatusBadge from '@/components/ui/StatusBadge';
import KpiCard from '@/components/ui/KpiCard';
import Modal from '@/components/ui/Modal';
import SearchInput from '@/components/ui/SearchInput';
import FilterChips from '@/components/ui/FilterChips';
import Empty from '@/components/ui/Empty';
import ExportMenu from '@/components/ui/ExportMenu';
import { useToast } from '@/components/ui/Toast';
import {
  criarAlunoAction,
  editarAlunoAction,
  inativarAlunoAction,
  reativarAlunoAction,
  registrarExportacaoAction,
} from '@/app/(app)/alunos/actions';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface AlunoRow {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  plano: string | null;
  nivel_ingles: string | null;
  valor_mensalidade: number | null;
  dia_vencimento: number | null;
  data_entrada: string | null;
  carga_horaria: string | null;
  observacoes: string | null;
  status: string;
  motivo_inativacao: string | null;
  status_atrasado_desde: string | null;
  criado_em: string;
  professor_ids: string[];
  professores_nomes: string[];
  /** crm_access.removido_em — quando o acesso no CRM externo será revogado (null = sem vínculo ou vitalício) */
  acesso_removido_em: string | null;
}

export interface ProfessorOpcao {
  id: string;
  nome: string;
}

export interface AgendaItem {
  id: string;
  start_at: string;
  status: string;
  teacher_nome: string | null;
}

export interface PagamentoItem {
  id: string;
  competencia: string;
  valor: number | null;
  data_pagamento: string | null;
  status: string;
  forma_pagamento: string | null;
}

interface AlunosClientProps {
  alunos: AlunoRow[];
  professores: ProfessorOpcao[];
  currentUserPerfil: string;
  /** Query param ?status= — ativar filtro automaticamente se fornecido */
  initialFilter?: string;
  /** Query param ?aluno= — abre o modal de detalhe desse aluno automaticamente ao carregar (ex: vindo do dashboard) */
  initialAlunoId?: string;
  /** Mapa de agenda por aluno_id para o modal de detalhe */
  agendaPorAluno: Record<string, AgendaItem[]>;
  /** Mapa de pagamentos por aluno_id para o modal de detalhe */
  pagamentosPorAluno: Record<string, PagamentoItem[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ícones inline leves
// ─────────────────────────────────────────────────────────────────────────────

const IconUserPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
  </svg>
);
const IconUsers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconCheck = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconEdit = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IconLock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const IconBan = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);
const IconRefresh = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const IconChevR = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const IconSearch = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconAlert = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconMoney = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);
const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Utilitários
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtMoeda(v: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function isRisco(aluno: AlunoRow): boolean {
  if (aluno.status !== 'Atrasado') return false;
  if (!aluno.status_atrasado_desde) return false;
  const vinte = new Date();
  vinte.setDate(vinte.getDate() - 20);
  return new Date(aluno.status_atrasado_desde) < vinte;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────────────────────────

type ModalState =
  | { kind: 'none' }
  | { kind: 'novo' }
  | { kind: 'detalhe'; aluno: AlunoRow; mode: 'view' | 'edit' }
  | { kind: 'inativar'; aluno: AlunoRow };

interface State {
  alunos: AlunoRow[];
  filter: string;
  filterProf: string;
  query: string;
  modal: ModalState;
}

type Action =
  | { type: 'SET_FILTER'; value: string }
  | { type: 'SET_FILTER_PROF'; value: string }
  | { type: 'SET_QUERY'; value: string }
  | { type: 'OPEN_NOVO' }
  | { type: 'NOVO_SAVED'; novoAluno: AlunoRow }
  | { type: 'OPEN_DETALHE'; aluno: AlunoRow }
  | { type: 'DETALHE_EDIT_MODE' }
  | { type: 'DETALHE_VIEW_MODE' }
  | { type: 'EDITAR_SAVED'; updated: AlunoRow }
  | { type: 'OPEN_INATIVAR'; aluno: AlunoRow }
  | { type: 'INATIVAR_SAVED'; alunoId: string }
  | { type: 'REATIVAR_SAVED'; alunoId: string }
  | { type: 'CLOSE_MODAL' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_FILTER':
      return { ...state, filter: action.value };
    case 'SET_FILTER_PROF':
      return { ...state, filterProf: action.value };
    case 'SET_QUERY':
      return { ...state, query: action.value };
    case 'OPEN_NOVO':
      return { ...state, modal: { kind: 'novo' } };
    case 'NOVO_SAVED':
      return {
        ...state,
        alunos: [action.novoAluno, ...state.alunos],
        modal: { kind: 'none' },
      };
    case 'OPEN_DETALHE':
      return { ...state, modal: { kind: 'detalhe', aluno: action.aluno, mode: 'view' } };
    case 'DETALHE_EDIT_MODE':
      if (state.modal.kind !== 'detalhe') return state;
      return { ...state, modal: { ...state.modal, mode: 'edit' } };
    case 'DETALHE_VIEW_MODE':
      if (state.modal.kind !== 'detalhe') return state;
      return { ...state, modal: { ...state.modal, mode: 'view' } };
    case 'EDITAR_SAVED': {
      const updated = action.updated;
      const newAlunos = state.alunos.map((a) => (a.id === updated.id ? updated : a));
      return {
        ...state,
        alunos: newAlunos,
        modal: { kind: 'detalhe', aluno: updated, mode: 'view' },
      };
    }
    case 'OPEN_INATIVAR':
      return { ...state, modal: { kind: 'inativar', aluno: action.aluno } };
    case 'INATIVAR_SAVED': {
      const newAlunos = state.alunos.map((a) =>
        a.id === action.alunoId
          ? { ...a, status: 'Inativo', status_atrasado_desde: null }
          : a,
      );
      return { ...state, alunos: newAlunos, modal: { kind: 'none' } };
    }
    case 'REATIVAR_SAVED': {
      const newAlunos = state.alunos.map((a) =>
        a.id === action.alunoId
          ? { ...a, status: 'Ativo', motivo_inativacao: null, status_atrasado_desde: null }
          : a,
      );
      if (state.modal.kind === 'detalhe' && state.modal.aluno.id === action.alunoId) {
        const updatedAluno = newAlunos.find((a) => a.id === action.alunoId);
        if (updatedAluno) {
          return {
            ...state,
            alunos: newAlunos,
            modal: { kind: 'detalhe', aluno: updatedAluno, mode: 'view' },
          };
        }
      }
      return { ...state, alunos: newAlunos };
    }
    case 'CLOSE_MODAL':
      return { ...state, modal: { kind: 'none' } };
    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MultiProfessorPicker
// ─────────────────────────────────────────────────────────────────────────────

interface MultiProfessorPickerProps {
  professores: ProfessorOpcao[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

function MultiProfessorPicker({ professores, selectedIds, onChange, disabled }: MultiProfessorPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  function remove(id: string) {
    onChange(selectedIds.filter((i) => i !== id));
  }

  const selectedProfs = professores.filter((p) => selectedIds.includes(p.id));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Badges dos selecionados */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        minHeight: 38,
        padding: '6px 10px',
        border: '1px solid var(--line-2)',
        borderRadius: 10,
        background: disabled ? 'var(--surface-2)' : 'var(--surface)',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }} onClick={() => !disabled && setOpen((o) => !o)}>
        {selectedProfs.length === 0 && (
          <span style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: '24px' }}>
            Selecionar professor(es)...
          </span>
        )}
        {selectedProfs.map((p) => (
          <span key={p.id} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 10px 3px 10px',
            borderRadius: 99,
            background: 'var(--blue-50)',
            color: 'var(--blue)',
            fontSize: 12.5,
            fontWeight: 600,
          }}>
            {p.nome}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); remove(p.id); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blue)', display: 'flex', alignItems: 'center', padding: 0 }}
              >
                <IconX />
              </button>
            )}
          </span>
        ))}
      </div>

      {/* Dropdown */}
      {open && !disabled && (
        <div className="fade-in" style={{
          position: 'absolute',
          top: 44,
          left: 0,
          right: 0,
          zIndex: 40,
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-lg)',
          boxShadow: 'var(--sh-lg)',
          padding: 5,
          maxHeight: 220,
          overflowY: 'auto',
        }}>
          {professores.map((p) => {
            const selected = selectedIds.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 10px',
                  border: 'none',
                  background: selected ? 'var(--blue-50)' : 'transparent',
                  borderRadius: 8,
                  fontSize: 13.5,
                  color: selected ? 'var(--blue)' : 'var(--ink-2)',
                  fontWeight: selected ? 600 : 400,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {selected && <IconCheck />}
                {!selected && <span style={{ width: 15 }} />}
                {p.nome}
              </button>
            );
          })}
          {professores.length === 0 && (
            <div style={{ padding: '8px 10px', fontSize: 13, color: 'var(--muted)' }}>
              Nenhum professor ativo disponível.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NovoAlunoModal — F3A.2
// ─────────────────────────────────────────────────────────────────────────────

interface NovoAlunoModalProps {
  open: boolean;
  professores: ProfessorOpcao[];
  onClose: () => void;
  onSave: (formData: FormData) => void;
  isPending: boolean;
  serverError: string | null;
}

const PLANO_OPTS = ['Full', 'Recorrente', 'Parcelado'];
const NIVEL_OPTS = ['Beginner', 'Elementary', 'Pre-Intermediate', 'Intermediate', 'Upper-Intermediate', 'Advanced', 'Proficiency'];

function NovoAlunoModal({ open, professores, onClose, onSave, isPending, serverError }: NovoAlunoModalProps) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [plano, setPlano] = useState('');
  const [nivel, setNivel] = useState('');
  const [valorMens, setValorMens] = useState('');
  const [diaVenc, setDiaVenc] = useState('');
  const [dataEntrada, setDataEntrada] = useState('');
  const [cargaHoraria, setCargaHoraria] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [profIds, setProfIds] = useState<string[]>([]);

  const valid = nome.trim() !== '' && telefone.trim() !== '' && profIds.length > 0 && !isPending;

  function handleSubmit() {
    if (!valid) return;
    const fd = new FormData();
    fd.append('nome', nome.trim());
    fd.append('telefone', telefone.trim());
    fd.append('email', email.trim());
    fd.append('plano', plano);
    fd.append('nivel_ingles', nivel);
    fd.append('valor_mensalidade', valorMens);
    fd.append('dia_vencimento', diaVenc);
    fd.append('data_entrada', dataEntrada);
    fd.append('carga_horaria', cargaHoraria.trim());
    fd.append('observacoes', observacoes.trim());
    fd.append('professor_ids', profIds.join(','));
    onSave(fd);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Novo aluno"
      sub="Cadastre um novo aluno e vincule ao(s) professor(es)"
      icon={<IconUserPlus />}
    >
      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '65vh', overflowY: 'auto' }}>
        {/* Nome e Telefone */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Nome completo *</label>
            <input
              className="input"
              placeholder="Nome completo"
              autoFocus
              disabled={isPending}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Telefone *</label>
            <input
              className="input"
              placeholder="(11) 99999-9999"
              disabled={isPending}
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>
        </div>

        {/* Email */}
        <div className="field">
          <label>Email</label>
          <input
            className="input"
            type="email"
            placeholder="aluno@email.com"
            disabled={isPending}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Plano e Nível */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Plano</label>
            <select className="input" disabled={isPending} value={plano} onChange={(e) => setPlano(e.target.value)}>
              <option value="">Selecionar...</option>
              {PLANO_OPTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Nível de inglês</label>
            <select className="input" disabled={isPending} value={nivel} onChange={(e) => setNivel(e.target.value)}>
              <option value="">Selecionar...</option>
              {NIVEL_OPTS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Valor mensalidade e Dia vencimento */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Valor mensalidade (R$)</label>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              disabled={isPending}
              value={valorMens}
              onChange={(e) => setValorMens(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Dia de vencimento</label>
            <input
              className="input"
              type="number"
              min="1"
              max="31"
              placeholder="Ex: 10"
              disabled={isPending}
              value={diaVenc}
              onChange={(e) => setDiaVenc(e.target.value)}
            />
          </div>
        </div>

        {/* Data entrada e Carga horária */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Data de entrada</label>
            <input
              className="input"
              type="date"
              disabled={isPending}
              value={dataEntrada}
              onChange={(e) => setDataEntrada(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Frequência / Carga horária</label>
            <input
              className="input"
              placeholder="Ex: 2x por semana, 1h"
              disabled={isPending}
              value={cargaHoraria}
              onChange={(e) => setCargaHoraria(e.target.value)}
            />
          </div>
        </div>

        {/* Professor(es) */}
        <div className="field">
          <label>Professor(es) *</label>
          <MultiProfessorPicker
            professores={professores}
            selectedIds={profIds}
            onChange={setProfIds}
            disabled={isPending}
          />
          {profIds.length === 0 && (
            <span className="hint" style={{ color: 'var(--muted)' }}>Selecione pelo menos um professor.</span>
          )}
        </div>

        {/* Observações */}
        <div className="field">
          <label>Observações</label>
          <textarea
            className="input"
            rows={3}
            placeholder="Informações adicionais..."
            disabled={isPending}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>

        {serverError && (
          <div style={{ padding: '10px 14px', background: 'var(--red-bg)', borderRadius: 9, fontSize: 13, color: 'var(--red-text)', border: '1px solid var(--red-border)' }}>
            {serverError}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 22px', borderTop: '1px solid var(--line)', background: 'var(--surface-2)' }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={!valid} onClick={handleSubmit}>
          {isPending ? 'Cadastrando…' : <><IconCheck />Cadastrar aluno</>}
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AlunoEditForm — sub-componente isolado para o modo edit.
// Usa defaultValues como estado inicial e é remontado via key pelo pai.
// Isso evita useEffect + setState (react-hooks/set-state-in-effect) e
// refs lidos durante o render (react-hooks/refs).
// ─────────────────────────────────────────────────────────────────────────────

interface EditFormDefaults {
  telefone: string;
  email: string;
  plano: string;
  nivel: string;
  valorMens: string;
  diaVenc: string;
  cargaHoraria: string;
  observacoes: string;
  profIds: string[];
}

interface AlunoEditFormProps {
  defaults: EditFormDefaults;
  aluno: AlunoRow;
  professores: ProfessorOpcao[];
  isAdmin: boolean;
  isPending: boolean;
  serverError: string | null;
  onViewMode: () => void;
  onClose: () => void;
  onSaveEdit: (formData: FormData) => void;
}

function AlunoEditForm({
  defaults,
  aluno,
  professores,
  isAdmin,
  isPending,
  serverError,
  onViewMode,
  onClose,
  onSaveEdit,
}: AlunoEditFormProps) {
  const [telefone, setTelefone] = useState(defaults.telefone);
  const [email, setEmail] = useState(defaults.email);
  const [plano, setPlano] = useState(defaults.plano);
  const [nivel, setNivel] = useState(defaults.nivel);
  const [valorMens, setValorMens] = useState(defaults.valorMens);
  const [diaVenc, setDiaVenc] = useState(defaults.diaVenc);
  const [cargaHoraria, setCargaHoraria] = useState(defaults.cargaHoraria);
  const [observacoes, setObservacoes] = useState(defaults.observacoes);
  const [profIds, setProfIds] = useState<string[]>(defaults.profIds);

  function handleSave() {
    const fd = new FormData();
    fd.append('id', aluno.id);
    fd.append('telefone', telefone);
    fd.append('email', email);
    fd.append('plano', plano);
    fd.append('nivel_ingles', nivel);
    fd.append('dia_vencimento', diaVenc);
    fd.append('carga_horaria', cargaHoraria);
    fd.append('observacoes', observacoes);
    fd.append('status', aluno.status);
    fd.append('status_anterior', aluno.status);
    fd.append('professor_ids', profIds.join(','));
    if (isAdmin) {
      fd.append('valor_mensalidade', valorMens);
    }
    onSaveEdit(fd);
  }

  return (
    <>
      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '65vh', overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Telefone *</label>
            <input
              className="input"
              disabled={isPending}
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              className="input"
              type="email"
              disabled={isPending}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Plano</label>
            <select className="input" disabled={isPending} value={plano} onChange={(e) => setPlano(e.target.value)}>
              <option value="">Selecionar...</option>
              {PLANO_OPTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Nível de inglês</label>
            <select className="input" disabled={isPending} value={nivel} onChange={(e) => setNivel(e.target.value)}>
              <option value="">Selecionar...</option>
              {NIVEL_OPTS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              Mensalidade (R$)
              {!isAdmin && <IconLock />}
            </label>
            {isAdmin ? (
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                disabled={isPending}
                value={valorMens}
                onChange={(e) => setValorMens(e.target.value)}
              />
            ) : (
              <div className="input" style={{ background: 'var(--surface-2)', color: 'var(--muted)', cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconLock />
                {aluno.valor_mensalidade != null ? fmtMoeda(aluno.valor_mensalidade) : '—'}
              </div>
            )}
          </div>
          <div className="field">
            <label>Dia de vencimento</label>
            <input
              className="input"
              type="number"
              min="1"
              max="31"
              disabled={isPending}
              value={diaVenc}
              onChange={(e) => setDiaVenc(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>Frequência / Carga horária</label>
          <input
            className="input"
            disabled={isPending}
            value={cargaHoraria}
            onChange={(e) => setCargaHoraria(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Professor(es) *</label>
          <MultiProfessorPicker
            professores={professores}
            selectedIds={profIds}
            onChange={setProfIds}
            disabled={isPending}
          />
        </div>

        <div className="field">
          <label>Observações</label>
          <textarea
            className="input"
            rows={3}
            disabled={isPending}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>

        {serverError && (
          <div style={{ padding: '10px 14px', background: 'var(--red-bg)', borderRadius: 9, fontSize: 13, color: 'var(--red-text)', border: '1px solid var(--red-border)' }}>
            {serverError}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 22px', borderTop: '1px solid var(--line)', background: 'var(--surface-2)' }}>
        <button className="btn btn-ghost" onClick={onViewMode}>Voltar</button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-primary"
            disabled={isPending || profIds.length === 0}
            onClick={handleSave}
          >
            {isPending ? 'Salvando…' : <><IconCheck />Salvar alterações</>}
          </button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AlunoDetailModal — F3A.3
// ─────────────────────────────────────────────────────────────────────────────

interface AlunoDetailModalProps {
  aluno: AlunoRow | null;
  mode: 'view' | 'edit';
  professores: ProfessorOpcao[];
  perfilAtual: string;
  agenda: AgendaItem[];
  pagamentos: PagamentoItem[];
  onClose: () => void;
  onEditMode: () => void;
  onViewMode: () => void;
  onSaveEdit: (formData: FormData) => void;
  onInativar: (aluno: AlunoRow) => void;
  onReativar: (alunoId: string) => void;
  isPending: boolean;
  serverError: string | null;
}

function AlunoDetailModal({
  aluno,
  mode,
  professores,
  perfilAtual,
  agenda,
  pagamentos,
  onClose,
  onEditMode,
  onViewMode,
  onSaveEdit,
  onInativar,
  onReativar,
  isPending,
  serverError,
}: AlunoDetailModalProps) {
  const [confirmReativar, setConfirmReativar] = useState(false);

  if (!aluno) return null;

  const isAtrasado = aluno.status === 'Atrasado';
  const isInativo = aluno.status === 'Inativo';
  const canEdit = perfilAtual !== 'Professor';
  const isAdmin = perfilAtual === 'Administrador';

  // Defaults para o form de edição — passados como props para o sub-componente
  // isolado. O pai usa key={aluno.id + mode} para forçar remontagem ao mudar.
  const editDefaults: EditFormDefaults = {
    telefone: aluno.telefone ?? '',
    email: aluno.email ?? '',
    plano: aluno.plano ?? '',
    nivel: aluno.nivel_ingles ?? '',
    valorMens: aluno.valor_mensalidade != null ? String(aluno.valor_mensalidade) : '',
    diaVenc: aluno.dia_vencimento != null ? String(aluno.dia_vencimento) : '',
    cargaHoraria: aluno.carga_horaria ?? '',
    observacoes: aluno.observacoes ?? '',
    profIds: aluno.professor_ids,
  };

  return (
    <Modal
      open={!!aluno}
      onClose={onClose}
      size="xl"
      title={aluno.nome}
      sub={`${aluno.status}${aluno.plano ? ' · ' + aluno.plano : ''}`}
      icon={<IconUsers />}
    >
      {/* Modo view */}
      {mode === 'view' && (
        <div style={{ padding: '18px 22px 22px', maxHeight: '75vh', overflowY: 'auto' }}>
          {/* Header: status badge + valor */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 18,
            padding: '16px 18px',
            background: 'var(--surface-2)',
            border: '1px solid var(--line)',
            borderRadius: 12,
          }}>
            <Avatar name={aluno.nome} size="lg" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>{aluno.nome}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <StatusBadge status={aluno.status} />
                {aluno.valor_mensalidade != null && (
                  <span style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IconMoney />
                    {fmtMoeda(aluno.valor_mensalidade)}/mês
                  </span>
                )}
                {isRisco(aluno) && (
                  <span style={{
                    padding: '3px 9px',
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 600,
                    background: 'var(--red-bg)',
                    color: 'var(--red-text)',
                  }}>
                    Risco de inativação
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Aviso amber para atrasado (SPEC §0.2) */}
          {isAtrasado && (
            <div style={{
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
              padding: '10px 14px',
              background: 'var(--amber-bg)',
              border: '1px solid var(--amber-text)',
              borderRadius: 10,
              marginBottom: 16,
              fontSize: 13,
              color: 'var(--amber-text)',
            }}>
              <IconAlert />
              <span>Este aluno possui pagamento em atraso. Verifique o histórico financeiro.</span>
            </div>
          )}

          {/* Grid de informações */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 24px', marginBottom: 18 }}>
            {([
              ['Email', aluno.email ?? '—'],
              ['Telefone', aluno.telefone],
              ['Plano', aluno.plano ?? '—'],
              ['Nível de inglês', aluno.nivel_ingles ?? '—'],
              ['Carga horária', aluno.carga_horaria ?? '—'],
              ['Mensalidade', aluno.valor_mensalidade != null ? fmtMoeda(aluno.valor_mensalidade) : '—'],
              ['Vencimento', aluno.dia_vencimento != null ? `Dia ${aluno.dia_vencimento}` : '—'],
              ['Data de entrada', fmtDate(aluno.data_entrada)],
              ['Acesso vence em', fmtDate(aluno.acesso_removido_em)],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{k}</div>
                <div style={{ fontSize: 13.5, fontWeight: 500, marginTop: 2, color: 'var(--ink)', wordBreak: 'break-all' }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Professores vinculados */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Professores</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {aluno.professores_nomes.length > 0 ? aluno.professores_nomes.map((n, i) => (
                <span key={i} style={{
                  padding: '3px 10px',
                  borderRadius: 99,
                  background: 'var(--blue-50)',
                  color: 'var(--blue)',
                  fontSize: 12.5,
                  fontWeight: 600,
                }}>
                  {n}
                </span>
              )) : <span style={{ fontSize: 13, color: 'var(--muted)' }}>—</span>}
            </div>
          </div>

          {/* Observações */}
          {aluno.observacoes && (
            <div style={{ marginBottom: 18, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Observações</div>
              <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6 }}>{aluno.observacoes}</div>
            </div>
          )}

          {/* Agenda rápida */}
          {agenda.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconCalendar />Próximas aulas
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {agenda.slice(0, 3).map((a) => (
                  <div key={a.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--surface-2)',
                    borderRadius: 9,
                    border: '1px solid var(--line)',
                  }}>
                    <div style={{ fontSize: 13, color: 'var(--ink)' }}>{fmtDateTime(a.start_at)}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {a.teacher_nome && (
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{a.teacher_nome}</span>
                      )}
                      <StatusBadge status={a.status} short />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Histórico financeiro */}
          {pagamentos.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconMoney />Histórico financeiro recente
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pagamentos.slice(0, 4).map((p) => (
                  <div key={p.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'var(--surface-2)',
                    borderRadius: 9,
                    border: '1px solid var(--line)',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{p.competencia}</div>
                      {p.forma_pagamento && (
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.forma_pagamento}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
                        {fmtMoeda(p.valor)}
                      </span>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Motivo inativação */}
          {isInativo && aluno.motivo_inativacao && (
            <div style={{ marginBottom: 18, padding: '12px 14px', background: 'var(--hover)', borderRadius: 10, border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Motivo de inativação</div>
              <div style={{ fontSize: 13, color: 'var(--ink)' }}>{aluno.motivo_inativacao}</div>
            </div>
          )}

          {serverError && (
            <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--red-bg)', borderRadius: 9, fontSize: 13, color: 'var(--red-text)', border: '1px solid var(--red-border)' }}>
              {serverError}
            </div>
          )}

          {/* Ações */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {canEdit && !isInativo && (
              <button className="btn btn-ghost btn-sm" onClick={onEditMode}>
                <IconEdit />Editar
              </button>
            )}
            {/* Ver na agenda — oculto se Inativo (SPEC §0.2) */}
            {!isInativo && (
              <button className="btn btn-ghost btn-sm" onClick={() => window.location.assign('/agenda')}>
                <IconCalendar />Ver na agenda
              </button>
            )}
            {canEdit && !isInativo && (
              <button
                className="btn btn-sm"
                style={{ background: 'var(--red-bg)', color: 'var(--red-text)', border: '1px solid var(--red-border)' }}
                onClick={() => onInativar(aluno)}
              >
                <IconBan />Inativar
              </button>
            )}
            {canEdit && isInativo && (
              confirmReativar ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Confirmar reativação?</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmReativar(false)}>Não</button>
                  <button
                    className="btn btn-sm"
                    style={{ background: 'var(--green-bg)', color: 'var(--green-text)', border: '1px solid var(--green-text)' }}
                    disabled={isPending}
                    onClick={() => { setConfirmReativar(false); onReativar(aluno.id); }}
                  >
                    <IconRefresh />Reativar
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-sm"
                  style={{ background: 'var(--green-bg)', color: 'var(--green-text)', border: '1px solid var(--green-text)' }}
                  onClick={() => setConfirmReativar(true)}
                >
                  <IconRefresh />Reativar
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Modo edit — AlunoEditForm remontado via key para reset limpo de estado */}
      {mode === 'edit' && (
        <AlunoEditForm
          key={`${aluno.id}-edit`}
          defaults={editDefaults}
          aluno={aluno}
          professores={professores}
          isAdmin={isAdmin}
          isPending={isPending}
          serverError={serverError}
          onViewMode={onViewMode}
          onClose={onClose}
          onSaveEdit={onSaveEdit}
        />
      )}
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InativarAlunoModal — F3A.4
// ─────────────────────────────────────────────────────────────────────────────

interface InativarAlunoModalProps {
  aluno: AlunoRow | null;
  onClose: () => void;
  onSave: (formData: FormData) => void;
  isPending: boolean;
  serverError: string | null;
}

function InativarAlunoModal({ aluno, onClose, onSave, isPending, serverError }: InativarAlunoModalProps) {
  const [motivo, setMotivo] = useState('');

  const valid = motivo.trim() !== '' && !isPending;

  function handleSubmit() {
    if (!valid || !aluno) return;
    const fd = new FormData();
    fd.append('id', aluno.id);
    fd.append('motivo', motivo.trim());
    onSave(fd);
  }

  if (!aluno) return null;

  return (
    <Modal
      open={!!aluno}
      onClose={onClose}
      size="md"
      title="Inativar aluno"
      sub={aluno.nome}
      icon={<IconBan />}
    >
      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{
          padding: '12px 14px',
          background: 'var(--amber-bg)',
          borderRadius: 10,
          border: '1px solid var(--amber-text)',
          fontSize: 13,
          color: 'var(--amber-text)',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-start',
        }}>
          <IconAlert />
          <span>O aluno será marcado como inativo. O histórico será preservado e o aluno poderá ser reativado futuramente.</span>
        </div>

        <div className="field">
          <label>Motivo da inativação *</label>
          <textarea
            className="input"
            rows={3}
            autoFocus
            placeholder="Descreva o motivo da inativação..."
            disabled={isPending}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            style={{ resize: 'vertical' }}
          />
        </div>

        {serverError && (
          <div style={{ padding: '10px 14px', background: 'var(--red-bg)', borderRadius: 9, fontSize: 13, color: 'var(--red-text)', border: '1px solid var(--red-border)' }}>
            {serverError}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 22px', borderTop: '1px solid var(--line)', background: 'var(--surface-2)' }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button
          className="btn"
          style={{ background: 'var(--red-bg)', color: 'var(--red-text)', border: '1px solid var(--red-border)', opacity: valid ? 1 : 0.5, cursor: valid ? 'pointer' : 'not-allowed' }}
          disabled={!valid}
          onClick={handleSubmit}
        >
          {isPending ? 'Inativando…' : <><IconBan />Confirmar inativação</>}
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function AlunosClient({
  alunos: initialAlunos,
  professores,
  currentUserPerfil,
  initialFilter = 'todos',
  initialAlunoId,
  agendaPorAluno,
  pagamentosPorAluno,
}: AlunosClientProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const [state, dispatch] = useReducer(reducer, {
    alunos: initialAlunos,
    filter: initialFilter,
    filterProf: 'todos',
    query: '',
    modal: { kind: 'none' },
  });

  // Abre o detalhe automaticamente quando vem de ?aluno=<id> (ex: clique num widget do dashboard)
  useEffect(() => {
    if (!initialAlunoId) return;
    const aluno = initialAlunos.find((a) => a.id === initialAlunoId);
    if (aluno) dispatch({ type: 'OPEN_DETALHE', aluno });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAlunoId]);

  const setFilter = useCallback((v: string) => dispatch({ type: 'SET_FILTER', value: v }), []);
  const setFilterProf = useCallback((v: string) => dispatch({ type: 'SET_FILTER_PROF', value: v }), []);
  const setQuery = useCallback((v: string) => dispatch({ type: 'SET_QUERY', value: v }), []);

  const { alunos, filter, filterProf, query, modal } = state;

  // ── Filtros client-side ───────────────────────────────────────────────────
  const vinte = new Date();
  vinte.setDate(vinte.getDate() - 20);
  const vinteISO = vinte.toISOString();

  const filtered = alunos.filter((a) => {
    // Filtro por status
    if (filter === 'Risco') {
      // Atrasado e status_atrasado_desde < now()-20d
      if (a.status !== 'Atrasado') return false;
      if (!a.status_atrasado_desde || a.status_atrasado_desde >= vinteISO) return false;
    } else if (filter !== 'todos') {
      if (a.status !== filter) return false;
    }

    // Filtro por professor
    if (filterProf !== 'todos') {
      if (!a.professor_ids.includes(filterProf)) return false;
    }

    // Busca textual
    if (query) {
      const t = query.toLowerCase();
      const matchNome = a.nome.toLowerCase().includes(t);
      const matchEmail = (a.email ?? '').toLowerCase().includes(t);
      const matchTel = (a.telefone ?? '').toLowerCase().includes(t);
      if (!matchNome && !matchEmail && !matchTel) return false;
    }

    return true;
  });

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalAtivos = alunos.filter((a) => a.status === 'Ativo').length;
  const totalAtrasados = alunos.filter((a) => a.status === 'Atrasado').length;
  const totalInativos = alunos.filter((a) => a.status === 'Inativo').length;
  const totalRisco = alunos.filter((a) =>
    a.status === 'Atrasado' &&
    a.status_atrasado_desde != null &&
    a.status_atrasado_desde < vinteISO,
  ).length;

  // ── Opções de filtro ──────────────────────────────────────────────────────
  const statusOpts = [
    { value: 'todos', label: 'Todos' },
    { value: 'Ativo', label: 'Ativo' },
    { value: 'Atrasado', label: 'Atrasado' },
    { value: 'Pendente de Validação', label: 'Pend. Validação' },
    { value: 'Inativo', label: 'Inativo' },
    { value: 'Risco', label: 'Risco de Inativação' },
  ];

  const statusCounts: Record<string, number> = {
    todos: alunos.length,
    Ativo: totalAtivos,
    Atrasado: totalAtrasados,
    'Pendente de Validação': alunos.filter((a) => a.status === 'Pendente de Validação').length,
    Inativo: totalInativos,
    Risco: totalRisco,
  };

  const profOpts = [
    { value: 'todos', label: 'Todos' },
    ...professores.map((p) => ({ value: p.id, label: p.nome })),
  ];

  // ── Export data ──────────────────────────────────────────────────────────
  const exportData = filtered.map((a) => ({
    nome: a.nome,
    email: a.email ?? '',
    telefone: a.telefone,
    status: a.status,
    plano: a.plano ?? '',
    nivel_ingles: a.nivel_ingles ?? '',
    professores: a.professores_nomes.join(', '),
    mensalidade: a.valor_mensalidade != null ? a.valor_mensalidade : '',
    vencimento: a.dia_vencimento != null ? `Dia ${a.dia_vencimento}` : '',
    entrada: fmtDate(a.data_entrada),
    carga_horaria: a.carga_horaria ?? '',
    acesso_vence_em: fmtDate(a.acesso_removido_em),
  }));

  const exportColumns = [
    { label: 'Nome', key: 'nome' },
    { label: 'Email', key: 'email' },
    { label: 'Telefone', key: 'telefone' },
    { label: 'Status', key: 'status' },
    { label: 'Plano', key: 'plano' },
    { label: 'Nível', key: 'nivel_ingles' },
    { label: 'Professores', key: 'professores' },
    { label: 'Mensalidade', key: 'mensalidade' },
    { label: 'Vencimento', key: 'vencimento' },
    { label: 'Data Entrada', key: 'entrada' },
    { label: 'Carga Horária', key: 'carga_horaria' },
    { label: 'Acesso Vence Em', key: 'acesso_vence_em' },
  ];

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleCriarAluno(formData: FormData) {
    setServerError(null);
    startTransition(async () => {
      const result = await criarAlunoAction({ ok: false }, formData);
      if (!result.ok) {
        setServerError(result.error ?? null);
        return;
      }
      // Construir AlunoRow otimista com dados do form
      const nome = (formData.get('nome') as string).trim();
      const telefone = (formData.get('telefone') as string).trim();
      const email = (formData.get('email') as string | null)?.trim() || null;
      const plano = (formData.get('plano') as string | null)?.trim() || null;
      const nivel_ingles = (formData.get('nivel_ingles') as string | null)?.trim() || null;
      const vmStr = (formData.get('valor_mensalidade') as string | null)?.trim() ?? '';
      const valor_mensalidade = vmStr !== '' ? Number(vmStr) : null;
      const dvStr = (formData.get('dia_vencimento') as string | null)?.trim() ?? '';
      const dia_vencimento = dvStr !== '' ? Number(dvStr) : null;
      const data_entrada = (formData.get('data_entrada') as string | null)?.trim() || null;
      const carga_horaria = (formData.get('carga_horaria') as string | null)?.trim() || null;
      const observacoes = (formData.get('observacoes') as string | null)?.trim() || null;
      const profIdsRaw = (formData.get('professor_ids') as string | null) ?? '';
      const professor_ids = profIdsRaw.split(',').map((s) => s.trim()).filter(Boolean);
      const professores_nomes = professor_ids.map((pid) => professores.find((p) => p.id === pid)?.nome ?? pid);

      const novoAluno: AlunoRow = {
        id: result.id ?? crypto.randomUUID(),
        nome, telefone, email, plano, nivel_ingles, valor_mensalidade, dia_vencimento,
        data_entrada, carga_horaria, observacoes,
        status: 'Ativo',
        motivo_inativacao: null,
        status_atrasado_desde: null,
        criado_em: new Date().toISOString(),
        professor_ids,
        professores_nomes,
        acesso_removido_em: null,
      };

      dispatch({ type: 'NOVO_SAVED', novoAluno });
      toast('Aluno cadastrado. Ação registrada na auditoria.');
    });
  }

  function handleEditarAluno(formData: FormData) {
    if (modal.kind !== 'detalhe') return;
    const alunoAtual = modal.aluno;
    setServerError(null);
    startTransition(async () => {
      const result = await editarAlunoAction({ ok: false }, formData);
      if (!result.ok) {
        setServerError(result.error ?? null);
        return;
      }

      const professor_ids_raw = (formData.get('professor_ids') as string | null) ?? '';
      const professor_ids = professor_ids_raw.split(',').map((s) => s.trim()).filter(Boolean);
      const professores_nomes = professor_ids.map((pid) => professores.find((p) => p.id === pid)?.nome ?? pid);

      const updatedAluno: AlunoRow = {
        ...alunoAtual,
        telefone: (formData.get('telefone') as string | null)?.trim() ?? alunoAtual.telefone,
        email: (formData.get('email') as string | null)?.trim() || null,
        plano: (formData.get('plano') as string | null)?.trim() || null,
        nivel_ingles: (formData.get('nivel_ingles') as string | null)?.trim() || null,
        dia_vencimento: (() => {
          const s = (formData.get('dia_vencimento') as string | null)?.trim() ?? '';
          return s !== '' ? Number(s) : null;
        })(),
        carga_horaria: (formData.get('carga_horaria') as string | null)?.trim() || null,
        observacoes: (formData.get('observacoes') as string | null)?.trim() || null,
        valor_mensalidade: currentUserPerfil === 'Administrador'
          ? (() => {
              const s = (formData.get('valor_mensalidade') as string | null)?.trim() ?? '';
              return s !== '' ? Number(s) : null;
            })()
          : alunoAtual.valor_mensalidade,
        professor_ids,
        professores_nomes,
      };

      dispatch({ type: 'EDITAR_SAVED', updated: updatedAluno });
      toast(`Dados de ${alunoAtual.nome.split(' ')[0]} atualizados.`);
    });
  }

  function handleInativarAluno(formData: FormData) {
    setServerError(null);
    startTransition(async () => {
      const result = await inativarAlunoAction({ ok: false }, formData);
      if (!result.ok) {
        setServerError(result.error ?? null);
        return;
      }
      const id = (formData.get('id') as string | null) ?? '';
      const aluno = alunos.find((a) => a.id === id);
      dispatch({ type: 'INATIVAR_SAVED', alunoId: id });
      toast(`${aluno?.nome.split(' ')[0] ?? 'Aluno'} inativado. Histórico preservado.`, 'warn');
    });
  }

  function handleReativarAluno(id: string) {
    const aluno = alunos.find((a) => a.id === id);
    setServerError(null);
    startTransition(async () => {
      const result = await reativarAlunoAction(id);
      if (!result.ok) {
        setServerError(result.error ?? null);
        return;
      }
      dispatch({ type: 'REATIVAR_SAVED', alunoId: id });
      toast(`${aluno?.nome.split(' ')[0] ?? 'Aluno'} reativado.`);
    });
  }

  function handleExport(tipo: 'xlsx' | 'csv') {
    void registrarExportacaoAction(tipo);
  }

  // ── Extrair dados dos modais ──────────────────────────────────────────────
  const novoModalOpen = modal.kind === 'novo';

  const detalheAluno = modal.kind === 'detalhe' ? modal.aluno : null;
  const detalheMode = modal.kind === 'detalhe' ? modal.mode : 'view';
  const detalheAgenda = detalheAluno ? (agendaPorAluno[detalheAluno.id] ?? []) : [];
  const detalhePagamentos = detalheAluno ? (pagamentosPorAluno[detalheAluno.id] ?? []) : [];

  const inativarAluno = modal.kind === 'inativar' ? modal.aluno : null;

  return (
    <>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 24 }}>
        <KpiCard
          label="Total de alunos"
          value={alunos.length}
          icon={<IconUsers />}
          tone="blue"
          onClick={() => setFilter('todos')}
          active={filter === 'todos'}
        />
        <KpiCard
          label="Ativos"
          value={totalAtivos}
          icon={<IconUsers />}
          tone="green"
          onClick={() => setFilter('Ativo')}
          active={filter === 'Ativo'}
        />
        <KpiCard
          label="Atrasados"
          value={totalAtrasados}
          icon={<IconAlert />}
          tone="amber"
          onClick={() => setFilter('Atrasado')}
          active={filter === 'Atrasado'}
        />
        <KpiCard
          label="Inativos"
          value={totalInativos}
          icon={<IconBan />}
          tone="gray"
          onClick={() => setFilter('Inativo')}
          active={filter === 'Inativo'}
        />
        <KpiCard
          label="Risco de inativação"
          value={totalRisco}
          icon={<IconAlert />}
          tone="red"
          onClick={() => setFilter('Risco')}
          active={filter === 'Risco'}
        />
      </div>

      {/* Seção da lista */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 14px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>Lista de alunos</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
              {filtered.length} de {alunos.length} alunos
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <ExportMenu
              data={exportData as Record<string, unknown>[]}
              filename="alunos"
              columns={exportColumns}
              label="Exportar"
              onExport={handleExport}
            />
            {currentUserPerfil !== 'Professor' && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { setServerError(null); dispatch({ type: 'OPEN_NOVO' }); }}
              >
                <IconUserPlus />Novo aluno
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div style={{ padding: '12px 22px', borderBottom: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <FilterChips options={statusOpts} value={filter} onChange={setFilter} counts={statusCounts} />
            <SearchInput value={query} onChange={setQuery} placeholder="Buscar nome, email ou telefone…" width={280} />
          </div>
          {/* Filtro de professor */}
          {professores.length > 0 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 500 }}>Professor:</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {profOpts.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setFilterProf(o.value)}
                    style={{
                      height: 28,
                      padding: '0 10px',
                      borderRadius: 99,
                      fontSize: 12.5,
                      fontWeight: 500,
                      border: '1px solid ' + (filterProf === o.value ? 'var(--blue)' : 'var(--line-2)'),
                      background: filterProf === o.value ? 'var(--blue)' : 'var(--surface)',
                      color: filterProf === o.value ? '#fff' : 'var(--ink-2)',
                      cursor: 'pointer',
                      transition: 'all .1s',
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabela */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Aluno', 'Status', 'Professores', 'Plano', 'Mensalidade', 'Vencimento', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  style={{ cursor: 'pointer', opacity: a.status === 'Inativo' ? 0.65 : 1, borderBottom: '1px solid var(--line)' }}
                  onClick={() => { setServerError(null); dispatch({ type: 'OPEN_DETALHE', aluno: a }); }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--hover)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <Avatar name={a.nome} size="md" />
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{a.nome}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.email ?? a.telefone}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <StatusBadge status={a.status} />
                      {isRisco(a) && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--red-text)' }}>Risco</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 200 }}>
                      {a.professores_nomes.length > 0
                        ? a.professores_nomes.map((n, i) => (
                          <span key={i} style={{ padding: '2px 8px', borderRadius: 99, background: 'var(--hover)', color: 'var(--ink-2)', fontSize: 12, fontWeight: 500 }}>
                            {n}
                          </span>
                        ))
                        : <span style={{ fontSize: 13, color: 'var(--muted)' }}>—</span>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 13 }}>
                    {a.plano ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--ink-2)', fontSize: 13.5, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtMoeda(a.valor_mensalidade)}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 13 }}>
                    {a.dia_vencimento != null ? `Dia ${a.dia_vencimento}` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted-2)', width: 40 }}>
                    <IconChevR />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <Empty
              icon={<IconSearch />}
              title="Nenhum aluno encontrado"
              description="Ajuste os filtros ou o termo de busca."
            />
          )}
        </div>
      </div>

      {/* Modais */}
      <NovoAlunoModal
        key={novoModalOpen ? 'novo-open' : 'novo-closed'}
        open={novoModalOpen}
        professores={professores}
        onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
        onSave={handleCriarAluno}
        isPending={isPending}
        serverError={novoModalOpen ? serverError : null}
      />

      <AlunoDetailModal
        key={detalheAluno?.id ?? 'none'}
        aluno={detalheAluno}
        mode={detalheMode}
        professores={professores}
        perfilAtual={currentUserPerfil}
        agenda={detalheAgenda}
        pagamentos={detalhePagamentos}
        onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
        onEditMode={() => dispatch({ type: 'DETALHE_EDIT_MODE' })}
        onViewMode={() => dispatch({ type: 'DETALHE_VIEW_MODE' })}
        onSaveEdit={handleEditarAluno}
        onInativar={(a) => { setServerError(null); dispatch({ type: 'OPEN_INATIVAR', aluno: a }); }}
        onReativar={handleReativarAluno}
        isPending={isPending}
        serverError={modal.kind === 'detalhe' ? serverError : null}
      />

      <InativarAlunoModal
        key={inativarAluno?.id ?? 'none-inativar'}
        aluno={inativarAluno}
        onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
        onSave={handleInativarAluno}
        isPending={isPending}
        serverError={modal.kind === 'inativar' ? serverError : null}
      />
    </>
  );
}
