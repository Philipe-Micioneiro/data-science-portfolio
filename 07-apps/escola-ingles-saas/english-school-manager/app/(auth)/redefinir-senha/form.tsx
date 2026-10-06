'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { redefinirSenhaAction } from '../actions';
import type { RedefinirSenhaState } from '../actions';

// ──────────────────────────────────────────────────────────────────────────────
// Icon primitives
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

function IconCheck({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
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

function IconCheckCircle({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
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

function IconArrowRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function IconChevLeft({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
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
// SenhaChecklist — reutilizado de primeiro-acesso
// ──────────────────────────────────────────────────────────────────────────────

function SenhaChecklist({ senha }: { senha: string }) {
  const rules = [
    { id: 'len', label: 'Mínimo 8 caracteres', ok: senha.length >= 8 },
    { id: 'upper', label: '1 maiúscula', ok: /[A-Z]/.test(senha) },
    { id: 'lower', label: '1 minúscula', ok: /[a-z]/.test(senha) },
    { id: 'num', label: '1 número', ok: /[0-9]/.test(senha) },
  ];

  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: 10,
        padding: '13px 14px',
        background: 'var(--surface-2)',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 9 }}>
        Sua senha deve conter:
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
        {rules.map((r) => (
          <div
            key={r.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 12.5,
              color: r.ok ? 'var(--green-text)' : 'var(--muted)',
              transition: 'color 0.15s',
            }}
          >
            <span
              style={{
                width: 17,
                height: 17,
                borderRadius: 99,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                background: r.ok ? 'var(--green)' : 'var(--line-2)',
                color: '#fff',
                transition: 'background 0.15s',
              }}
            >
              <IconCheck size={11} />
            </span>
            {r.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// TokenExpiradoScreen
// ──────────────────────────────────────────────────────────────────────────────

function TokenExpiradoScreen({ onSolicitarNovo }: { onSolicitarNovo: () => void }) {
  return (
    <AuthShell>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'var(--red-bg)',
            color: 'var(--red-text)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <IconAlert size={24} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Link expirado</h2>
          <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 14 }}>
            Este link expirou ou já foi utilizado. Solicite um novo link de recuperação.
          </p>
        </div>
        <button
          type="button"
          onClick={onSolicitarNovo}
          style={{
            width: '100%',
            height: 42,
            border: 'none',
            borderRadius: 'var(--r)',
            background: 'var(--blue)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <IconArrowRight size={16} />
          Solicitar novo link
        </button>
      </div>
    </AuthShell>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// RedefinirSenhaForm
// ──────────────────────────────────────────────────────────────────────────────

export function RedefinirSenhaForm({ tokenInvalido }: { tokenInvalido: boolean }) {
  const router = useRouter();

  const [state, formAction, isPending] = useActionState<RedefinirSenhaState, FormData>(
    redefinirSenhaAction,
    {},
  );

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [show, setShow] = useState(false);

  const rules = [
    novaSenha.length >= 8,
    /[A-Z]/.test(novaSenha),
    /[a-z]/.test(novaSenha),
    /[0-9]/.test(novaSenha),
  ];
  const allOk = rules.every(Boolean);
  const match = novaSenha.length > 0 && novaSenha === confirmar;
  const canSubmit = allOk && match;

  const senhasMismatch = confirmar.length > 0 && !match;

  // If after submission the server says the token is invalid, show expired screen
  const isTokenInvalido = tokenInvalido || state.tokenInvalido;

  if (isTokenInvalido) {
    return <TokenExpiradoScreen onSolicitarNovo={() => router.push('/login')} />;
  }

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .rd-input {
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
        .rd-input:focus {
          border-color: var(--blue);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
        }
      `}</style>

      <AuthShell>
        {/* Back link */}
        <button
          type="button"
          onClick={() => router.push('/login')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            border: 'none',
            background: 'transparent',
            color: 'var(--muted)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            padding: '0 0 8px 0',
            marginBottom: 8,
            height: 24,
          }}
        >
          <IconChevLeft size={15} />
          Voltar ao login
        </button>

        {/* Heading */}
        <h1 style={{ margin: '0 0 6px', fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em' }}>
          Redefinir senha
        </h1>
        <p style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: 13.5 }}>
          Escolha uma nova senha para sua conta.
        </p>

        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {/* Nova senha */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>
              Nova senha
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="rd-input"
                style={{ paddingRight: 40 }}
                type={show ? 'text' : 'password'}
                name="novaSenha"
                placeholder="Crie uma nova senha"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                autoFocus
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
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
                aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {show ? <IconEyeOff size={17} /> : <IconEye size={17} />}
              </button>
            </div>
          </div>

          {/* Confirmar senha */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>
              Confirmar senha
            </label>
            <input
              className="rd-input"
              type={show ? 'text' : 'password'}
              name="confirmar"
              placeholder="Repita a nova senha"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              autoComplete="new-password"
            />
            {senhasMismatch && (
              <span style={{ fontSize: 12.5, color: 'var(--red-text)', marginTop: 2 }}>
                As senhas não coincidem.
              </span>
            )}
          </div>

          {/* Checklist visual */}
          <SenhaChecklist senha={novaSenha} />

          {/* Erro do servidor */}
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
            disabled={!canSubmit || isPending}
            style={{
              height: 42,
              marginTop: 2,
              border: 'none',
              borderRadius: 'var(--r)',
              background: 'var(--blue)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: (!canSubmit || isPending) ? 'not-allowed' : 'pointer',
              opacity: !canSubmit ? 0.5 : isPending ? 0.8 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {isPending ? (
              <><IconSpinner size={16} />Salvando…</>
            ) : (
              <><IconCheckCircle size={17} />Salvar nova senha</>
            )}
          </button>
        </form>
      </AuthShell>
    </>
  );
}
