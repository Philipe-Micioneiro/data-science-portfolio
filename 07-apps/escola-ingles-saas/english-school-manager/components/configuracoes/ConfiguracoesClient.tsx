"use client";

import { useActionState, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { salvarConfigAction } from "@/app/(app)/configuracoes/actions";
import type { SchoolConfig } from "@/app/(app)/configuracoes/page";
import type { ActionResult } from "@/app/(app)/configuracoes/actions";

// ─────────────────────────────────────────────────────────────────────────────
// Ícones
// ─────────────────────────────────────────────────────────────────────────────

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93l-1.41 1.41M4.93 19.07l1.41-1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41" />
      <path d="M12 1v2M12 21v2M1 12h2M21 12h2" />
    </svg>
  );
}

function IconCheck({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
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

function IconAlertCircle({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle — componente visual inline
// ─────────────────────────────────────────────────────────────────────────────

interface ToggleProps {
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

function Toggle({ name, checked, onChange, label, description }: ToggleProps) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        cursor: "pointer",
        padding: "14px 0",
      }}
    >
      {/* Hidden checkbox for form submission */}
      <input
        type="checkbox"
        name={name}
        value="on"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Visual toggle track */}
      <div
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onChange(!checked);
          }
        }}
        style={{
          position: "relative",
          width: 44,
          height: 24,
          borderRadius: 99,
          background: checked ? "var(--blue)" : "var(--line-2)",
          transition: "background 0.2s",
          flexShrink: 0,
          marginTop: 2,
          cursor: "pointer",
          outline: "none",
        }}
      >
        {/* Thumb */}
        <div
          style={{
            position: "absolute",
            top: 3,
            left: checked ? "calc(100% - 21px)" : 3,
            width: 18,
            height: 18,
            borderRadius: 99,
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transition: "left 0.2s",
            display: "grid",
            placeItems: "center",
          }}
        >
          {checked && (
            <div style={{ color: "var(--blue)" }}>
              <IconCheck size={10} />
            </div>
          )}
        </div>
      </div>

      {/* Label + description */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--ink)",
            lineHeight: 1.3,
          }}
        >
          {label}
        </div>
        {description && (
          <div
            style={{
              fontSize: 12.5,
              color: "var(--muted)",
              marginTop: 3,
              lineHeight: 1.4,
            }}
          >
            {description}
          </div>
        )}
      </div>
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ConfiguracoesClient
// ─────────────────────────────────────────────────────────────────────────────

interface ConfiguracoesClientProps {
  config: SchoolConfig;
}

const INITIAL_STATE: ActionResult = { ok: false };

