'use client';

import { useReducer, useState, useTransition } from 'react';
import Avatar from '@/components/ui/Avatar';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import Empty from '@/components/ui/Empty';
import { useToast } from '@/components/ui/Toast';
import {
  aprovarPagamentoAction,
  rejeitarPagamentoAction,
  gerarSignedUrlAction,
} from '@/app/(app)/validacoes/actions';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface PagamentoPendente {
  id: string;
  student_id: string;
  aluno_nome: string;
  aluno_email: string | null;
  competencia: string;
  valor_previsto: number | null;
  forma_pagamento: string | null;
  vencimento: string | null;
  criado_em: string;
  arquivo_url: string | null;
  /** Signed URL pré-gerada no Server Component (válida por 1h) */
  arquivo_url_signed: string | null;
  hash_sha256: string | null;
}

interface ValidacoesClientProps {
  pendentes: PagamentoPendente[];
  currentUserPerfil: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ícones inline
// ─────────────────────────────────────────────────────────────────────────────

const IconCheckCircle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const IconXCircle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const IconFile = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
  </svg>
);

const IconExternalLink = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const IconEmpty = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
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

function fmtDateTime(iso: string): string {
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

// ─────────────────────────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────────────────────────

interface State {
  fila: PagamentoPendente[];
  selecionadoId: string | null;
  modalRejeicao: PagamentoPendente | null;
}

type Action =
  | { type: 'SELECIONAR'; id: string }
  | { type: 'ABRIR_REJEICAO'; pag: PagamentoPendente }
  | { type: 'FECHAR_REJEICAO' }
  | { type: 'REMOVER'; id: string };

function proximoId(fila: PagamentoPendente[], removendoId: string): string | null {
  const idx = fila.findIndex((p) => p.id === removendoId);
  const remaining = fila.filter((p) => p.id !== removendoId);
  if (remaining.length === 0) return null;
  // Tenta selecionar o próximo; se não existir, o anterior
  return remaining[Math.min(idx, remaining.length - 1)].id;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SELECIONAR':
      return { ...state, selecionadoId: action.id };
    case 'ABRIR_REJEICAO':
      return { ...state, modalRejeicao: action.pag };
    case 'FECHAR_REJEICAO':
      return { ...state, modalRejeicao: null };
    case 'REMOVER': {
      const proximo = proximoId(state.fila, action.id);
      const novaFila = state.fila.filter((p) => p.id !== action.id);
      return {
        ...state,
        fila: novaFila,
        selecionadoId: proximo,
        modalRejeicao: null,
      };
    }
    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RejeicaoModal
// ─────────────────────────────────────────────────────────────────────────────

interface RejeicaoModalProps {
  pag: PagamentoPendente | null;
  onClose: () => void;
  onConfirm: (paymentId: string, motivo: string) => void;
  isPending: boolean;
}

const MIN_CHARS = 20;

function RejeicaoModal({ pag, onClose, onConfirm, isPending }: RejeicaoModalProps) {
  // Estado inicializado diretamente (não via useEffect) — evita react-hooks/set-state-in-effect
  const [motivo, setMotivo] = useState('');

  if (!pag) return null;

  const motivoLen = motivo.trim().length;
  const canConfirm = motivoLen >= MIN_CHARS && !isPending;

  return (
    <Modal
      open={!!pag}
      onClose={onClose}
      size="md"
      title="Rejeitar comprovante"
      sub="Informe o motivo para registro em auditoria"
      icon={<IconXCircle />}
    >
      <div style={{ padding: 22 }}>
        {/* Resumo do pagamento */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
          {([
            ['Aluno', pag.aluno_nome],
            ['Competência', pag.competencia],
            ['Valor', fmtMoeda(pag.valor_previsto)],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} style={{
              padding: '10px 14px', background: 'var(--surface-2)',
              borderRadius: 10, border: '1px solid var(--line)',
            }}>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{k}</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</div>
            </div>
          ))}
        </div>

        <div className="field">
          <label>Motivo da rejeição *</label>
          <textarea
            className="input"
            style={{ minHeight: 100, resize: 'vertical' }}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Descreva o motivo da rejeição para registro em auditoria e notificação ao responsável…"
            autoFocus
            disabled={isPending}
          />
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 12, color: motivoLen < MIN_CHARS ? 'var(--red-text)' : 'var(--green-text)',
            marginTop: 4,
          }}>
            <span>{motivoLen < MIN_CHARS ? `Mínimo ${MIN_CHARS} caracteres` : 'Motivo válido'}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{motivoLen} / {MIN_CHARS} mín.</span>
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: 10,
        padding: '16px 22px', borderTop: '1px solid var(--line)', background: 'var(--surface-2)',
      }}>
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isPending}>
          Cancelar
        </button>
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => onConfirm(pag.id, motivo)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            height: 38, padding: '0 16px', borderRadius: 'var(--r)',
            border: 'none', cursor: canConfirm ? 'pointer' : 'not-allowed',
            background: canConfirm ? 'var(--red-text)' : 'var(--hover)',
            color: canConfirm ? '#fff' : 'var(--muted)',
            fontSize: 13.5, fontWeight: 600, transition: 'background .12s',
          }}
        >
          <IconXCircle />
          {isPending ? 'Rejeitando…' : 'Confirmar rejeição'}
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Painel de detalhe do comprovante
// ─────────────────────────────────────────────────────────────────────────────

