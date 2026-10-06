'use client';

import { useReducer, useTransition, useState, useCallback } from 'react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  criarAulaAction,
  reagendarAulaAction,
  cancelarAulaAction,
} from '@/app/(app)/agenda/actions';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes de calendário
// ─────────────────────────────────────────────────────────────────────────────

const H_START = 7;
const H_END = 22;
const ROW_H = 46; // px por hora

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAYS_FULL = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
];
const MESES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// ─────────────────────────────────────────────────────────────────────────────
// Tipos exportados
// ─────────────────────────────────────────────────────────────────────────────

export interface EventoRow {
  id: string;
  student_id: string;
  teacher_id: string;
  start_at: string; // ISO
  duracao_min: number;
  observacoes: string | null;
  status: string;
  aluno_nome: string;
  aluno_status: string;
  professor_nome: string | null;
}

export interface AlunoOpcao {
  id: string;
  nome: string;
  status: string;
  valor_mensalidade: number | null;
}

export interface ProfessorOpcao {
  id: string;
  nome: string;
}

interface AgendaClientProps {
  eventos: EventoRow[];
  alunos: AlunoOpcao[];
  professores: ProfessorOpcao[];
  currentUserPerfil: string;
  currentTeacherId: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de data
// ─────────────────────────────────────────────────────────────────────────────

function isoDateStr(d: Date): string {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function hhmm(d: Date): string {
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

// ─────────────────────────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────────────────────────

type View = 'dia' | 'semana' | 'mes';

type ModalState =
  | { kind: 'none' }
  | { kind: 'aula'; evento: EventoRow | null; slot: Date | null };

interface State {
  view: View;
  periodoBase: string; // ISO date string do dia de referência do período visível
  eventos: EventoRow[];
  modal: ModalState;
  profFilter: string;
}

type Action =
  | { type: 'SET_VIEW'; view: View }
  | { type: 'SHIFT_PERIOD'; dir: 1 | -1 }
  | { type: 'GO_TODAY' }
  | { type: 'GO_DAY'; date: string }
  | { type: 'SET_PROF_FILTER'; value: string }
  | { type: 'OPEN_SLOT'; slot: Date }
  | { type: 'OPEN_EVENTO'; evento: EventoRow }
  | { type: 'CLOSE_MODAL' }
  | { type: 'ADD_EVENTO'; evento: EventoRow }
  | { type: 'UPDATE_EVENTO'; evento: EventoRow }
  | { type: 'CANCEL_EVENTO'; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, view: action.view };
    case 'SHIFT_PERIOD': {
      const base = new Date(state.periodoBase);
      let next: Date;
      if (state.view === 'dia') next = addDays(base, action.dir);
      else if (state.view === 'semana') next = addDays(base, action.dir * 7);
      else next = new Date(base.getFullYear(), base.getMonth() + action.dir, 1);
      return { ...state, periodoBase: isoDateStr(next) };
    }
    case 'GO_TODAY':
      return { ...state, periodoBase: isoDateStr(new Date()) };
    case 'GO_DAY':
      return { ...state, periodoBase: action.date, view: 'dia' };
    case 'SET_PROF_FILTER':
      return { ...state, profFilter: action.value };
    case 'OPEN_SLOT':
      return { ...state, modal: { kind: 'aula', evento: null, slot: action.slot } };
    case 'OPEN_EVENTO':
      return { ...state, modal: { kind: 'aula', evento: action.evento, slot: null } };
    case 'CLOSE_MODAL':
      return { ...state, modal: { kind: 'none' } };
    case 'ADD_EVENTO':
      return {
        ...state,
        eventos: [...state.eventos, action.evento],
        modal: { kind: 'none' },
      };
    case 'UPDATE_EVENTO':
      return {
        ...state,
        eventos: state.eventos.map((e) =>
          e.id === action.evento.id ? action.evento : e
        ),
        modal: { kind: 'none' },
      };
    case 'CANCEL_EVENTO':
      return {
        ...state,
        eventos: state.eventos.map((e) =>
          e.id === action.id ? { ...e, status: 'Cancelada' } : e
        ),
        modal: { kind: 'none' },
      };
    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout de eventos sobrepostos numa coluna de dia
// ─────────────────────────────────────────────────────────────────────────────

interface EventoComLayout extends EventoRow {
  _col: number;
  _cols: number;
}

function layoutDay(events: EventoRow[]): EventoComLayout[] {
  const sorted = [...events].sort((a, b) => {
    const diff = new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
    return diff !== 0 ? diff : b.duracao_min - a.duracao_min;
  });

  const out: EventoComLayout[] = [];
  let cluster: EventoComLayout[] = [];
  let clusterEnd = 0;

  function flush() {
    const colEnds: number[] = [];
    cluster.forEach((ev) => {
      const evStart = new Date(ev.start_at).getTime();
      let placed = false;
      for (let c = 0; c < colEnds.length; c++) {
        if (colEnds[c] <= evStart) {
          ev._col = c;
          colEnds[c] = evStart + ev.duracao_min * 60000;
          placed = true;
          break;
        }
      }
      if (!placed) {
        ev._col = colEnds.length;
        colEnds.push(evStart + ev.duracao_min * 60000);
      }
    });
    cluster.forEach((ev) => {
      ev._cols = colEnds.length;
      out.push(ev);
    });
    cluster = [];
  }

  sorted.forEach((ev) => {
    const s = new Date(ev.start_at).getTime();
    const e = s + ev.duracao_min * 60000;
    const withLayout: EventoComLayout = { ...ev, _col: 0, _cols: 1 };
    if (cluster.length > 0 && s >= clusterEnd) flush();
    cluster.push(withLayout);
    clusterEnd = Math.max(clusterEnd, e);
  });
  if (cluster.length > 0) flush();

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cores por status de aula
// ─────────────────────────────────────────────────────────────────────────────

function statusColors(status: string): { bg: string; accent: string } {
  if (status === 'Cancelada') {
    return { bg: 'var(--hover)', accent: 'var(--line-2)' };
  }
  if (status === 'Realizada') {
    return { bg: 'var(--green-bg)', accent: 'var(--green-text)' };
  }
  return { bg: 'var(--blue-50)', accent: 'var(--blue)' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Ícones inline
// ─────────────────────────────────────────────────────────────────────────────

const IconChevLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IconChevRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IconPlus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconRepeat = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

const IconBan = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);

const IconCalendar = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconAlertTriangle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// EventBlock (grade Dia/Semana)
// ─────────────────────────────────────────────────────────────────────────────

interface EventBlockProps {
  ev: EventoComLayout;
  onClick: (ev: EventoRow) => void;
}

function EventBlock({ ev, onClick }: EventBlockProps) {
  const start = new Date(ev.start_at);
  const top = (start.getHours() - H_START + start.getMinutes() / 60) * ROW_H;
  const height = Math.max((ev.duracao_min / 60) * ROW_H - 3, 22);
  const cancelled = ev.status === 'Cancelada';
  const { bg, accent } = statusColors(ev.status);
  const w = 100 / (ev._cols || 1);

  return (
    <button
      onClick={() => onClick(ev)}
      title={ev.aluno_nome}
      style={{
        position: 'absolute',
        top: top + 1,
        height,
        left: `calc(${ev._col * w}% + 2px)`,
        width: `calc(${w}% - 4px)`,
        background: bg,
        borderLeft: `3px solid ${accent}`,
        border: `1px solid ${cancelled ? 'var(--line-2)' : accent + '55'}`,
        borderLeftWidth: 3,
        borderRadius: 7,
        padding: '4px 7px',
        textAlign: 'left',
        overflow: 'hidden',
        cursor: 'pointer',
        opacity: cancelled ? 0.55 : 1,
        textDecoration: cancelled ? 'line-through' : 'none',
      }}
    >
      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {ev.aluno_nome}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {hhmm(start)} · {ev.duracao_min}min
        {ev.professor_nome ? ` · ${ev.professor_nome.split(' ')[0]}` : ''}
      </div>
      {height > 52 && ev.observacoes && (
        <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ev.observacoes}
        </div>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TimeGrid (Dia / Semana)
// ─────────────────────────────────────────────────────────────────────────────

interface TimeGridProps {
  days: Date[];
  eventos: EventoRow[];
  canEdit: boolean;
  onEventClick: (ev: EventoRow) => void;
  onSlotClick: (slot: Date) => void;
}

function TimeGrid({ days, eventos, canEdit, onEventClick, onSlotClick }: TimeGridProps) {
  const hours: number[] = [];
  for (let h = H_START; h < H_END; h++) hours.push(h);
  const today = new Date();

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', overflow: 'hidden', boxShadow: 'var(--sh-sm)' }}>
      {/* Header dias */}
      <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(${days.length}, 1fr)`, borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
        <div />
        {days.map((d, i) => {
          const isToday = sameDay(d, today);
          return (
            <div key={i} style={{ padding: '10px 8px', textAlign: 'center', borderLeft: '1px solid var(--line)' }}>
              <div style={{ fontSize: 11.5, color: isToday ? 'var(--blue)' : 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.03em' }}>
                {WEEKDAYS_SHORT[d.getDay()]}
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2, color: isToday ? '#fff' : 'var(--ink)', width: 30, height: 30, borderRadius: 99, display: 'grid', placeItems: 'center', margin: '2px auto 0', background: isToday ? 'var(--blue)' : 'transparent' }}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Corpo rolável */}
      <div style={{ maxHeight: 560, overflowY: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `56px repeat(${days.length}, 1fr)`, position: 'relative' }}>
          {/* Labels de hora */}
          <div>
            {hours.map((h) => (
              <div key={h} style={{ height: ROW_H, fontSize: 11, color: 'var(--muted-2)', textAlign: 'right', paddingRight: 8, display: 'flex', alignItems: 'flex-start', paddingTop: 2 }}>
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Colunas de dias */}
          {days.map((d, di) => {
            const dayEvts = layoutDay(eventos.filter((ev) => sameDay(new Date(ev.start_at), d)));
            return (
              <div key={di} style={{ position: 'relative', borderLeft: '1px solid var(--line)' }}>
                {hours.map((h) => (
                  <div
                    key={h}
                    onClick={() => {
                      if (canEdit) {
                        const slot = new Date(d);
                        slot.setHours(h, 0, 0, 0);
                        onSlotClick(slot);
                      }
                    }}
                    style={{ height: ROW_H, borderBottom: '1px solid var(--line)', cursor: canEdit ? 'pointer' : 'default' }}
                  />
                ))}
                {dayEvts.map((ev) => (
                  <EventBlock key={ev.id} ev={ev} onClick={onEventClick} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MonthGrid
// ─────────────────────────────────────────────────────────────────────────────

interface MonthGridProps {
  refDate: Date;
  eventos: EventoRow[];
  onEventClick: (ev: EventoRow) => void;
  onDayClick: (d: Date) => void;
}

function MonthGrid({ refDate, eventos, onEventClick, onDayClick }: MonthGridProps) {
  const today = new Date();
  const first = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) cells.push(addDays(gridStart, i));

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', overflow: 'hidden', boxShadow: 'var(--sh-sm)' }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
        {WEEKDAYS_SHORT.map((w) => (
          <div key={w} style={{ padding: '9px 10px', fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.03em', textAlign: 'center' }}>
            {w}
          </div>
        ))}
      </div>

      {/* Células */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gridAutoRows: 'minmax(100px, 1fr)' }}>
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === refDate.getMonth();
          const isToday = sameDay(d, today);
          const dayEvts = eventos
            .filter((ev) => sameDay(new Date(ev.start_at), d) && ev.status !== 'Cancelada')
            .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

          return (
            <div
              key={i}
              onClick={() => onDayClick(d)}
              style={{ borderLeft: i % 7 ? '1px solid var(--line)' : 'none', borderTop: i >= 7 ? '1px solid var(--line)' : 'none', padding: 6, background: inMonth ? 'var(--surface)' : 'var(--surface-2)', minHeight: 100, cursor: 'pointer' }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 600, color: isToday ? '#fff' : inMonth ? 'var(--ink-2)' : 'var(--muted-2)', width: 22, height: 22, borderRadius: 99, display: 'grid', placeItems: 'center', background: isToday ? 'var(--blue)' : 'transparent', marginBottom: 3 }}>
                {d.getDate()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dayEvts.slice(0, 3).map((ev) => {
                  const { bg, accent } = statusColors(ev.status);
                  return (
                    <button
                      key={ev.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, background: bg, border: 'none', borderRadius: 5, padding: '2px 5px', textAlign: 'left', cursor: 'pointer', width: '100%' }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: 99, background: accent, flexShrink: 0 }} />
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {hhmm(new Date(ev.start_at))} {ev.aluno_nome.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
                {dayEvts.length > 3 && (
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600, paddingLeft: 5 }}>
                    +{dayEvts.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AulaModal
// ─────────────────────────────────────────────────────────────────────────────

interface AulaModalProps {
  open: boolean;
  evento: EventoRow | null;
  slot: Date | null;
  canEdit: boolean;
  alunos: AlunoOpcao[];
  professores: ProfessorOpcao[];
  currentTeacherId: string | null;
  currentUserPerfil: string;
  onClose: () => void;
  onAdded: (ev: EventoRow) => void;
  onUpdated: (ev: EventoRow) => void;
  onCancelled: (id: string) => void;
}

function AulaModal({
  open,
  evento,
  slot,
  canEdit,
  alunos,
  professores,
  currentTeacherId,
  currentUserPerfil,
  onClose,
  onAdded,
  onUpdated,
  onCancelled,
}: AulaModalProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const isNew = evento === null;

  // Lazy initializers — evita useEffect → setState (ESLint rule)
  const [editMode, setEditMode] = useState<boolean>(() => isNew);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [formError, setFormError] = useState('');
  const [alunoQuery, setAlunoQuery] = useState('');

  // Campos do formulário — lazy initializer
  const [alunoId, setAlunoId] = useState<string>(() => {
    if (!isNew && evento) return evento.student_id;
    return alunos.find((a) => a.status !== 'Inativo')?.id ?? '';
  });
  const [teacherId, setTeacherId] = useState<string>(() => {
    if (!isNew && evento) return evento.teacher_id;
    if (currentTeacherId) return currentTeacherId;
    return professores[0]?.id ?? '';
  });
  const [dataStr, setDataStr] = useState<string>(() => {
    if (slot) return isoDateStr(slot);
    if (!isNew && evento) return isoDateStr(new Date(evento.start_at));
    return isoDateStr(new Date());
  });
  const [horaStr, setHoraStr] = useState<string>(() => {
    if (slot) return hhmm(slot);
    if (!isNew && evento) return hhmm(new Date(evento.start_at));
    return '08:00';
  });
  const [duracao, setDuracao] = useState<number>(() => {
    if (!isNew && evento) return evento.duracao_min;
    return 60;
  });
  const [obs, setObs] = useState<string>(() => {
    if (!isNew && evento) return evento.observacoes ?? '';
    return '';
  });

  const selectedAluno = alunos.find((a) => a.id === alunoId);
  const isAlunoAtrasado = selectedAluno?.status === 'Atrasado';
  const isAlunoInativo = selectedAluno?.status === 'Inativo';
  const cancelled = evento?.status === 'Cancelada';

  const filteredAlunos = alunos.filter((a) => {
    if (a.status === 'Inativo') return false;
    if (!alunoQuery) return true;
    return a.nome.toLowerCase().includes(alunoQuery.toLowerCase());
  });

  function buildStartAt(): string {
    const [hh, mm] = horaStr.split(':').map(Number);
    const [y, mo, dd] = dataStr.split('-').map(Number);
    return new Date(y, mo - 1, dd, hh, mm, 0, 0).toISOString();
  }

  const handleClose = useCallback(() => {
    setConfirmCancel(false);
    setFormError('');
    onClose();
  }, [onClose]);

  function handleSave() {
    setFormError('');
    if (!alunoId) { setFormError('Selecione um aluno.'); return; }
    if (!teacherId) { setFormError('Selecione um professor.'); return; }
    if (!dataStr || !horaStr) { setFormError('Data e horário são obrigatórios.'); return; }
    if (isAlunoInativo) { setFormError('Aluno inativo não pode ser agendado.'); return; }

    const start_at = buildStartAt();

    startTransition(async () => {
      if (isNew) {
        const result = await criarAulaAction({ student_id: alunoId, teacher_id: teacherId, start_at, duracao_min: duracao, observacoes: obs.trim() || undefined });
        if (!result.ok) { setFormError(result.error ?? 'Erro ao agendar aula.'); return; }

        const novoEvento: EventoRow = {
          id: result.id!,
          student_id: alunoId,
          teacher_id: teacherId,
          start_at,
          duracao_min: duracao,
          observacoes: obs.trim() || null,
          status: 'Agendada',
          aluno_nome: selectedAluno?.nome ?? '',
          aluno_status: selectedAluno?.status ?? 'Ativo',
          professor_nome: professores.find((p) => p.id === teacherId)?.nome ?? null,
        };
        onAdded(novoEvento);
        toast('Aula agendada.', 'ok');
      } else if (evento) {
        const result = await reagendarAulaAction({ id: evento.id, start_at, duracao_min: duracao, observacoes: obs.trim() || undefined });
        if (!result.ok) { setFormError(result.error ?? 'Erro ao reagendar aula.'); return; }

        onUpdated({ ...evento, start_at, duracao_min: duracao, observacoes: obs.trim() || null });
        toast('Aula reagendada.', 'ok');
      }
    });
  }

  function handleCancelAula() {
    if (!evento) return;
    startTransition(async () => {
      const result = await cancelarAulaAction(evento.id);
      if (!result.ok) {
        setFormError(result.error ?? 'Erro ao cancelar aula.');
        setConfirmCancel(false);
        return;
      }
      onCancelled(evento.id);
      toast('Aula cancelada.', 'warn');
    });
  }

  function handleEnterEditMode() {
    setEditMode(true);
    setFormError('');
  }

  const modalTitle = isNew ? 'Nova aula' : (evento?.aluno_nome ?? 'Aula');
  const modalSub = isNew
    ? 'Agende uma nova aula'
    : evento
    ? `${WEEKDAYS_FULL[new Date(evento.start_at).getDay()]} · ${new Date(evento.start_at).toLocaleDateString('pt-BR')}`
    : '';

  if (!open) return null;

  return (
    <Modal open={open} onClose={handleClose} title={modalTitle} sub={modalSub} icon={<IconCalendar />} size="md">
      <div style={{ padding: 22 }}>

        {/* ── Modo visualização ─────────────────────────────────────────────── */}
        {!editMode && evento ? (
          <>
            {/* Badge de status */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 99, fontSize: 12.5, fontWeight: 600, background: statusColors(evento.status).bg, color: statusColors(evento.status).accent }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: statusColors(evento.status).accent }} />
                {evento.status}
              </span>
            </div>

            {/* Detalhes */}
            <div style={{ display: 'grid', gap: 13 }}>
              {[
                ['Aluno', evento.aluno_nome],
                ...(evento.professor_nome ? [['Professor', evento.professor_nome]] : []),
                ['Horário', `${hhmm(new Date(evento.start_at))} – ${hhmm(new Date(new Date(evento.start_at).getTime() + evento.duracao_min * 60000))}`],
                ['Duração', `${evento.duracao_min} minutos`],
                ['Observações', evento.observacoes || '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, paddingBottom: 11, borderBottom: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{k}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Ações — somente Admin/Secretário */}
            {canEdit && !cancelled && (
              <div style={{ marginTop: 20 }}>
                {!confirmCancel ? (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={handleEnterEditMode}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 38, border: '1px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--surface)', color: 'var(--ink)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}
                    >
                      <IconRepeat />Reagendar
                    </button>
                    <button
                      onClick={() => setConfirmCancel(true)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, height: 38, border: '1px solid var(--red-border)', borderRadius: 'var(--r)', background: 'var(--red-bg)', color: 'var(--red-text)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}
                    >
                      <IconBan />Cancelar aula
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '14px 16px', borderRadius: 'var(--r-lg)', background: 'var(--red-bg)', border: '1px solid var(--red-border)' }}>
                    <p style={{ margin: '0 0 12px', fontSize: 13.5, color: 'var(--red-text)', fontWeight: 600 }}>
                      Confirmar cancelamento desta aula?
                    </p>
                    {formError && (
                      <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--red-text)' }}>{formError}</p>
                    )}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => setConfirmCancel(false)}
                        disabled={isPending}
                        style={{ flex: 1, height: 36, border: '1px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                      >
                        Voltar
                      </button>
                      <button
                        onClick={handleCancelAula}
                        disabled={isPending}
                        style={{ flex: 1, height: 36, border: 'none', borderRadius: 'var(--r)', background: 'var(--red-text)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: isPending ? 'wait' : 'pointer', opacity: isPending ? 0.7 : 1 }}
                      >
                        {isPending ? 'Cancelando…' : 'Sim, cancelar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* ── Modo criação / reagendamento ────────────────────────────────── */
          <div style={{ display: 'grid', gap: 14 }}>

            {/* Aluno — somente ao criar */}
            {isNew && (
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 5 }}>Aluno</label>
                <input
                  type="text"
                  placeholder="Filtrar aluno…"
                  value={alunoQuery}
                  onChange={(e) => setAlunoQuery(e.target.value)}
                  autoComplete="off"
                  style={{ width: '100%', height: 36, padding: '0 12px', border: '1px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13.5, outline: 'none', marginBottom: 5 }}
                />
                <select
                  value={alunoId}
                  onChange={(e) => { setAlunoId(e.target.value); setAlunoQuery(''); }}
                  style={{ width: '100%', height: 38, padding: '0 12px', border: '1px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13.5, cursor: 'pointer' }}
                >
                  {filteredAlunos.length === 0 && <option value="" disabled>Nenhum aluno ativo encontrado</option>}
                  {filteredAlunos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}{a.status === 'Atrasado' ? ' (em atraso)' : ''}
                    </option>
                  ))}
                </select>

                {/* Aviso Atrasado — §0.2: amber, mas permite agendar */}
                {isAlunoAtrasado && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 8, background: 'var(--amber-bg)', border: '1px solid var(--amber)', borderRadius: 9, padding: '9px 12px', fontSize: 12.5, color: 'var(--amber-text)' }}>
                    <IconAlertTriangle />
                    <span>{selectedAluno?.nome} está com pagamentos em atraso. O agendamento ainda é permitido.</span>
                  </div>
                )}
              </div>
            )}

            {/* Professor — Admin/Secretário escolhem qualquer um */}
            {currentUserPerfil !== 'Professor' && (
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 5 }}>Professor</label>
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  style={{ width: '100%', height: 38, padding: '0 12px', border: '1px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13.5, cursor: 'pointer' }}
                >
                  {professores.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Data e Hora */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 5 }}>Data</label>
                <input
                  type="date"
                  value={dataStr}
                  onChange={(e) => setDataStr(e.target.value)}
                  style={{ width: '100%', height: 38, padding: '0 12px', border: '1px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13.5 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 5 }}>Horário</label>
                <input
                  type="time"
                  value={horaStr}
                  step={900}
                  onChange={(e) => setHoraStr(e.target.value)}
                  style={{ width: '100%', height: 38, padding: '0 12px', border: '1px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13.5 }}
                />
              </div>
            </div>

            {/* Duração */}
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 5 }}>Duração</label>
              <select
                value={duracao}
                onChange={(e) => setDuracao(Number(e.target.value))}
                style={{ width: '100%', height: 38, padding: '0 12px', border: '1px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13.5, cursor: 'pointer' }}
              >
                {[30, 45, 60, 90, 120].map((d) => (
                  <option key={d} value={d}>{d} minutos</option>
                ))}
              </select>
            </div>

            {/* Observações */}
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 5 }}>Observações</label>
              <textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Conteúdo da aula, foco, material…"
                style={{ width: '100%', minHeight: 72, padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13.5, resize: 'vertical', fontFamily: 'inherit', outline: 'none' }}
              />
            </div>

            {/* Erro inline */}
            {formError && (
              <div style={{ padding: '10px 14px', borderRadius: 'var(--r)', fontSize: 13, background: 'var(--red-bg)', color: 'var(--red-text)', fontWeight: 500 }}>
                {formError}
              </div>
            )}

            {/* Botões */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button
                onClick={() => {
                  if (isNew) { handleClose(); }
                  else { setEditMode(false); setFormError(''); }
                }}
                disabled={isPending}
                style={{ height: 38, padding: '0 18px', border: '1px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--surface)', color: 'var(--ink)', fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isPending || isAlunoInativo}
                style={{ height: 38, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 7, border: 'none', borderRadius: 'var(--r)', background: isAlunoInativo ? 'var(--muted-2)' : 'var(--blue)', color: '#fff', fontWeight: 600, fontSize: 13.5, cursor: (isPending || isAlunoInativo) ? 'not-allowed' : 'pointer', opacity: (isPending || isAlunoInativo) ? 0.65 : 1 }}
              >
                {isPending ? '…' : isNew ? (
                  <><IconPlus />&nbsp;Agendar aula</>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AgendaClient — componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function AgendaClient({
  eventos: initialEventos,
  alunos,
  professores,
  currentUserPerfil,
  currentTeacherId,
}: AgendaClientProps) {
  const today = new Date();

  const [state, dispatch] = useReducer(reducer, {
    view: 'semana' as View,
    periodoBase: isoDateStr(startOfWeek(today)),
    eventos: initialEventos,
    modal: { kind: 'none' } as ModalState,
    profFilter: 'todos',
  });

  const canEdit = currentUserPerfil !== 'Professor';
  const isProf = currentUserPerfil === 'Professor';

  // Filtro de eventos por professor (apenas Admin/Secretário)
  const shownEventos = state.eventos.filter((ev) => {
    if (isProf) return true; // Professor já recebe apenas seus eventos do servidor
    if (state.profFilter !== 'todos') return ev.teacher_id === state.profFilter;
    return true;
  });

  // Label do período visível
  const refDate = new Date(state.periodoBase);
  const weekDays: Date[] = [];
  {
    const s = startOfWeek(refDate);
    for (let i = 0; i < 7; i++) weekDays.push(addDays(s, i));
  }

  let rangeLabel: string;
  if (state.view === 'dia') {
    rangeLabel = `${WEEKDAYS_FULL[refDate.getDay()]}, ${refDate.getDate()} de ${MESES_FULL[refDate.getMonth()]}`;
  } else if (state.view === 'semana') {
    rangeLabel = `${weekDays[0].getDate()} – ${weekDays[6].getDate()} de ${MESES_FULL[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`;
  } else {
    rangeLabel = `${MESES_FULL[refDate.getMonth()]} ${refDate.getFullYear()}`;
  }

  function handleSlotClick(slot: Date) {
    if (canEdit) dispatch({ type: 'OPEN_SLOT', slot });
  }

  function handleEventClick(ev: EventoRow) {
    dispatch({ type: 'OPEN_EVENTO', evento: ev });
  }

  function handleMonthDayClick(d: Date) {
    dispatch({ type: 'GO_DAY', date: isoDateStr(d) });
  }

  // Modal state
  const modalOpen = state.modal.kind === 'aula';
  const modalEvento = state.modal.kind === 'aula' ? state.modal.evento : null;
  const modalSlot = state.modal.kind === 'aula' ? state.modal.slot : null;

  // Chave do modal para reinicializar estado ao abrir.
  // Usa getTime() do slot quando disponível; usa string ISO como fallback estável
  // (sem Date.now() — impuro durante render).
  const modalKey = modalOpen
    ? modalEvento
      ? `ev-${modalEvento.id}`
      : `slot-${modalSlot ? modalSlot.getTime() : 'new'}`
    : 'closed';

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* ── Cabeçalho ───────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
          {isProf ? 'Minha agenda' : 'Agenda dos professores'}
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '4px 0 0' }}>
          {isProf
            ? 'Visualize suas aulas agendadas'
            : 'Visualize e gerencie a agenda de todos os professores'}
        </p>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        {/* Navegação anterior/próximo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            aria-label="Período anterior"
            onClick={() => dispatch({ type: 'SHIFT_PERIOD', dir: -1 })}
            style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', border: '1px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer' }}
          >
            <IconChevLeft />
          </button>
          <button
            onClick={() => dispatch({ type: 'GO_TODAY' })}
            style={{ height: 34, padding: '0 14px', border: '1px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--surface)', color: 'var(--ink)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Hoje
          </button>
          <button
            aria-label="Próximo período"
            onClick={() => dispatch({ type: 'SHIFT_PERIOD', dir: 1 })}
            style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', border: '1px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--surface)', color: 'var(--ink)', cursor: 'pointer' }}
          >
            <IconChevRight />
          </button>
        </div>

        {/* Label do período */}
        <div style={{ fontSize: 15, fontWeight: 600, minWidth: 200, color: 'var(--ink)', textTransform: 'capitalize' }}>
          {rangeLabel}
        </div>

        <div style={{ flex: 1 }} />

        {/* Botão Nova Aula */}
        {canEdit && (
          <button
            onClick={() => {
              const slot = new Date();
              slot.setHours(8, 0, 0, 0);
              dispatch({ type: 'OPEN_SLOT', slot });
            }}
            style={{ height: 36, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 7, border: 'none', borderRadius: 'var(--r)', background: 'var(--blue)', color: '#fff', fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}
          >
            <IconPlus />Nova aula
          </button>
        )}

        {/* Filtro de professor */}
        {!isProf && (
          <select
            value={state.profFilter}
            onChange={(e) => dispatch({ type: 'SET_PROF_FILTER', value: e.target.value })}
            style={{ height: 36, padding: '0 12px', border: '1px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13.5, cursor: 'pointer', minWidth: 200 }}
          >
            <option value="todos">Todos os professores</option>
            {professores.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        )}

        {/* Toggle de view */}
        <div style={{ display: 'flex', background: 'var(--hover)', borderRadius: 9, padding: 3, gap: 2 }}>
          {(['dia', 'semana', 'mes'] as const).map((v) => (
            <button
              key={v}
              onClick={() => dispatch({ type: 'SET_VIEW', view: v })}
              style={{ height: 30, padding: '0 14px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', background: state.view === v ? 'var(--surface)' : 'transparent', color: state.view === v ? 'var(--ink)' : 'var(--muted)', boxShadow: state.view === v ? 'var(--sh-sm)' : 'none' }}
            >
              {v === 'dia' ? 'Dia' : v === 'semana' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grade de calendário ──────────────────────────────────────────────── */}
      {state.view === 'mes' ? (
        <MonthGrid
          refDate={refDate}
          eventos={shownEventos}
          onEventClick={handleEventClick}
          onDayClick={handleMonthDayClick}
        />
      ) : (
        <TimeGrid
          days={state.view === 'dia' ? [refDate] : weekDays}
          eventos={shownEventos}
          canEdit={canEdit}
          onEventClick={handleEventClick}
          onSlotClick={handleSlotClick}
        />
      )}

      {/* Dica de slot */}
      {canEdit && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconPlus />
          Clique em um horário vazio para agendar uma nova aula.
        </div>
      )}

      {/* ── AulaModal ───────────────────────────────────────────────────────── */}
      <AulaModal
        key={modalKey}
        open={modalOpen}
        evento={modalEvento}
        slot={modalSlot}
        canEdit={canEdit}
        alunos={alunos}
        professores={professores}
        currentTeacherId={currentTeacherId}
        currentUserPerfil={currentUserPerfil}
        onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
        onAdded={(ev) => dispatch({ type: 'ADD_EVENTO', evento: ev })}
        onUpdated={(ev) => dispatch({ type: 'UPDATE_EVENTO', evento: ev })}
        onCancelled={(id) => dispatch({ type: 'CANCEL_EVENTO', id })}
      />
    </div>
  );
}
