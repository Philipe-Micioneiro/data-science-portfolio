'use client';

import {
  useCallback,
  useReducer,
  useRef,
  useState,
  useTransition,
} from 'react';
import Avatar from '@/components/ui/Avatar';
import StatusBadge from '@/components/ui/StatusBadge';
import PerfilBadge from '@/components/ui/PerfilBadge';
import KpiCard from '@/components/ui/KpiCard';
import Modal from '@/components/ui/Modal';
import SearchInput from '@/components/ui/SearchInput';
import FilterChips from '@/components/ui/FilterChips';
import Empty from '@/components/ui/Empty';
import { useToast } from '@/components/ui/Toast';
import {
  criarUsuarioAction,
  editarUsuarioAction,
  resetSenhaAction,
} from '@/app/(app)/usuarios/actions';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface UsuarioRow {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  status: string;
  precisa_trocar_senha: boolean;
  criado_em: string | null;
  ultimo_acesso: string | null;
}

interface UsuariosClientProps {
  usuarios: UsuarioRow[];
  currentUserId: string;
  currentUserPerfil: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reducer — toda a UI state em um único objeto para evitar setState em useEffect
// ─────────────────────────────────────────────────────────────────────────────

type ModalState =
  | { kind: 'none' }
  | { kind: 'novo'; saved: boolean; senhaTemp: string; emailFailed: boolean }
  | { kind: 'editar'; usuario: UsuarioRow }
  | { kind: 'detalhe'; usuario: UsuarioRow; novasenha: string | null };

interface State {
  usuarios: UsuarioRow[];
  filter: string;
  query: string;
  modal: ModalState;
}

type Action =
  | { type: 'SET_FILTER'; value: string }
  | { type: 'SET_QUERY'; value: string }
  | { type: 'OPEN_NOVO' }
  | { type: 'NOVO_SAVED'; senhaTemp: string; novoUsuario: UsuarioRow; emailFailed: boolean }
  | { type: 'OPEN_EDITAR'; usuario: UsuarioRow }
  | { type: 'EDITAR_SAVED'; updated: UsuarioRow }
  | { type: 'OPEN_DETALHE'; usuario: UsuarioRow }
  | { type: 'DETALHE_EDIT'; usuario: UsuarioRow }
  | { type: 'RESET_SENHA_DONE'; usuarioId: string; novasenha: string }
  | { type: 'CLOSE_MODAL' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_FILTER':
      return { ...state, filter: action.value };
    case 'SET_QUERY':
      return { ...state, query: action.value };
    case 'OPEN_NOVO':
      return { ...state, modal: { kind: 'novo', saved: false, senhaTemp: '', emailFailed: false } };
    case 'NOVO_SAVED':
      return {
        ...state,
        usuarios: [action.novoUsuario, ...state.usuarios],
        modal: { kind: 'novo', saved: true, senhaTemp: action.senhaTemp, emailFailed: action.emailFailed },
      };
    case 'OPEN_EDITAR':
      return { ...state, modal: { kind: 'editar', usuario: action.usuario } };
    case 'EDITAR_SAVED': {
      const updated = action.updated;
      const newUsuarios = state.usuarios.map((u) => (u.id === updated.id ? updated : u));
      // Se o detalhe estava aberto para o mesmo usuário, atualizar e manter detalhe
      if (state.modal.kind === 'detalhe' && state.modal.usuario.id === updated.id) {
        return {
          ...state,
          usuarios: newUsuarios,
          modal: { kind: 'detalhe', usuario: updated, novasenha: state.modal.novasenha },
        };
      }
      return {
        ...state,
        usuarios: newUsuarios,
        modal: { kind: 'none' },
      };
    }
    case 'OPEN_DETALHE':
      return { ...state, modal: { kind: 'detalhe', usuario: action.usuario, novasenha: null } };
    case 'DETALHE_EDIT':
      return { ...state, modal: { kind: 'editar', usuario: action.usuario } };
    case 'RESET_SENHA_DONE': {
      // Atualizar precisa_trocar_senha no usuário local e atualizar modal
      const updatedUsuarios = state.usuarios.map((u) =>
        u.id === action.usuarioId ? { ...u, precisa_trocar_senha: true } : u,
      );
      const usuarioAtualizado =
        updatedUsuarios.find((u) => u.id === action.usuarioId) ??
        (state.modal.kind === 'detalhe' ? state.modal.usuario : null);
      if (!usuarioAtualizado) return state;
      return {
        ...state,
        usuarios: updatedUsuarios,
        modal: { kind: 'detalhe', usuario: usuarioAtualizado, novasenha: action.novasenha },
      };
    }
    case 'CLOSE_MODAL':
      return { ...state, modal: { kind: 'none' } };
    default:
      return state;
  }
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
const IconShield = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IconGraduation = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);
const IconBan = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);
const IconChevR = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const IconEdit = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IconLock = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const IconCheck = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconAlert = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const IconCheckCircle = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const IconCopy = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
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

