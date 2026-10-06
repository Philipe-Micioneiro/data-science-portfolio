import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (anteriormente Middleware) — Auth guard + redirect por perfil.
 * Renomeado de middleware.ts para proxy.ts conforme Next.js 16+ (ver AGENTS.md).
 *
 * Implementa a lógica completa de SPEC/02-middleware-autenticacao.md.
 */

/**
 * Rotas públicas — sem verificação de autenticação.
 */
const PUBLIC_ROUTES = ["/login", "/recuperar-senha", "/redefinir-senha"];

/**
 * Rota de primeiro acesso (troca de senha obrigatória).
 */
const PRIMEIRO_ACESSO_ROUTE = "/primeiro-acesso";

/**
 * Rotas exclusivas de Administrador.
 * Secretário e Professor são bloqueados e redirecionados para /dashboard.
 */
const ADMIN_ONLY_ROUTES = ["/usuarios", "/auditoria", "/configuracoes"];

/**
 * Rotas acessíveis para Admin e Secretário.
 * Professor é bloqueado (exceto /agenda, que o Professor acessa com restrições no componente).
 * Conforme SPEC/02 e decisão §0.3: /relatorios inclui Secretário.
 */
const ADMIN_SECRETARY_ROUTES = [
  "/alunos",
  "/professores",
  "/financeiro",
  "/financeiro-professores",
  "/validacoes",
  "/relatorios",
];

/**
 * Rotas que Professor pode acessar.
 * Baseado em NAV.Professor do design (layout.jsx).
 */
const PROFESSOR_ALLOWED_ROUTES = ["/dashboard", "/agenda", "/conta"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0. Rotas de API — têm auth própria (ex: CRON_SECRET nos crons) e nunca
  //    têm sessão de navegador (ex: Vercel Cron não manda cookie). Sem essa
  //    exclusão, o redirect de sessão abaixo bloqueia todo /api/cron/* —
  //    bug real encontrado em 09/08/2026: os crons nunca rodavam em produção.
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // 1. Rotas públicas — sem verificação
  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  if (isPublic) {
    return NextResponse.next();
  }

  // Criar response mutável para que @supabase/ssr possa atualizar cookies
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 2. Verificar sessão
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Buscar perfil do usuário na tabela users_profile
  const { data: profile } = await supabase
    .from("users_profile")
    .select("perfil, precisa_trocar_senha")
    .eq("id", session.user.id)
    .single();

  const perfil = profile?.perfil as string | undefined;
  const precisaTrocarSenha = profile?.precisa_trocar_senha as boolean | undefined;

  // 4. Redirecionar para primeiro acesso se senha temporária não foi trocada
  if (precisaTrocarSenha && pathname !== PRIMEIRO_ACESSO_ROUTE) {
    return NextResponse.redirect(new URL(PRIMEIRO_ACESSO_ROUTE, request.url));
  }

  // Se está em /primeiro-acesso e não precisa trocar senha, redirecionar para dashboard
  if (!precisaTrocarSenha && pathname === PRIMEIRO_ACESSO_ROUTE) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 5. Verificar permissão por perfil
  if (perfil) {
    const normalizedPath = "/" + pathname.split("/").filter(Boolean)[0];

    // Admin-only routes: bloquear Secretário e Professor
    const isAdminOnly = ADMIN_ONLY_ROUTES.some(
      (route) => normalizedPath === route
    );
    if (isAdminOnly && perfil !== "Administrador") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Admin+Secretário routes: bloquear Professor
    const isAdminSecretary = ADMIN_SECRETARY_ROUTES.some(
      (route) => normalizedPath === route
    );
    if (isAdminSecretary && perfil === "Professor") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Professor: permitir apenas /dashboard, /agenda, /conta
    if (perfil === "Professor") {
      const isProfessorAllowed = PROFESSOR_ALLOWED_ROUTES.some(
        (route) => normalizedPath === route
      );
      if (!isProfessorAllowed) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Corresponde a todas as rotas exceto:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
