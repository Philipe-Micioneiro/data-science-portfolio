"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { ToastProvider } from "@/components/ui/Toast";
import type { ReactNode } from "react";

/**
 * AppShell — componente client que compõe Sidebar + Topbar + conteúdo.
 * Gerencia estado compartilhado de mobile sidebar entre Topbar e Sidebar.
 * ToastProvider envolvendo o conteúdo para permitir toasts em qualquer página.
 */

interface AppShellProps {
  children: ReactNode;
  userName: string;
  userEmail: string;
  userPerfil: string;
}

export default function AppShell({
  children,
  userName,
  userEmail,
  userPerfil,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ToastProvider>
      <div
        style={{
          display: "flex",
          height: "100%",
          background: "var(--bg)",
          overflow: "hidden",
        }}
      >
        <Sidebar
          perfil={userPerfil}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minWidth: 0,
            height: "100%",
            overflow: "hidden",
          }}
        >
          <Topbar
            userName={userName}
            userEmail={userEmail}
            userPerfil={userPerfil}
            onToggleSidebar={() => setMobileOpen((o) => !o)}
          />
          <main
            style={{
              flex: 1,
              overflowY: "auto",
              background: "var(--bg)",
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
