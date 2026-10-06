"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

/**
 * Toast — sistema de notificações empilhadas.
 * 3 tipos: ok (verde), warn (âmbar), err (vermelho).
 * Auto-dismiss em 4 segundos.
 * Replicado de ui.jsx → ToastProvider / useToast.
 *
 * Uso:
 *   1. Adicionar <ToastContainer /> em app/(app)/layout.tsx
 *   2. Chamar const { toast } = useToast(); toast("mensagem", "ok")
 */

type ToastKind = "ok" | "warn" | "err";

interface ToastItem {
  id: string;
  msg: string;
  kind: ToastKind;
}

interface ToastContextValue {
  toast: (msg: string, kind?: ToastKind) => void;
}

const ToastCtx = createContext<ToastContextValue | null>(null);

const KIND_ICON: Record<ToastKind, ReactNode> = {
  ok: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#86EFAC" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  warn: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FCD34D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  err: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FCA5A5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
};

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((msg: string, kind: ToastKind = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastCtx.Provider>
  );
}

interface ToastContainerProps {
  toasts: ToastItem[];
}

function ToastContainer({ toasts }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: 380,
        width: "calc(100vw - 48px)",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="fade-in"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "13px 16px",
            background: "#1E293B",
            borderRadius: "var(--r-lg)",
            color: "#F1F5F9",
            fontSize: 13.5,
            fontWeight: 500,
            boxShadow: "var(--sh-lg)",
          }}
        >
          <span style={{ flexShrink: 0, display: "flex" }}>
            {KIND_ICON[t.kind]}
          </span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/**
 * Hook para disparar toasts.
 * Deve ser usado dentro de um descendente de ToastProvider.
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    throw new Error("useToast deve ser usado dentro de <ToastProvider>");
  }
  return ctx;
}

export default ToastProvider;
