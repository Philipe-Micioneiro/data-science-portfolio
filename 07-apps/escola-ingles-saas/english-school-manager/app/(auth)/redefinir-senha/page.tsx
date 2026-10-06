import { createClient } from '@/lib/supabase/server';
import { RedefinirSenhaForm } from './form';

/**
 * Server Component — troca o code PKCE por sessão antes de renderizar o formulário.
 *
 * O Supabase envia o link de recuperação como:
 *   /redefinir-senha?code=<pkce_code>
 *
 * Chamamos exchangeCodeForSession() aqui no servidor para que o cookie de sessão
 * seja gravado antes de enviar qualquer HTML ao cliente. Se o code for inválido
 * ou ausente, passamos tokenInvalido=true para o Client Component exibir a
 * TokenExpiradoScreen.
 */
export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = typeof params.code === 'string' ? params.code : null;

  let tokenInvalido = false;

  if (!code) {
    tokenInvalido = true;
  } else {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      tokenInvalido = true;
    }
  }

  return <RedefinirSenhaForm tokenInvalido={tokenInvalido} />;
}