export default function ConfiguracoesClient({ config }: ConfiguracoesClientProps) {
  const { toast } = useToast();

  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      // Inject toggle values as form fields (checkboxes only submit "on" when checked)
      // We need to handle this at the form level instead
      const result = await salvarConfigAction(prev, formData);
      if (result.ok) {
        toast("Configurações salvas com sucesso.", "ok");
      }
      return result;
    },
    INITIAL_STATE
  );

  // Local state for controlled form fields
  const [nomeInstituicao, setNomeInstituicao] = useState(() => config.nome_instituicao);
  const [diasUteis, setDiasUteis] = useState(() => String(config.dias_uteis_atraso));
  const [diasInativacao, setDiasInativacao] = useState(
    () => String(config.dias_inativacao)
  );
  const [comprovanteObrigatorio, setComprovanteObrigatorio] = useState(
    () => config.comprovante_obrigatorio
  );
  const [notificarRejeicao, setNotificarRejeicao] = useState(
    () => config.notificar_rejeicao
  );

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .cfg-input {
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
        }
        .cfg-input:focus {
          border-color: var(--blue);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
        }
        .cfg-input-num {
          width: 100px;
          height: 40px;
          padding: 0 12px;
          border: 1px solid var(--line-2);
          border-radius: var(--r);
          background: var(--surface);
          color: var(--ink);
          font-size: 14px;
          outline: none;
          text-align: center;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .cfg-input-num:focus {
          border-color: var(--blue);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
        }
      `}</style>

      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 680 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "var(--hover)",
              display: "grid",
              placeItems: "center",
              color: "var(--ink-2)",
            }}
          >
            <IconSettings />
          </div>
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
              Configurações
            </h1>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 1 }}>
              Parâmetros operacionais da escola
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Campos ocultos para os toggles (necessário pois checkboxes não são enviados quando desmarcados) */}
          <input type="hidden" name="comprovante_obrigatorio" value={comprovanteObrigatorio ? "on" : "off"} />
          <input type="hidden" name="notificar_rejeicao" value={notificarRejeicao ? "on" : "off"} />

          {/* Card: Dados da Instituição */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-lg)",
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Dados da Instituição
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label
                htmlFor="nome_instituicao"
                style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}
              >
                Nome da Instituição
              </label>
              <input
                id="nome_instituicao"
                className="cfg-input"
                type="text"
                name="nome_instituicao"
                value={nomeInstituicao}
                onChange={(e) => setNomeInstituicao(e.target.value)}
                placeholder="Ex: Smart Talk"
                maxLength={120}
                required
              />
            </div>
          </div>

          {/* Card: Regras Financeiras */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-lg)",
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Regras Financeiras
            </div>

            {/* Dias úteis para atraso */}
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label
                    htmlFor="dias_uteis_atraso"
                    style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}
                  >
                    Dias úteis para marcar como Atrasado
                  </label>
                  <input
                    id="dias_uteis_atraso"
                    className="cfg-input-num"
                    type="number"
                    name="dias_uteis_atraso"
                    value={diasUteis}
                    onChange={(e) => setDiasUteis(e.target.value)}
                    min={1}
                    max={30}
                    required
                  />
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--muted)",
                    maxWidth: 340,
                    lineHeight: 1.5,
                    paddingTop: 20,
                  }}
                >
                  Número de dias úteis após o vencimento para que o pagamento seja marcado
                  como Atrasado. Mínimo: 1 · Máximo: 30.
                </div>
              </div>
            </div>

            {/* Dias para inativação */}
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label
                    htmlFor="dias_inativacao"
                    style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}
                  >
                    Dias em Atrasado para inativação automática
                  </label>
                  <input
                    id="dias_inativacao"
                    className="cfg-input-num"
                    type="number"
                    name="dias_inativacao"
                    value={diasInativacao}
                    onChange={(e) => setDiasInativacao(e.target.value)}
                    min={7}
                    max={90}
                    required
                  />
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--muted)",
                    maxWidth: 340,
                    lineHeight: 1.5,
                    paddingTop: 20,
                  }}
                >
                  Dias no status Atrasado antes da inativação automática pelo cron noturno.
                  Mínimo: 7 · Máximo: 90.
                </div>
              </div>
            </div>
          </div>

          {/* Card: Comportamento do Sistema */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-lg)",
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 4,
              }}
            >
              Comportamento do Sistema
            </div>

            <Toggle
              name="_comprovante_obrigatorio_toggle"
              checked={comprovanteObrigatorio}
              onChange={setComprovanteObrigatorio}
              label="Comprovante obrigatório"
              description="Exige anexo de comprovante ao registrar pagamento. Quando desativado, pagamentos podem ser registrados sem comprovante."
            />

            <div
              style={{
                height: 1,
                background: "var(--line)",
                margin: "0 0 4px",
              }}
            />

            <Toggle
              name="_notificar_rejeicao_toggle"
              checked={notificarRejeicao}
              onChange={setNotificarRejeicao}
              label="Notificar aluno ao rejeitar comprovante"
              description="Envia e-mail automático ao aluno quando um comprovante de pagamento é rejeitado pela equipe."
            />
          </div>

          {/* Erro */}
          {state.error && (
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
              {state.error}
            </div>
          )}

          {/* Submit */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={isPending}
              style={{
                height: 40,
                padding: "0 20px",
                border: "none",
                borderRadius: "var(--r)",
                background: "var(--blue)",
                color: "#fff",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {isPending ? (
                <>
                  <IconSpinner size={15} />
                  Salvando…
                </>
              ) : (
                "Salvar alterações"
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
