"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Modal — fecha com ESC + click no overlay.
 * Trap focus dentro do modal (acessibilidade).
 * Animação fade-in via classe CSS global.
 * Renderiza via createPortal fora da hierarquia DOM.
 * Replicado de ui.jsx → Modal.
 */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  sub?: string;
  icon?: ReactNode;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZE_WIDTH: Record<string, number> = {
  sm: 400,
  md: 520,
  lg: 680,
  xl: 860,
};

const FOCUSABLE =
  'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({
  open,
  onClose,
  title,
  sub,
  icon,
  children,
  size = "md",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Fechar com ESC
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [open, onClose]);

  // Trap focus
  useEffect(() => {
    if (!open || !panelRef.current) return;

    // Foca o primeiro elemento focável ao abrir
    const focusables = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
    );
    if (focusables.length > 0) focusables[0].focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusableEls = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      );
      if (focusableEls.length === 0) return;
      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleTab);
    return () => window.removeEventListener("keydown", handleTab);
  }, [open]);

  // Bloquear scroll do body
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const width = SIZE_WIDTH[size] ?? SIZE_WIDTH.md;

  const content = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,.48)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "60px 16px 40px",
        zIndex: 200,
        overflowY: "auto",
      }}
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Modal"}
    >
      <div
        ref={panelRef}
        className="fade-in"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width,
          maxWidth: "100%",
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-xl)",
          boxShadow: "var(--sh-lg)",
          overflow: "hidden",
        }}
      >
        {title && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "18px 22px",
              borderBottom: "1px solid var(--line)",
            }}
          >
            {icon && (
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "var(--blue-50)",
                  color: "var(--blue)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                }}
              >
                {icon}
              </span>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 16.5, color: "var(--ink)" }}>
                {title}
              </div>
              {sub && (
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>
                  {sub}
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                display: "grid",
                placeItems: "center",
                border: "none",
                background: "transparent",
                borderRadius: 8,
                color: "var(--muted)",
                cursor: "pointer",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--hover)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
              aria-label="Fechar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
