"use client";

import { useActionState, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { atualizarDadosAction, trocarSenhaAction } from "@/app/(app)/conta/actions";
import type { ActionResult } from "@/app/(app)/conta/actions";
import type { ContaPerfil } from "@/app/(app)/conta/page";

// ─────────────────────────────────────────────────────────────────────────────
// Ícones
// ─────────────────────────────────────────────────────────────────────────────

function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconEye({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEyeOff({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function IconCheck({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconAlertCircle({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconSpinner({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ animation: "spin 0.7s linear infinite" }}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SenhaChecklist — validação em tempo real (mesmo padrão de primeiro-acesso)
// ─────────────────────────────────────────────────────────────────────────────

function SenhaChecklist({ senha }: { senha: string }) {
  const rules = [
    { id: "len", label: "Mínimo 8 caracteres", ok: senha.length >= 8 },
    { id: "upper", label: "1 letra maiúscula", ok: /[A-Z]/.test(senha) },
    { id: "num", label: "1 número", ok: /[0-9]/.test(senha) },
  ];

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "13px 14px",
        background: "var(--surface-2)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 9 }}>
        Sua senha deve conter:
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rules.map((r) => (
          <div
            key={r.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: 12.5,
              color: r.ok ? "var(--green-text)" : "var(--muted)",
              transition: "color 0.15s",
            }}
          >
            <span
              style={{
                width: 17,
                height: 17,
                borderRadius: 99,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                background: r.ok ? "var(--green)" : "var(--line-2)",
                color: "#fff",
                transition: "background 0.15s",
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

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface MinhaContaClientProps {
  perfil: ContaPerfil;
}

const INITIAL_STATE: ActionResult = { ok: false };

// ─────────────────────────────────────────────────────────────────────────────
// MinhaContaClient
// ─────────────────────────────────────────────────────────────────────────────

export default function MinhaContaClient({ perfil }: MinhaContaClientProps) {
  const { toast } = useToast();

  // ── State declarations first — antes de useActionState para evitar TDZ ──────
  const [nome, setNome] = useState(() => perfil.nome);
  const [email, setEmail] = useState(() => perfil.email);
  const [telefone, setTelefone] = useState(() => perfil.telefone ?? "");

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);

  // ── Formulário de dados pessoais ────────────────────────────────────────────
  const [dadosState, dadosFormAction, isDadosPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      const result = await atualizarDadosAction(prev, formData);
      if (result.ok) {
        toast("Alterações salvas.", "ok");
      }
      return result;
    },
    INITIAL_STATE
  );

  // ── Formulário de senha ─────────────────────────────────────────────────────
  const [senhaState, senhaFormAction, isSenhaPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      const result = await trocarSenhaAction(prev, formData);
      if (result.ok) {
        toast("Alterações salvas.", "ok");
        setSenhaAtual("");
        setNovaSenha("");
        setConfirmarSenha("");
      }
      return result;
    },
    INITIAL_STATE
  );

  const senhaOk =
    novaSenha.length >= 8 && /[A-Z]/.test(novaSenha) && /[0-9]/.test(novaSenha);
  const senhasMatch = novaSenha.length > 0 && novaSenha === confirmarSenha;
  const senhasMismatch = confirmarSenha.length > 0 && !senhasMatch;

  const isProfessor = perfil.perfil === "Professor";

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .conta-input {
          width: 100%;
          height: 40px;
          padding: 0 12px;
          border: 1px solid var(--line-2);
          border-radius: var(--r);
          background: var(--surface);
          color: var(--ink);
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }
        .conta-input:focus {
          border-color: var(--blue);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
        }
        .conta-input:disabled {
          background: var(--surface-2);
          color: var(--muted);
          cursor: not-allowed;
        }
      `}</style>

      <div
        style={{
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          maxWidth: 560,
        }}
      >
        {/* Page header */}
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "var(--ink)",
            }}
          >
            Minha Conta
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "var(--muted)" }}>
            {perfil.perfil}
          </p>
        </div>

        {/* ── Card: Dados Pessoais ─────────────────────────────────────────── */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg)",
            padding: "20px 22px",
          }}
        >
          {/* Card header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 18,
              paddingBottom: 14,
              borderBottom: "1px solid var(--line)",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "var(--hover)",
                display: "grid",
                placeItems: "center",
                color: "var(--ink-2)",
              }}
            >
              <IconUser />
            </div>
            <span
              style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}
            >
              Dados Pessoais
            </span>
          </div>

          <form
            action={dadosFormAction}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {/* Nome */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label
                htmlFor="nome"
                style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}
              >
                Nome completo
              </label>
              <input
                id="nome"
                className="conta-input"
                type="text"
                name="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                required
              />
            </div>

            {/* E-mail */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label
                htmlFor="email"
                style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}
              >
                E-mail
              </label>
              <input
                id="email"
                className="conta-input"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
              <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
                Ao alterar, você receberá um e-mail de confirmação.
              </span>
            </div>

            {/* Telefone — apenas Professor */}
            {isProfessor && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label
                  htmlFor="telefone"
                  style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}
                >
                  Telefone
                </label>
                <input
                  id="telefone"
                  className="conta-input"
                  type="text"
                  name="telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
            )}

            {/* Erro */}
            {dadosState.error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "var(--red-text)",
                  background: "var(--red-bg)",
                  border: "1px solid var(--red-border)",
                  padding: "10px 14px",
                  borderRadius: "var(--r)",
                }}
              >
                <IconAlertCircle size={15} />
                {dadosState.error}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={isDadosPending}
                style={{
                  height: 38,
                  padding: "0 18px",
                  border: "none",
                  borderRadius: "var(--r)",
                  background: "var(--blue)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isDadosPending ? "not-allowed" : "pointer",
                  opacity: isDadosPending ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {isDadosPending ? (
                  <>
                    <IconSpinner size={14} />
                    Salvando…
                  </>
                ) : (
                  "Salvar alterações"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ── Card: Segurança ──────────────────────────────────────────────── */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-lg)",
            padding: "20px 22px",
          }}
        >
          {/* Card header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 18,
              paddingBottom: 14,
              borderBottom: "1px solid var(--line)",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: "var(--hover)",
                display: "grid",
                placeItems: "center",
                color: "var(--ink-2)",
              }}
            >
              <IconLock />
            </div>
            <span
              style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}
            >
              Segurança
            </span>
          </div>

          <form
            action={senhaFormAction}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            {/* Senha atual */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label
                htmlFor="senha_atual"
                style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}
              >
                Senha atual
              </label>
              <input
                id="senha_atual"
                className="conta-input"
                type={showSenha ? "text" : "password"}
                name="senha_atual"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                placeholder="Senha atual"
                autoComplete="current-password"
              />
            </div>

            {/* Nova senha */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label
                htmlFor="nova_senha"
                style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}
              >
                Nova senha
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="nova_senha"
                  className="conta-input"
                  style={{ paddingRight: 40 }}
                  type={showSenha ? "text" : "password"}
                  name="nova_senha"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Nova senha"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha((s) => !s)}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    border: "none",
                    background: "transparent",
                    color: "var(--muted-2)",
                    display: "grid",
                    placeItems: "center",
                    padding: 5,
                    cursor: "pointer",
                  }}
                  aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showSenha ? <IconEyeOff size={17} /> : <IconEye size={17} />}
                </button>
              </div>
            </div>

            {/* Confirmar senha */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label
                htmlFor="confirmar_senha"
                style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}
              >
                Confirmar nova senha
              </label>
              <input
                id="confirmar_senha"
                className="conta-input"
                type={showSenha ? "text" : "password"}
                name="confirmar_senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
              />
              {senhasMismatch && (
                <span
                  style={{
                    fontSize: 12.5,
                    color: "var(--red-text)",
                    marginTop: 1,
                  }}
                >
                  As senhas não coincidem.
                </span>
              )}
            </div>

            {/* Checklist visual — apenas quando nova senha tem algum conteúdo */}
            {novaSenha.length > 0 && <SenhaChecklist senha={novaSenha} />}

            {/* Erro */}
            {senhaState.error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "var(--red-text)",
                  background: "var(--red-bg)",
                  border: "1px solid var(--red-border)",
                  padding: "10px 14px",
                  borderRadius: "var(--r)",
                }}
              >
                <IconAlertCircle size={15} />
                {senhaState.error}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={
                  isSenhaPending ||
                  !senhaAtual ||
                  !senhaOk ||
                  !senhasMatch
                }
                style={{
                  height: 38,
                  padding: "0 18px",
                  border: "none",
                  borderRadius: "var(--r)",
                  background: "var(--blue)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor:
                    isSenhaPending || !senhaAtual || !senhaOk || !senhasMatch
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    isSenhaPending || !senhaAtual || !senhaOk || !senhasMatch
                      ? 0.5
                      : 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {isSenhaPending ? (
                  <>
                    <IconSpinner size={14} />
                    Salvando…
                  </>
                ) : (
                  "Trocar senha"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
