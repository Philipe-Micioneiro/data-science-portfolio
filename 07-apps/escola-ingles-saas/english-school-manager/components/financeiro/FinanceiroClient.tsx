'use client';

import {
  useCallback,
  useReducer,
  useState,
  useTransition,
  useRef,
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
import { calcSHA256 } from '@/lib/sha256';
import {
  registrarPagamentoAction,
  registrarExportacaoFinanceiroAction,
  verificarHashAction,
} from '@/app/(app)/financeiro/actions';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface PagamentoRow {
  id: string;
  student_id: string;
  aluno_nome: string;
  competencia: string;
  competencia_date: string;
  valor_previsto: number | null;
  valor_pago: number | null;
  forma_pagamento: string | null;
  vencimento: string | null;
  status: string;
  motivo_rejeicao: string | null;
  aprovado_por: string | null;
  aprovado_em: string | null;
  criado_por: string | null;
  criado_em: string;
  comprovante_url: string | null;
  hash_sha256: string | null;
}

export interface KpisFinanceiro {
  receita_prevista: number;
  receita_recebida: number;
  inadimplencia: number;
}

export interface AlunoOpcao {
  id: string;
  nome: string;
  plano: string | null;
  valor_mensalidade: number | null;
  dia_vencimento: number | null;
}

interface FinanceiroClientProps {
  pagamentos: PagamentoRow[];
  kpis: KpisFinanceiro | null;
  alunosOpcoes: AlunoOpcao[];
  currentUserPerfil: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ícones inline
// ─────────────────────────────────────────────────────────────────────────────

const IconWallet = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
  </svg>
);

const IconTrendUp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
  </svg>
);

const IconAlert = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconFile = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
  </svg>
);

const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconRepeat = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

