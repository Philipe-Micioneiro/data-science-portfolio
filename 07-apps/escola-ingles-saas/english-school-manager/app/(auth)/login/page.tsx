'use client';

import { useActionState, useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { loginAction, recuperarSenhaAction } from '../actions';
import type { LoginState, RecuperarSenhaState } from '../actions';

// ──────────────────────────────────────────────────────────────────────────────
// Shared icon primitives (inline SVG to avoid external deps)
// ──────────────────────────────────────────────────────────────────────────────

function IconGraduation({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function IconEye({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEyeOff({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function IconAlert({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconSpinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      style={{ animation: 'spin 0.7s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function IconLock({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconArrowRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconCheckCircle({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Toast
// ──────────────────────────────────────────────────────────────────────────────

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: 'var(--ink)',
        color: '#fff',
        padding: '10px 18px',
        borderRadius: 10,
        fontSize: 13.5,
        fontWeight: 500,
        boxShadow: 'var(--sh-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        whiteSpace: 'nowrap',
        maxWidth: 'calc(100vw - 48px)',
        animation: 'fadeIn 0.18s ease',
      }}
    >
      <IconCheckCircle size={16} />
      {message}
      <button
        type="button"
        onClick={onClose}
        style={{
          marginLeft: 8,
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.6)',
          cursor: 'pointer',
          padding: 0,
          fontSize: 16,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// EsqueciSenhaModal — inline (not a separate route)
// ──────────────────────────────────────────────────────────────────────────────

function EsqueciSenhaModal({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: (email: string) => void;
}) {
  const [state, formAction, isPending] = useActionState<RecuperarSenhaState, FormData>(
    recuperarSenhaAction,
    {},
  );
  const [emailValue, setEmailValue] = useState('');

  // When the server action returns success, notify the parent
  useEffect(() => {
    if (state.success) {
      onSent(emailValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="fade-in"
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--r-lg)',
          width: '100%',
          maxWidth: 420,
          boxShadow: 'var(--sh-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 22px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--r-sm)',
              background: 'var(--blue-50)',
              color: 'var(--blue)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <IconLock size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>
              Recuperar senha
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
              Enviaremos um link de redefinição para o seu e-mail
            </div>
          </div>
        </div>

        {/* Body */}
        <form action={formAction} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>
              E-mail cadastrado
            </label>
            <input
              className="input"
              type="email"
              name="email"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              placeholder="voce@escola.com"
              autoFocus
              required
              style={{
                width: '100%',
                height: 40,
                padding: '0 12px',
                border: '1px solid var(--line-2)',
                borderRadius: 'var(--r)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>

          {state.error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: 'var(--red-text)',
                background: 'var(--red-bg)',
                border: '1px solid var(--red-border)',
                padding: '9px 12px',
                borderRadius: 9,
              }}
            >
              <IconAlert size={16} />
              {state.error}
            </div>
          )}

          {/* Footer actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              paddingTop: 4,
              borderTop: '1px solid var(--line)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                height: 38,
                padding: '0 16px',
                border: '1px solid var(--line-2)',
                borderRadius: 'var(--r)',
                background: 'transparent',
                color: 'var(--ink-2)',
                fontSize: 13.5,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!emailValue.trim() || isPending}
              style={{
                height: 38,
                padding: '0 16px',
                border: 'none',
                borderRadius: 'var(--r)',
                background: 'var(--blue)',
                color: '#fff',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: isPending || !emailValue.trim() ? 'not-allowed' : 'pointer',
                opacity: !emailValue.trim() ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              {isPending ? (
                <><IconSpinner size={15} />Enviando…</>
              ) : (
                <><IconArrowRight size={15} />Enviar link</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Shared shell
// ──────────────────────────────────────────────────────────────────────────────

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        overflowY: 'auto',
      }}
    >
      <div
        className="fade-in"
        style={{
          width: '100%',
          maxWidth: 380,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Brand mark */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            marginBottom: 26,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'var(--blue)',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 4px 12px rgba(37,99,235,.28)',
              color: '#fff',
            }}
          >
            <IconGraduation size={24} />
          </div>
          <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.01em' }}>
              Smart Talk
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--muted-2)',
                marginTop: 3,
                fontWeight: 500,
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
              }}
            >
              Sistema interno
            </div>
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            width: '100%',
            padding: 30,
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-lg)',
            boxShadow: 'var(--sh)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// LoginPageInner — wrapped in Suspense because it uses useSearchParams
// ──────────────────────────────────────────────────────────────────────────────

function LoginPageInner() {
  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  const [showSenha, setShowSenha] = useState(false);
  const [esqueciOpen, setEsqueciOpen] = useState(false);
  const searchParams = useSearchParams();

  const [toast, setToast] = useState(() =>
    searchParams.get('redefinida') === '1'
      ? 'Senha redefinida com sucesso. Faça login.'
      : ''
  );

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .login-input {
          width: 100%;
          height: 40px;
          padding: 0 12px;
          border: 1px solid var(--line-2);
          border-radius: var(--r);
          background: var(--surface);
          color: var(--ink);
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s;
        }
        .login-input:focus {
          border-color: var(--blue);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
        }
      `}</style>

      <AuthShell>
        {/* Heading */}
        <div style={{ marginBottom: 22, textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em' }}>
            Entrar
          </h1>
          <p style={{ margin: '5px 0 0', color: 'var(--muted)', fontSize: 13.5 }}>
            Acesse o painel da escola.
          </p>
        </div>

        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>
              E-mail
            </label>
            <input
              className="login-input"
              type="email"
              name="email"
              placeholder="voce@escola.com"
              autoFocus
              autoComplete="email"
            />
          </div>

          {/* Senha */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>
                Senha
              </label>
              <button
                type="button"
                onClick={() => setEsqueciOpen(true)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--blue)',
                  fontWeight: 500,
                  fontSize: 12.5,
                  cursor: 'pointer',
                  padding: 0,
                  height: 20,
                }}
              >
                Esqueci minha senha
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                className="login-input"
                style={{ paddingRight: 40 }}
                type={showSenha ? 'text' : 'password'}
                name="password"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowSenha((s) => !s)}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--muted-2)',
                  display: 'grid',
                  placeItems: 'center',
                  padding: 5,
                  cursor: 'pointer',
                }}
                aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showSenha ? <IconEyeOff size={17} /> : <IconEye size={17} />}
              </button>
            </div>
          </div>

          {/* Erro */}
          {state.error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: 'var(--red-text)',
                background: 'var(--red-bg)',
                border: '1px solid var(--red-border)',
                padding: '9px 12px',
                borderRadius: 9,
              }}
            >
              <IconAlert size={16} />
              {state.error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            style={{
              height: 42,
              marginTop: 2,
              border: 'none',
              borderRadius: 'var(--r)',
              background: 'var(--blue)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: isPending ? 'not-allowed' : 'pointer',
              opacity: isPending ? 0.8 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {isPending ? (
              <><IconSpinner size={16} />Entrando…</>
            ) : (
              'Entrar'
            )}
          </button>
        </form>
      </AuthShell>

      {/* EsqueciSenhaModal — montado somente quando aberto; key força re-mount ao reabrir */}
      {esqueciOpen && (
        <EsqueciSenhaModal
          key="esqueci-modal"
          onClose={() => setEsqueciOpen(false)}
          onSent={(email) => {
            setEsqueciOpen(false);
            setToast(`Link de recuperação enviado para ${email}. Verifique sua caixa de entrada.`);
          }}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// LoginPage — default export com Suspense (exigido pelo useSearchParams)
// ──────────────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
