"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * SearchInput — input com ícone lupa e debounce de 300ms no onChange.
 * Componente totalmente controlado: exibe `value` do pai e chama `onChange`
 * com debounce. Sem estado local espelhando o prop (evita react-hooks/set-state-in-effect).
 */

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: number | string;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = "Buscar…",
  width = 280,
}: SearchInputProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpa timer ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChange(v), 300);
    },
    [onChange],
  );

  return (
    <div style={{ position: "relative", width }}>
      <span
        style={{
          position: "absolute",
          left: 11,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--muted-2)",
          pointerEvents: "none",
          display: "flex",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        style={{
          width: "100%",
          height: 38,
          paddingLeft: 34,
          paddingRight: 12,
          border: "1px solid var(--line-2)",
          borderRadius: "var(--r)",
          background: "var(--surface)",
          color: "var(--ink)",
          fontSize: 13.5,
          outline: "none",
          boxShadow: "var(--sh-sm)",
          transition: "border-color .12s, box-shadow .12s",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--blue)";
          e.currentTarget.style.boxShadow = "0 0 0 3px var(--blue-100)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--line-2)";
          e.currentTarget.style.boxShadow = "var(--sh-sm)";
        }}
      />
    </div>
  );
}