interface DetalhePainelProps {
  pag: PagamentoPendente;
  signedUrl: string | null;
  onAprovar: () => void;
  onRejeitar: () => void;
  isPending: boolean;
}

function DetalhePanel({ pag, signedUrl, onAprovar, onRejeitar, isPending }: DetalhePainelProps) {
  const isImage = pag.hash_sha256
    ? pag.arquivo_url?.endsWith('.png') || pag.arquivo_url?.endsWith('.jpg') || pag.arquivo_url?.endsWith('.jpeg')
    : false;

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 22px', borderBottom: '1px solid var(--line)',
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>Revisar comprovante</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            {pag.aluno_nome} · {pag.competencia}
          </div>
        </div>
        <StatusBadge status="Pendente de Validação" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, padding: 22 }}>
        {/* Visualização do comprovante */}
        <div>
          {signedUrl ? (
            <div style={{
              background: 'var(--hover)', borderRadius: 12, overflow: 'hidden',
              minHeight: 200, display: 'grid', placeItems: 'center',
            }}>
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signedUrl}
                  alt="Comprovante"
                  style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 8 }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <div style={{ color: 'var(--muted-2)', marginBottom: 12 }}>
                    <IconFile />
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink-2)', marginBottom: 4 }}>
                    Comprovante PDF
                  </div>
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: 13, color: 'var(--blue)', fontWeight: 500,
                      textDecoration: 'none',
                    }}
                  >
                    <IconExternalLink />Abrir documento
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div style={{
              background: 'var(--hover)', borderRadius: 12, minHeight: 200,
              display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 13,
            }}>
              {pag.arquivo_url ? 'Carregando visualização…' : 'Sem comprovante anexado'}
            </div>
          )}
          {signedUrl && (
            <div style={{ marginTop: 8, textAlign: 'center' }}>
              <a
                href={signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 12.5, color: 'var(--blue)', textDecoration: 'none', fontWeight: 500,
                }}
              >
                <IconExternalLink />Abrir em nova aba
              </a>
            </div>
          )}
        </div>

        {/* Dados do pagamento + ações */}
        <div>
          <div style={{ display: 'grid', gap: 14 }}>
            {([
              ['Aluno', pag.aluno_nome],
              ['Competência', pag.competencia],
              ['Valor declarado', fmtMoeda(pag.valor_previsto)],
              ['Forma de pagamento', pag.forma_pagamento ?? '—'],
              ['Vencimento', fmtDate(pag.vencimento)],
              ['Enviado em', fmtDateTime(pag.criado_em)],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{k}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, textAlign: 'right', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              disabled={isPending}
              onClick={onAprovar}
              style={{
                height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                borderRadius: 'var(--r)', border: 'none', fontSize: 14, fontWeight: 600,
                background: isPending ? 'var(--hover)' : 'var(--green-text)',
                color: isPending ? 'var(--muted)' : '#fff',
                cursor: isPending ? 'not-allowed' : 'pointer', transition: 'background .12s',
              }}
            >
              <IconCheckCircle />
              {isPending ? 'Processando…' : 'Aprovar pagamento'}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={onRejeitar}
              style={{
                height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                borderRadius: 'var(--r)', border: '1px solid var(--red-border)', fontSize: 14, fontWeight: 600,
                background: 'var(--red-bg)', color: 'var(--red-text)',
                cursor: isPending ? 'not-allowed' : 'pointer',
              }}
            >
              <IconXCircle />Rejeitar comprovante
            </button>
          </div>

          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 14, lineHeight: 1.5 }}>
            Ao aprovar, o aluno passa a{' '}
            <strong style={{ color: 'var(--green-text)' }}>Ativo</strong>.
            Toda decisão é registrada na auditoria.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function ValidacoesClient({
  pendentes: initialPendentes,
}: ValidacoesClientProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [state, dispatch] = useReducer(reducer, {
    fila: initialPendentes,
    selecionadoId: initialPendentes[0]?.id ?? null,
    modalRejeicao: null,
  });

  // Signed URL lazy — armazenado por payment_id
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const p of initialPendentes) {
      if (p.arquivo_url_signed) {
        map[p.id] = p.arquivo_url_signed;
      }
    }
    return map;
  });

  const { fila, selecionadoId, modalRejeicao } = state;
  const atual = fila.find((p) => p.id === selecionadoId) ?? fila[0] ?? null;

  // Lazy load signed URL se não tiver (para itens adicionados depois da carga inicial)
  const handleSelecionar = (id: string) => {
    dispatch({ type: 'SELECIONAR', id });
    const pag = fila.find((p) => p.id === id);
    if (pag && pag.arquivo_url && !signedUrls[id]) {
      void gerarSignedUrlAction(pag.arquivo_url).then((res) => {
        if (res.url) {
          setSignedUrls((prev) => ({ ...prev, [id]: res.url! }));
        }
      });
    }
  };

  function handleAprovar(paymentId: string) {
    startTransition(async () => {
      const result = await aprovarPagamentoAction(paymentId);
      if (!result.ok) {
        toast(result.error ?? 'Erro ao aprovar pagamento.', 'err');
        return;
      }
      const pag = fila.find((p) => p.id === paymentId);
      dispatch({ type: 'REMOVER', id: paymentId });
      toast(`Comprovante aprovado · ${pag?.aluno_nome.split(' ')[0] ?? 'aluno'} marcado como Ativo.`);
    });
  }

  function handleRejeitar(paymentId: string, motivo: string) {
    startTransition(async () => {
      const result = await rejeitarPagamentoAction(paymentId, motivo);
      if (!result.ok) {
        toast(result.error ?? 'Erro ao rejeitar pagamento.', 'err');
        return;
      }
      dispatch({ type: 'REMOVER', id: paymentId });
      toast('Comprovante rejeitado. Aluno notificado.', 'err');
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (fila.length === 0) {
    return (
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>Validação de comprovantes</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>0 comprovantes aguardando revisão</div>
        </div>
        <Empty
          icon={<IconEmpty />}
          title="Tudo validado!"
          description="Não há comprovantes pendentes no momento."
        />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 600, fontSize: 18, color: 'var(--ink)' }}>Validação de comprovantes</div>
        <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 2 }}>
          {fila.length} comprovante{fila.length !== 1 ? 's' : ''} aguardando revisão
        </div>
      </div>

      {/* Layout painel duplo */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Fila */}
        <div className="card" style={{ overflow: 'hidden', maxHeight: 560, overflowY: 'auto' }}>
          {/* Card head */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Fila</div>
            <span style={{
              fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
              background: 'var(--blue-50)', color: 'var(--blue)',
            }}>
              {fila.length} pendente{fila.length !== 1 ? 's' : ''}
            </span>
          </div>
          {fila.map((p) => {
            const ativo = atual?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelecionar(p.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 11,
                  padding: '12px 16px', border: 'none',
                  borderBottom: '1px solid var(--line)',
                  background: ativo ? 'var(--blue-50)' : 'var(--surface)',
                  textAlign: 'left', cursor: 'pointer',
                  borderLeft: ativo ? '3px solid var(--blue)' : '3px solid transparent',
                  transition: 'background .1s',
                }}
                onMouseEnter={(e) => { if (!ativo) (e.currentTarget as HTMLButtonElement).style.background = 'var(--hover)'; }}
                onMouseLeave={(e) => { if (!ativo) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'; }}
              >
                <Avatar name={p.aluno_nome} size="md" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.aluno_nome}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                    {p.competencia} · {p.forma_pagamento ?? '—'}
                  </div>
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  {fmtMoeda(p.valor_previsto)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Detalhe */}
        {atual && (
          <DetalhePanel
            key={atual.id}
            pag={atual}
            signedUrl={signedUrls[atual.id] ?? null}
            onAprovar={() => handleAprovar(atual.id)}
            onRejeitar={() => dispatch({ type: 'ABRIR_REJEICAO', pag: atual })}
            isPending={isPending}
          />
        )}
      </div>

      {/* RejeicaoModal — remontado via key para reset de estado */}
      <RejeicaoModal
        key={modalRejeicao?.id ?? 'none-rejeicao'}
        pag={modalRejeicao}
        onClose={() => dispatch({ type: 'FECHAR_REJEICAO' })}
        onConfirm={handleRejeitar}
        isPending={isPending}
      />
    </>
  );
}