// ─────────────────────────────────────────────────────────────────────────────
// CopyButton
// ─────────────────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function doCopy() {
    try { navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button className="btn btn-ghost btn-sm" onClick={doCopy} style={{ gap: 6 }}>
      {copied ? <IconCheck /> : <IconCopy />}
      {copied ? 'Copiado!' : 'Copiar'}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TempPwBanner — exibido após criação (fundo verde)
// ─────────────────────────────────────────────────────────────────────────────

function TempPwBanner({ email, senha }: { email: string; senha: string }) {
  return (
    <div style={{
      background: 'var(--green-bg)',
      border: '1px solid var(--green)',
      borderRadius: 10,
      padding: '14px 16px',
      marginTop: 16,
    }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--green-text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <IconCheckCircle />
        Usuário criado! Senha temporária gerada.
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
        Um email com as credenciais foi enviado para <strong>{email}</strong>. O usuário será obrigado a trocar a senha no primeiro acesso.
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          flex: 1,
          background: 'var(--surface)',
          border: '1px solid var(--line-2)',
          borderRadius: 8,
          padding: '8px 12px',
          fontFamily: 'monospace',
          fontWeight: 700,
          letterSpacing: '.06em',
          fontSize: 15,
          color: 'var(--ink)',
        }}>
          {senha}
        </div>
        <CopyButton text={senha} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NovoUsuarioModal — F2B.2
// ─────────────────────────────────────────────────────────────────────────────

interface NovoUsuarioModalProps {
  open: boolean;
  saved: boolean;
  senhaTemp: string;
  emailFailed: boolean;
  existingEmails: string[];
  onClose: () => void;
  onSave: (nome: string, email: string, perfil: 'Secretário' | 'Professor') => void;
  isPending: boolean;
  serverError: string | null;
}

function NovoUsuarioModal({
  open,
  saved,
  senhaTemp,
  emailFailed,
  existingEmails,
  onClose,
  onSave,
  isPending,
  serverError,
}: NovoUsuarioModalProps) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [perfil, setPerfil] = useState<'Secretário' | 'Professor'>('Secretário');

  const emailTaken = existingEmails.includes(email.trim().toLowerCase());
  const valid = nome.trim() !== '' && email.trim() !== '' && !emailTaken && !isPending;

  function handleSubmit() {
    if (!valid) return;
    void onSave(nome.trim(), email.trim(), perfil);
  }

  const savedEmail = email;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Novo usuário"
      sub="Crie uma conta e defina o perfil de acesso"
      icon={<IconUserPlus />}
    >
      <div style={{ padding: 22 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label>Nome completo *</label>
            <input
              className="input"
              defaultValue=""
              key={open ? 'open' : 'closed'}
              placeholder="Nome completo"
              autoFocus
              disabled={saved || isPending}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Email *</label>
            <input
              className="input"
              type="email"
              defaultValue=""
              key={open ? 'email-open' : 'email-closed'}
              placeholder="usuario@school.com"
              disabled={saved || isPending}
              onChange={(e) => setEmail(e.target.value)}
            />
            {emailTaken && (
              <span className="hint" style={{ color: 'var(--red-text)' }}>
                Este email já está em uso.
              </span>
            )}
          </div>
          <div className="field">
            <label>Perfil de acesso</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['Secretário', 'Professor'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={saved || isPending}
                  onClick={() => setPerfil(p)}
                  style={{
                    flex: 1,
                    height: 42,
                    borderRadius: 10,
                    border: '1px solid ' + (perfil === p ? 'var(--blue)' : 'var(--line-2)'),
                    background: perfil === p ? 'var(--blue-50)' : 'var(--surface)',
                    color: perfil === p ? 'var(--blue)' : 'var(--ink-2)',
                    fontWeight: 600,
                    fontSize: 13.5,
                    cursor: saved || isPending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {p}
                </button>

              ))}
            </div>
            <span className="hint">Administradores só podem ser criados por processo interno.</span>
          </div>
        </div>

        {serverError && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--red-bg)', borderRadius: 9, fontSize: 13, color: 'var(--red-text)', border: '1px solid var(--red-border)' }}>
            {serverError}
          </div>
        )}

        {saved && (
          <>
            <TempPwBanner email={savedEmail} senha={senhaTemp} />
            {emailFailed && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--amber-bg)', borderRadius: 9, fontSize: 12.5, color: 'var(--amber-text)' }}>
                O email de boas-vindas não pôde ser enviado. Repasse a senha manualmente.
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 22px', borderTop: '1px solid var(--line)', background: 'var(--surface-2)' }}>
        <button className="btn btn-ghost" onClick={onClose}>
          {saved ? 'Fechar' : 'Cancelar'}
        </button>
        {!saved && (
          <button className="btn btn-primary" disabled={!valid} onClick={handleSubmit}>
            {isPending ? 'Criando…' : <><IconCheck />Criar usuário</>}
          </button>
        )}
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EditarUsuarioModal — F2B.3
// ─────────────────────────────────────────────────────────────────────────────

interface EditarUsuarioModalProps {
  open: boolean;
  usuario: UsuarioRow | null;
  onClose: () => void;
  onSave: (id: string, nome: string, email: string, status: 'Ativo' | 'Inativo') => void;
  isPending: boolean;
  serverError: string | null;
  currentUserId: string;
}

function EditarUsuarioModal({
  open,
  usuario,
  onClose,
  onSave,
  isPending,
  serverError,
  currentUserId,
}: EditarUsuarioModalProps) {
  // nomeRef / emailRef start empty — defaultValue on inputs handles display
  const nomeRef = useRef('');
  const emailRef = useRef('');
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>((usuario?.status as 'Ativo' | 'Inativo') ?? 'Ativo');

  const isSelf = usuario?.id === currentUserId;

  if (!usuario) return null;

  function handleSave() {
    if (!usuario) return;
    void onSave(
      usuario.id,
      nomeRef.current.trim() || usuario.nome,
      emailRef.current.trim() || usuario.email,
      status,
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Editar usuário"
      sub={usuario.perfil}
      icon={<IconEdit />}
    >
      <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="field">
          <label>Nome completo</label>
          <input
            className="input"
            key={`nome-${usuario.id}`}
            defaultValue={usuario.nome}
            disabled={isPending}
            onChange={(e) => { nomeRef.current = e.target.value; }}
          />
        </div>
        <div className="field">
          <label>Email</label>
          <input
            className="input"
            type="email"
            key={`email-${usuario.id}`}
            defaultValue={usuario.email}
            disabled={isPending}
            onChange={(e) => { emailRef.current = e.target.value; }}
          />
        </div>
        <div className="field">
          <label>Perfil</label>
          <div className="input" style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--surface-2)',
            color: 'var(--muted)',
            cursor: 'not-allowed',
          }}>
            <PerfilBadge perfil={usuario.perfil} />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              Para alterar o perfil, inative e crie novo usuário.
            </span>
          </div>
        </div>
        <div className="field">
          <label>Status</label>
          {isSelf ? (
            <div style={{ fontSize: 12.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5, padding: '8px 0' }}>
              <IconAlert />
              Você não pode alterar o status da sua própria conta.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              {(['Ativo', 'Inativo'] as const).map((s) => {
                const isSelected = status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={isPending}
                    onClick={() => setStatus(s)}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 10,
                      border: '1px solid ' + (isSelected ? 'var(--blue)' : 'var(--line-2)'),
                      background: isSelected ? 'var(--blue-50)' : 'var(--surface)',
                      color: isSelected ? 'var(--blue)' : 'var(--ink-2)',
                      fontWeight: 600,
                      fontSize: 13.5,
                      cursor: isPending ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {serverError && (
          <div style={{ padding: '10px 14px', background: 'var(--red-bg)', borderRadius: 9, fontSize: 13, color: 'var(--red-text)', border: '1px solid var(--red-border)' }}>
            {serverError}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 22px', borderTop: '1px solid var(--line)', background: 'var(--surface-2)' }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" disabled={isPending} onClick={handleSave}>
          {isPending ? 'Salvando…' : <><IconCheck />Salvar alterações</>}
        </button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UsuarioDetailModal — F2B.4
// ─────────────────────────────────────────────────────────────────────────────

interface UsuarioDetailModalProps {
  usuario: UsuarioRow | null;
  novasenha: string | null;
  onClose: () => void;
  onEdit: (usuario: UsuarioRow) => void;
  onToggleStatus: (usuarioId: string, novoStatus: 'Ativo' | 'Inativo') => void;
  onResetSenha: (usuarioId: string) => void;
  isPending: boolean;
  serverError: string | null;
  currentUserId: string;
}

function UsuarioDetailModal({
  usuario,
  novasenha,
  onClose,
  onEdit,
  onToggleStatus,
  onResetSenha,
  isPending,
  serverError,
  currentUserId,
}: UsuarioDetailModalProps) {
  const [confirm, setConfirm] = useState(false);

  if (!usuario) return null;

  const isSelf = usuario.id === currentUserId;

  return (
    <Modal
      open={!!usuario}
      onClose={onClose}
      size="md"
      title={usuario.nome}
      sub={usuario.email}
      icon={<IconUser />}
    >
      <div style={{ padding: '18px 22px 22px' }}>
        {/* Header do perfil */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          marginBottom: 20,
          padding: '16px 18px',
          background: 'var(--surface-2)',
          border: '1px solid var(--line)',
          borderRadius: 12,
        }}>
          <Avatar name={usuario.nome} size="lg" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>{usuario.nome}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <PerfilBadge perfil={usuario.perfil} />
              <StatusBadge status={usuario.status} />
              {usuario.precisa_trocar_senha && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 9px',
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 600,
                  background: 'var(--amber-bg)',
                  color: 'var(--amber-text)',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: 'var(--amber-text)', display: 'inline-block' }} />
                  Troca de senha pendente
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Grid de info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginBottom: 20 }}>
          {([
            ['Data de criação', fmtDate(usuario.criado_em)],
            ['Último acesso', fmtDateTime(usuario.ultimo_acesso)],
            ['Email', usuario.email],
            ['Perfil', usuario.perfil],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{k}</div>
              <div style={{ fontSize: 13.5, fontWeight: 500, marginTop: 2, color: 'var(--ink)', wordBreak: 'break-all' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Painel azul de nova senha */}
        {novasenha && (
          <div style={{
            background: 'var(--blue-50)',
            border: '1px solid var(--blue-100)',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 14,
          }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--blue)', marginBottom: 8 }}>
              Nova senha temporária gerada
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                flex: 1,
                background: 'var(--surface)',
                border: '1px solid var(--line-2)',
                borderRadius: 8,
                padding: '7px 12px',
                fontFamily: 'monospace',
                fontWeight: 700,
                fontSize: 14,
                color: 'var(--ink)',
              }}>
                {novasenha}
              </div>
              <CopyButton text={novasenha} />
            </div>
          </div>
        )}

        {serverError && (
          <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--red-bg)', borderRadius: 9, fontSize: 13, color: 'var(--red-text)', border: '1px solid var(--red-border)' }}>
            {serverError}
          </div>
        )}

        {/* Ações */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(usuario)}>
            <IconEdit />Editar
          </button>
          {!novasenha && (
            <button
              className="btn btn-ghost btn-sm"
              disabled={isPending}
              onClick={() => void onResetSenha(usuario.id)}
            >
              <IconLock />{isPending ? 'Resetando…' : 'Resetar senha'}
            </button>
          )}

          {isSelf ? (
            <span style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <IconAlert />
              Não é possível inativar sua própria conta.
            </span>
          ) : (
            confirm ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                background: 'var(--red-bg)',
                border: '1px solid var(--red-border)',
                borderRadius: 9,
                flex: 1,
              }}>
                <span style={{ fontSize: 12.5, color: 'var(--red-text)', flex: 1 }}>
                  Confirmar {usuario.status === 'Ativo' ? 'inativação' : 'reativação'}?
                </span>
                <button className="btn btn-subtle btn-sm" onClick={() => setConfirm(false)}>
                  Não
                </button>
                <button
                  className={'btn btn-sm ' + (usuario.status === 'Ativo' ? 'btn-danger' : 'btn-success')}
                  disabled={isPending}
                  onClick={() => {
                    setConfirm(false);
                    const novoStatus = usuario.status === 'Ativo' ? 'Inativo' : 'Ativo';
                    onToggleStatus(usuario.id, novoStatus);
                  }}
                >
                  {usuario.status === 'Ativo' ? 'Inativar' : 'Reativar'}
                </button>
              </div>
            ) : (
              <button
                className={'btn btn-sm ' + (usuario.status === 'Ativo' ? 'btn-danger' : 'btn-success')}
                onClick={() => setConfirm(true)}
              >
                <IconBan />{usuario.status === 'Ativo' ? 'Inativar' : 'Reativar'}
              </button>
            )
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function UsuariosClient({
  usuarios: initialUsuarios,
  currentUserId,
  currentUserPerfil,
}: UsuariosClientProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const [state, dispatch] = useReducer(reducer, {
    usuarios: initialUsuarios,
    filter: 'todos',
    query: '',
    modal: { kind: 'none' },
  });

  const setFilter = useCallback((v: string) => dispatch({ type: 'SET_FILTER', value: v }), []);
  const setQuery = useCallback((v: string) => dispatch({ type: 'SET_QUERY', value: v }), []);

  // ── Filtros ───────────────────────────────────────────────────────────────
  const { usuarios, filter, query, modal } = state;

  const filtered = usuarios.filter((u) => {
    if (filter === 'Inativo') return u.status === 'Inativo';
    if (filter !== 'todos' && u.perfil !== filter) return false;
    if (query) {
      const t = query.toLowerCase();
      if (!(u.nome.toLowerCase().includes(t) || u.email.toLowerCase().includes(t))) return false;
    }
    return true;
  });

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const counts: Record<string, number> = { todos: usuarios.length };
  for (const p of ['Administrador', 'Secretário', 'Professor']) {
    counts[p] = usuarios.filter((u) => u.perfil === p && u.status === 'Ativo').length;
  }
  counts['Inativo'] = usuarios.filter((u) => u.status === 'Inativo').length;

  const existingEmails = usuarios.map((u) => u.email.toLowerCase());

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleCriarUsuario(nome: string, email: string, perfil: 'Secretário' | 'Professor') {
    setServerError(null);
    startTransition(async () => {
      const result = await criarUsuarioAction({ nome, email, perfil });
      if (!result.ok) {
        setServerError(result.error ?? null);
        return;
      }
      const novoUsuario: UsuarioRow = {
        id: result.data.usuarioId,
        nome,
        email: email.toLowerCase(),
        perfil,
        status: 'Ativo',
        precisa_trocar_senha: true,
        criado_em: new Date().toISOString(),
        ultimo_acesso: null,
      };
      dispatch({
        type: 'NOVO_SAVED',
        senhaTemp: result.data.senhaTemp,
        novoUsuario,
        emailFailed: result.emailFailed ?? false,
      });
      toast('Usuário criado. Senha temporária gerada.');
    });
  }

  function handleEditarUsuario(id: string, nome: string, email: string, novoStatus: 'Ativo' | 'Inativo') {
    setServerError(null);
    startTransition(async () => {
      const result = await editarUsuarioAction({ usuarioId: id, nome, email, status: novoStatus });
      if (!result.ok) {
        setServerError(result.error ?? null);
        return;
      }
      const updatedUsuario = usuarios.find((u) => u.id === id);
      if (updatedUsuario) {
        dispatch({ type: 'EDITAR_SAVED', updated: { ...updatedUsuario, nome, email, status: novoStatus } });
      } else {
        dispatch({ type: 'CLOSE_MODAL' });
      }
      toast('Usuário atualizado. Alteração registrada na auditoria.');
    });
  }

  function handleToggleStatus(usuarioId: string, novoStatus: 'Ativo' | 'Inativo') {
    const usuario = usuarios.find((u) => u.id === usuarioId);
    if (!usuario) return;
    setServerError(null);
    startTransition(async () => {
      const result = await editarUsuarioAction({
        usuarioId,
        nome: usuario.nome,
        email: usuario.email,
        status: novoStatus,
      });
      if (!result.ok) {
        setServerError(result.error ?? null);
        return;
      }
      dispatch({ type: 'EDITAR_SAVED', updated: { ...usuario, status: novoStatus } });
      const nomeFirst = usuario.nome.split(' ')[0];
      toast(
        `${nomeFirst} agora está ${novoStatus}.`,
        novoStatus === 'Inativo' ? 'warn' : 'ok',
      );
    });
  }

  function handleResetSenha(usuarioId: string) {
    setServerError(null);
    startTransition(async () => {
      const result = await resetSenhaAction({ usuarioId });
      if (!result.ok) {
        setServerError(result.error ?? null);
        return;
      }
      dispatch({
        type: 'RESET_SENHA_DONE',
        usuarioId,
        novasenha: result.data.novaSenhaTemp,
      });
      toast('Nova senha temporária gerada com sucesso.');
    });
  }

  // ── Opções de filtro ──────────────────────────────────────────────────────
  const filterOpts = [
    { value: 'todos', label: 'Todos' },
    { value: 'Administrador', label: 'Administradores' },
    { value: 'Secretário', label: 'Secretários' },
    { value: 'Professor', label: 'Professores' },
    { value: 'Inativo', label: 'Inativos' },
  ];

  // ── Extrair dados dos modais ──────────────────────────────────────────────
  const novoModalOpen = modal.kind === 'novo';
  const novoSaved = modal.kind === 'novo' ? modal.saved : false;
  const novoSenhaTemp = modal.kind === 'novo' ? modal.senhaTemp : '';
  const novoEmailFailed = modal.kind === 'novo' ? modal.emailFailed : false;

  const editarModalOpen = modal.kind === 'editar';
  const editarUsuario = modal.kind === 'editar' ? modal.usuario : null;

  const detalheUsuario = modal.kind === 'detalhe' ? modal.usuario : null;
  const detalheNovasenha = modal.kind === 'detalhe' ? modal.novasenha : null;

  return (
    <>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 24 }}>
        <KpiCard label="Total de usuários" value={usuarios.length} icon={<IconUsers />} tone="blue" />
        <KpiCard label="Administradores" value={counts['Administrador']} icon={<IconShield />} tone="blue" />
        <KpiCard label="Secretários" value={counts['Secretário']} icon={<IconUser />} tone="gray" />
        <KpiCard label="Professores" value={counts['Professor']} icon={<IconGraduation />} tone="green" />
        <KpiCard label="Inativos" value={counts['Inativo']} icon={<IconBan />} tone="red" />
      </div>

      {/* Seção da lista */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Header da seção */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 14px', borderBottom: '1px solid var(--line)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>Lista de usuários</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
              {filtered.length} de {usuarios.length} usuários
            </div>
          </div>
          {currentUserPerfil === 'Administrador' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { setServerError(null); dispatch({ type: 'OPEN_NOVO' }); }}
            >
              <IconUserPlus />Novo usuário
            </button>
          )}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 22px', flexWrap: 'wrap', justifyContent: 'space-between', borderBottom: '1px solid var(--line)' }}>
          <FilterChips options={filterOpts} value={filter} onChange={setFilter} counts={counts} />
          <SearchInput value={query} onChange={setQuery} placeholder="Buscar nome ou email…" width={260} />
        </div>

        {/* Tabela */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Usuário', 'Email', 'Perfil', 'Status', 'Último acesso', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  style={{ cursor: 'pointer', opacity: u.status === 'Inativo' ? 0.6 : 1, borderBottom: '1px solid var(--line)' }}
                  onClick={() => { setServerError(null); dispatch({ type: 'OPEN_DETALHE', usuario: u }); }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--hover)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ''; }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <Avatar name={u.nome} size="md" />
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {u.nome}
                          {u.precisa_trocar_senha && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 7px',
                              borderRadius: 99,
                              fontSize: 11,
                              fontWeight: 600,
                              background: 'var(--amber-bg)',
                              color: 'var(--amber-text)',
                            }}>
                              Troca pendente
                            </span>
                          )}
                        </div>
                        {u.id === currentUserId && (
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Você</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 13.5 }}>{u.email}</td>
                  <td style={{ padding: '12px 16px' }}><PerfilBadge perfil={u.perfil} /></td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={u.status} /></td>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 13.5, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtDateTime(u.ultimo_acesso)}
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
              title="Nenhum usuário encontrado"
              description="Ajuste os filtros ou o termo de busca."
            />
          )}
        </div>
      </div>

      {/* Modais */}
      <NovoUsuarioModal
        key={novoModalOpen ? 'novo-open' : 'novo-closed'}
        open={novoModalOpen}
        saved={novoSaved}
        senhaTemp={novoSenhaTemp}
        emailFailed={novoEmailFailed}
        existingEmails={existingEmails}
        onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
        onSave={handleCriarUsuario}
        isPending={isPending}
        serverError={novoModalOpen ? serverError : null}
      />

      <EditarUsuarioModal
        key={editarUsuario?.id ?? 'none'}
        open={editarModalOpen}
        usuario={editarUsuario}
        onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
        onSave={handleEditarUsuario}
        isPending={isPending}
        serverError={editarModalOpen ? serverError : null}
        currentUserId={currentUserId}
      />

      <UsuarioDetailModal
        usuario={detalheUsuario}
        novasenha={detalheNovasenha}
        onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
        onEdit={(u) => { setServerError(null); dispatch({ type: 'DETALHE_EDIT', usuario: u }); }}
        onToggleStatus={handleToggleStatus}
        onResetSenha={handleResetSenha}
        isPending={isPending}
        serverError={modal.kind === 'detalhe' ? serverError : null}
        currentUserId={currentUserId}
      />
    </>
  );
}
