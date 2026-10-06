/**
 * Auth group layout.
 * Rotas públicas: login, recuperar-senha, redefinir-senha, primeiro-acesso.
 * Sem Sidebar/Topbar — layout centrado.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex items-center justify-center" style={{ background: "var(--bg)" }}>
      {children}
    </div>
  );
}