const IconCheck = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconSearch = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconUpload = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconClock = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Utilitários
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''));
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtMoeda(v: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────────────────────────

type ModalState = { kind: 'none' } | { kind: 'registrar' };

interface State {
  pagamentos: PagamentoRow[];
  filterStatus: string;
  filterForma: string;
  query: string;
  modal: ModalState;
}

type Action =
  | { type: 'SET_FILTER_STATUS'; value: string }
  | { type: 'SET_FILTER_FORMA'; value: string }
  | { type: 'SET_QUERY'; value: string }
  | { type: 'OPEN_REGISTRAR' }
  | { type: 'CLOSE_MODAL' }
  | { type: 'PAGAMENTO_ADICIONADO'; pag: PagamentoRow };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_FILTER_STATUS': return { ...state, filterStatus: action.value };
    case 'SET_FILTER_FORMA': return { ...state, filterForma: action.value };
    case 'SET_QUERY': return { ...state, query: action.value };
    case 'OPEN_REGISTRAR': return { ...state, modal: { kind: 'registrar' } };
    case 'CLOSE_MODAL': return { ...state, modal: { kind: 'none' } };
    case 'PAGAMENTO_ADICIONADO':
      return {
        ...state,
        pagamentos: [action.pag, ...state.pagamentos],
        modal: { kind: 'none' },
      };
    default: return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ComprovanteUploader — 4 estados
// ─────────────────────────────────────────────────────────────────────────────

type UploaderState =
  | { kind: 'idle' }
  | { kind: 'verificando' }
  | { kind: 'aprovado'; file: File; hash: string; mime: string; nome: string }
  | { kind: 'duplicata'; alunoNome: string; competencia: string };

interface ComprovanteUploaderProps {
  forma: string;
  onChange: (state: UploaderState) => void;
}

function ComprovanteUploader({ forma, onChange }: ComprovanteUploaderProps) {
  const [uploaderState, setUploaderState] = useState<UploaderState>({ kind: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar estado para o pai sem setState-in-effect
  const setState = useCallback((s: UploaderState) => {
    setUploaderState(s);
    onChange(s);
  }, [onChange]);

  async function handleFile(file: File) {
    setState({ kind: 'verificando' });

    try {
      const hash = await calcSHA256(file);
      const result = await verificarHashAction(hash, file.type);

      if (!result.ok) {
        if (result.error === 'DUPLICATE_HASH' && result.context) {
          setState({
            kind: 'duplicata',
            alunoNome: result.context.alunoNome,
            competencia: result.context.competencia,
          });
        } else if (result.error === 'INVALID_MIME') {
          setState({ kind: 'idle' });
          alert('Tipo de arquivo não permitido. Use PNG, JPG ou PDF.');
        } else {
          setState({ kind: 'idle' });
        }
        return;
      }

      setState({
        kind: 'aprovado',
        file,
        hash,
        mime: file.type,
        nome: file.name,
      });
    } catch {
      setState({ kind: 'idle' });
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  if (forma === 'Cartão') {
    return (
      <div style={{
        fontSize: 13,
        color: 'var(--muted)',
        background: 'var(--surface-2)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        padding: '12px 14px',
      }}>
        Pagamentos por cartão são confirmados automaticamente — não exigem comprovante.
      </div>
    );
  }

  if (uploaderState.kind === 'idle') {
    return (
      <>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          style={{
            width: '100%',
            border: '1.5px dashed var(--line-2)',
            borderRadius: 10,
            background: 'var(--surface-2)',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            color: 'var(--muted)',
            cursor: 'pointer',
          }}
        >
          <IconUpload />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>
            Clique para anexar o comprovante
          </span>
          <span style={{ fontSize: 12 }}>PNG, JPG ou PDF · até 5 MB</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,application/pdf"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />
      </>
    );
  }

  if (uploaderState.kind === 'verificando') {
    return (
      <div style={{
        border: '1px solid var(--blue-100)',
        background: 'var(--blue-50)',
        borderRadius: 10,
        padding: '16px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <span style={{ color: 'var(--blue)', flexShrink: 0, display: 'flex' }}>
          <IconClock />
        </span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)' }}>
            Verificando autenticidade do arquivo…
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            Calculando hash SHA-256 e verificando duplicatas
          </div>
        </div>
      </div>
    );
  }

  if (uploaderState.kind === 'aprovado') {
    const shortHash = uploaderState.hash.slice(0, 8) + '…';
    return (
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '11px 14px',
      }}>
        <span style={{
          width: 34, height: 34, borderRadius: 8,
          background: 'var(--green-bg)', color: 'var(--green-text)',
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          <IconFile />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {uploaderState.nome}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'monospace' }}>
            SHA256: {shortHash}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setState({ kind: 'idle' })}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', display: 'flex', alignItems: 'center',
            padding: 4, borderRadius: 6,
          }}
        >
          <IconX />
        </button>
      </div>
    );
  }

  if (uploaderState.kind === 'duplicata') {
    return (
      <div style={{
        background: 'var(--red-bg)',
        border: '1px solid var(--red-border)',
        borderRadius: 10,
        padding: '14px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
          <span style={{ color: 'var(--red-text)', flexShrink: 0 }}><IconAlert /></span>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--red-text)' }}>
            Comprovante já utilizado
          </span>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--red-text)', lineHeight: 1.5 }}>
          Este comprovante já foi utilizado para{' '}
          <strong>{uploaderState.alunoNome}</strong> na competência{' '}
          <strong>{uploaderState.competencia}</strong>.
        </p>
        <button
          type="button"
          onClick={() => setState({ kind: 'idle' })}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 8, fontSize: 13,
            fontWeight: 600, background: 'var(--red-text)', color: '#fff',
            border: 'none', cursor: 'pointer',
          }}
        >
          <IconRepeat />Enviar outro comprovante
        </button>
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// RegistrarPagamentoModal — 3 etapas
// ─────────────────────────────────────────────────────────────────────────────

interface RegistrarPagamentoModalProps {
  open: boolean;
  alunosOpcoes: AlunoOpcao[];
  onClose: () => void;
  onSaved: (pag: PagamentoRow) => void;
}

const FORMAS = ['PIX', 'Boleto', 'Cartão'] as const;
type Forma = (typeof FORMAS)[number];

function RegistrarPagamentoModal({
  open,
  alunosOpcoes,
  onClose,
  onSaved,
}: RegistrarPagamentoModalProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  // Etapa 1 — busca de aluno
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoOpcao | null>(null);
  const [q, setQ] = useState('');

  // Etapa 2 — forma de pagamento
  const [forma, setForma] = useState<Forma>('PIX');

  // Etapa 3 — comprovante
  const [uploaderState, setUploaderState] = useState<UploaderState>({ kind: 'idle' });

  // Reset ao abrir/fechar — usando key no Modal evita setState-in-effect
  // Este componente usa key={open} no pai para forçar remontagem

  const matches = q.length >= 2
    ? alunosOpcoes
        .filter((a) => a.nome.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 6)
    : [];

  const precisaComprovante = forma !== 'Cartão';
  const canSave = !!alunoSelecionado && (!precisaComprovante || uploaderState.kind === 'aprovado') && !isPending;

  function handleSave() {
    if (!canSave || !alunoSelecionado) return;
    setServerError(null);

    startTransition(async () => {
      const fd = new FormData();
      fd.append('student_id', alunoSelecionado.id);
      fd.append('forma_pagamento', forma);

      if (uploaderState.kind === 'aprovado') {
        fd.append('arquivo', uploaderState.file);
        fd.append('hash_sha256', uploaderState.hash);
        fd.append('arquivo_mime', uploaderState.mime);
        fd.append('arquivo_nome', uploaderState.nome);
      }

      const result = await registrarPagamentoAction(fd);

      if (!result.ok) {
        setServerError(result.error ?? 'Erro desconhecido.');
        return;
      }

      const agora = new Date();
      const mes = String(agora.getMonth() + 1).padStart(2, '0');
      const ano = agora.getFullYear();
      const competencia = `${mes}/${ano}`;
      const status = forma === 'Cartão' ? 'Pago' : 'Pendente de Validação';

      const novoPag: PagamentoRow = {
        id: result.id ?? crypto.randomUUID(),
        student_id: alunoSelecionado.id,
        aluno_nome: alunoSelecionado.nome,
        competencia,
        competencia_date: `${ano}-${mes}-01`,
        valor_previsto: alunoSelecionado.valor_mensalidade,
        valor_pago: forma === 'Cartão' ? alunoSelecionado.valor_mensalidade : null,
        forma_pagamento: forma,
        vencimento: null,
        status,
        motivo_rejeicao: null,
        aprovado_por: null,
        aprovado_em: null,
        criado_por: null,
        criado_em: agora.toISOString(),
        comprovante_url: uploaderState.kind === 'aprovado' ? uploaderState.hash : null,
        hash_sha256: uploaderState.kind === 'aprovado' ? uploaderState.hash : null,
      };

      onSaved(novoPag);

      if (status === 'Pago') {
        toast(`Pagamento de ${alunoSelecionado.nome.split(' ')[0]} registrado como Pago.`);
      } else {
        toast(
          `Pagamento de ${alunoSelecionado.nome.split(' ')[0]} enviado para validação.`,
          'warn'
        );
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Registrar pagamento"
      sub="Localize o aluno, informe a forma e anexe o comprovante"
      icon={<IconWallet />}
    >
      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Etapa 1 — Localizar aluno */}
        <div className="field">
          <label>1 · Localizar aluno</label>
          {!alunoSelecionado ? (
            <div style={{ position: 'relative' }}>
              <SearchInput
                value={q}
                onChange={setQ}
                placeholder="Digite o nome do aluno…"
                width="100%"
              />
              {matches.length > 0 && (
                <div style={{
                  position: 'absolute', left: 0, right: 0, top: 44, zIndex: 30,
                  background: 'var(--surface)', border: '1px solid var(--line)',
                  borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-lg)', padding: 6,
                }}>
                  {matches.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => { setAlunoSelecionado(a); setQ(''); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 9px', border: 'none', background: 'transparent',
                        borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--hover)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                    >
                      <Avatar name={a.nome} size="sm" />
                      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{a.nome}</span>
                      <span style={{ fontSize: 12.5, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtMoeda(a.valor_mensalidade)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {q.length > 0 && q.length < 2 && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                  Digite pelo menos 2 caracteres para buscar.
                </div>
              )}
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
              background: 'var(--blue-50)', border: '1px solid var(--blue-100)', borderRadius: 10,
            }}>
              <Avatar name={alunoSelecionado.nome} size="md" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{alunoSelecionado.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {alunoSelecionado.plano ?? 'Sem plano'} · {fmtMoeda(alunoSelecionado.valor_mensalidade)}/mês
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAlunoSelecionado(null)}
                style={{
                  fontSize: 12.5, fontWeight: 500, padding: '5px 10px',
                  border: '1px solid var(--line-2)', borderRadius: 8,
                  background: 'var(--surface)', color: 'var(--ink-2)', cursor: 'pointer',
                }}
              >
                Trocar
              </button>
            </div>
          )}
        </div>

        {/* Etapa 2 — Forma de pagamento */}
        <div className="field">
          <label>2 · Forma de pagamento</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {FORMAS.map((fo) => (
              <button
                key={fo}
                type="button"
                onClick={() => { setForma(fo); setUploaderState({ kind: 'idle' }); }}
                style={{
                  flex: 1, height: 44, borderRadius: 10,
                  border: '1px solid ' + (forma === fo ? 'var(--blue)' : 'var(--line-2)'),
                  background: forma === fo ? 'var(--blue-50)' : 'var(--surface)',
                  color: forma === fo ? 'var(--blue)' : 'var(--ink-2)',
                  fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
                }}
              >
                {fo}
              </button>
            ))}
          </div>
        </div>

        {/* Etapa 3 — Comprovante */}
        <div className="field">
          <label>3 · Comprovante{precisaComprovante ? ' (obrigatório)' : ''}</label>
          <ComprovanteUploader
            key={forma + (alunoSelecionado?.id ?? '')}
            forma={forma}
            onChange={setUploaderState}
          />
        </div>

        {serverError && (
          <div style={{
            padding: '10px 14px', background: 'var(--red-bg)', borderRadius: 9,
            fontSize: 13, color: 'var(--red-text)', border: '1px solid var(--red-border)',
          }}>
            {serverError}
          </div>
        )}
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
        padding: '16px 22px', borderTop: '1px solid var(--line)', background: 'var(--surface-2)',
      }}>
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
          {precisaComprovante
            ? 'Gerará status Pendente de Validação.'
            : 'Será marcado como Pago.'}
        </span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canSave}
            onClick={handleSave}
          >
            {isPending ? 'Registrando…' : <><IconCheck />Registrar</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function FinanceiroClient({
  pagamentos: initialPagamentos,
  kpis,
  alunosOpcoes,
  currentUserPerfil,
}: FinanceiroClientProps) {
  const { toast } = useToast();
  const isAdmin = currentUserPerfil === 'Administrador';

  const [state, dispatch] = useReducer(reducer, {
    pagamentos: initialPagamentos,
    filterStatus: 'todos',
    filterForma: 'todas',
    query: '',
    modal: { kind: 'none' },
  });

  const setFilterStatus = useCallback((v: string) => dispatch({ type: 'SET_FILTER_STATUS', value: v }), []);
  const setFilterForma = useCallback((v: string) => dispatch({ type: 'SET_FILTER_FORMA', value: v }), []);
  const setQuery = useCallback((v: string) => dispatch({ type: 'SET_QUERY', value: v }), []);

  const { pagamentos, filterStatus, filterForma, query, modal } = state;

  // ── Filtros client-side ───────────────────────────────────────────────────
  const filtered = pagamentos.filter((p) => {
    if (filterStatus !== 'todos' && p.status !== filterStatus) return false;
    if (filterForma !== 'todas' && p.forma_pagamento !== filterForma) return false;
    if (query) {
      if (!p.aluno_nome.toLowerCase().includes(query.toLowerCase())) return false;
    }
    return true;
  });

  // ── Contagens para chips ──────────────────────────────────────────────────
  const counts: Record<string, number> = {
    todos: pagamentos.length,
    Pago: pagamentos.filter((p) => p.status === 'Pago').length,
    Atrasado: pagamentos.filter((p) => p.status === 'Atrasado').length,
    'Pendente de Validação': pagamentos.filter((p) => p.status === 'Pendente de Validação').length,
  };

  const statusOpts = [
    { value: 'todos', label: 'Todos' },
    { value: 'Pago', label: 'Pagos' },
    { value: 'Atrasado', label: 'Atrasados' },
    { value: 'Pendente de Validação', label: 'Pend. Validação' },
  ];

  const formasUnicas = Array.from(
    new Set(pagamentos.map((p) => p.forma_pagamento).filter(Boolean))
  ) as string[];

  // ── Export ────────────────────────────────────────────────────────────────
  const exportData = filtered.map((p) => ({
    aluno: p.aluno_nome,
    competencia: p.competencia,
    valor_previsto: p.valor_previsto != null ? p.valor_previsto : '',
    valor_pago: p.valor_pago != null ? p.valor_pago : '',
    forma_pagamento: p.forma_pagamento ?? '',
    vencimento: fmtDate(p.vencimento),
    status: p.status,
    comprovante: p.comprovante_url ? 'Sim' : 'Não',
  }));

  const exportColumns = [
    { label: 'Aluno', key: 'aluno' },
    { label: 'Competência', key: 'competencia' },
    { label: 'Valor Previsto (R$)', key: 'valor_previsto' },
    { label: 'Valor Pago (R$)', key: 'valor_pago' },
    { label: 'Forma Pagamento', key: 'forma_pagamento' },
    { label: 'Vencimento', key: 'vencimento' },
    { label: 'Status', key: 'status' },
    { label: 'Comprovante', key: 'comprovante' },
  ];

  function handleExport(tipo: 'xlsx' | 'csv') {
    void registrarExportacaoFinanceiroAction(
      tipo,
      { status: filterStatus, forma: filterForma, busca: query },
      filtered.length
    );
    toast(`Exportado ${filtered.length} lançamentos (${tipo.toUpperCase()}).`);
  }

  const modalOpen = modal.kind === 'registrar';

  return (
    <>
      {/* KPI Cards — apenas Admin */}
      {isAdmin && kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
          <KpiCard
            label={`Receita prevista (${(() => { const d = new Date(); return `${String(d.getMonth() + 1).padStart(2,'0')}/${d.getFullYear()}`; })()})`}
            value={fmtMoeda(kpis.receita_prevista)}
            icon={<IconWallet />}
            tone="blue"
          />
          <KpiCard
            label="Recebida"
            value={fmtMoeda(kpis.receita_recebida)}
            icon={<IconTrendUp />}
            tone="green"
          />
          <KpiCard
            label="Inadimplência"
            value={fmtMoeda(kpis.inadimplencia)}
            icon={<IconAlert />}
            tone="red"
            sub={
              kpis.receita_prevista > 0
                ? `${((kpis.inadimplencia / kpis.receita_prevista) * 100).toFixed(1)}% da receita prevista`
                : undefined
            }
          />
        </div>
      )}

      {/* Seção da lista */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px 14px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap', gap: 10,
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>
              {isAdmin ? 'Lançamentos financeiros' : 'Pagamentos'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
              {filtered.length} lançamentos
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <ExportMenu
              data={exportData as Record<string, unknown>[]}
              filename="financeiro"
              columns={exportColumns}
              label="Exportar"
              onExport={handleExport}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={() => dispatch({ type: 'OPEN_REGISTRAR' })}
            >
              <IconPlus />Registrar pagamento
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div style={{
          padding: '12px 22px', borderBottom: '1px solid var(--line)',
          display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}>
          <FilterChips options={statusOpts} value={filterStatus} onChange={setFilterStatus} counts={counts} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="input"
              style={{ width: 180, height: 38, fontSize: 13 }}
              value={filterForma}
              onChange={(e) => setFilterForma(e.target.value)}
            >
              <option value="todas">Todas as formas</option>
              {formasUnicas.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Buscar aluno…"
              width={240}
            />
          </div>
        </div>

        {/* Tabela */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Aluno', 'Competência', 'Valor', 'Forma', 'Vencimento', 'Comprovante', 'Status'].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 60).map((p) => (
                <tr
                  key={p.id}
                  style={{ borderBottom: '1px solid var(--line)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--hover)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <Avatar name={p.aluno_nome} size="md" />
                      <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{p.aluno_nome}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 13 }}>
                    {p.competencia}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' }}>
                    {fmtMoeda(p.valor_previsto)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '3px 9px', borderRadius: 99, fontSize: 12.5, fontWeight: 600,
                      background: 'var(--hover)', color: 'var(--ink-2)',
                    }}>
                      {p.forma_pagamento ?? '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtDate(p.vencimento)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {p.comprovante_url
                      ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--blue)', fontWeight: 500 }}>
                          <IconFile />Anexado
                        </span>
                      )
                      : (
                        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                          {p.forma_pagamento === 'Cartão' ? 'Automático' : '—'}
                        </span>
                      )}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge status={p.status} short />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <Empty
              icon={<IconSearch />}
              title="Nenhum lançamento encontrado"
              description="Ajuste os filtros ou o termo de busca."
            />
          )}
          {filtered.length > 60 && (
            <div style={{
              padding: '12px 16px', fontSize: 12.5, color: 'var(--muted)',
              textAlign: 'center', borderTop: '1px solid var(--line)',
            }}>
              Exibindo 60 de {filtered.length} · refine os filtros para ver mais
            </div>
          )}
        </div>
      </div>

      {/* Modal de Registrar Pagamento — remontado via key para reset limpo */}
      <RegistrarPagamentoModal
        key={modalOpen ? 'registrar-open' : 'registrar-closed'}
        open={modalOpen}
        alunosOpcoes={alunosOpcoes}
        onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
        onSaved={(pag) => dispatch({ type: 'PAGAMENTO_ADICIONADO', pag })}
      />
    </>
  );
}
