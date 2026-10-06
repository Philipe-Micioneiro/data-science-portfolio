'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { insertAuditLog } from '@/lib/audit';

// ──────────────────────────────────────────────────────────────────────────────
// F1A.1 — Login
// ──────────────────────────────────────────────────────────────────────────────

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = (formData.get('email') as string | null)?.trim() ?? '';
  const password = (formData.get('password') as string | null) ?? '';

  if (!email) return { error: 'Informe o e-mail.' };
  if (!password) return { error: 'Informe a senha.' };

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    // Supabase returns "Invalid login credentials" for wrong email/password.
    // Translate to Portuguese for the end user.
    if (error?.message?.toLowerCase().includes('invalid login')) {
      return { error: 'E-mail ou senha incorretos.' };
    }
    return { error: error?.message ?? 'Não foi possível entrar. Tente novamente.' };
  }

  // Fetch profile first so we can pass the real perfil to the audit log.
  const { data: profile } = await supabase
    .from('users_profile')
    .select('precisa_trocar_senha, perfil')
    .eq('id', data.user.id)
    .single();

  // Audit — fire-and-forget; silently swallows errors internally.
  await insertAuditLog({
    usuarioId: data.user.id,
    perfil: profile?.perfil ?? 'Sistema',
    acao: 'Login realizado',
    entidade: 'Usuário',
    entidadeId: data.user.id,
  });

  if (profile?.precisa_trocar_senha) {
    redirect('/primeiro-acesso');
  }

  redirect('/dashboard');
}

// ──────────────────────────────────────────────────────────────────────────────
// F1A.2 — Primeiro Acesso
// ──────────────────────────────────────────────────────────────────────────────

export type PrimeiroAcessoState = {
  error?: string;
};

export async function primeiroAcessoAction(
  _prev: PrimeiroAcessoState,
  formData: FormData,
): Promise<PrimeiroAcessoState> {
  const senhaTemp = (formData.get('senhaTemp') as string | null) ?? '';
  const novaSenha = (formData.get('novaSenha') as string | null) ?? '';
  const confirmar = (formData.get('confirmar') as string | null) ?? '';

  // Server-side validation mirrors the client checklist
  if (!senhaTemp) return { error: 'Informe a senha temporária.' };
  if (novaSenha.length < 8) return { error: 'A nova senha deve ter ao menos 8 caracteres.' };
  if (!/[A-Z]/.test(novaSenha)) return { error: 'A nova senha deve conter ao menos 1 letra maiúscula.' };
  if (!/[a-z]/.test(novaSenha)) return { error: 'A nova senha deve conter ao menos 1 letra minúscula.' };
  if (!/[0-9]/.test(novaSenha)) return { error: 'A nova senha deve conter ao menos 1 número.' };
  if (novaSenha !== confirmar) return { error: 'As senhas não coincidem.' };

  const supabase = await createClient();

  // Retrieve the currently signed-in user to know their email.
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: 'Sessão expirada. Faça login novamente.' };
  }

  // Validate the temporary password by re-authenticating.
  const { error: reAuthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: senhaTemp,
  });

  if (reAuthError) {
    return { error: 'Senha temporária incorreta.' };
  }

  // Update to the new definitive password.
  const { error: updateError } = await supabase.auth.updateUser({
    password: novaSenha,
  });

  if (updateError) {
    return { error: updateError.message ?? 'Não foi possível atualizar a senha.' };
  }

  // Mark the profile so the user is no longer redirected here.
  await supabase
    .from('users_profile')
    .update({ precisa_trocar_senha: false })
    .eq('id', user.id);

  await insertAuditLog({
    usuarioId: user.id,
    perfil: 'Sistema',
    acao: 'Troca de senha no primeiro acesso',
    entidade: 'Usuário',
    entidadeId: user.id,
  });

  redirect('/dashboard');
}

// ──────────────────────────────────────────────────────────────────────────────
// F1A.3 — Recuperação de senha — solicitar link
// ──────────────────────────────────────────────────────────────────────────────

export type RecuperarSenhaState = {
  success?: boolean;
  error?: string;
};

export async function recuperarSenhaAction(
  _prev: RecuperarSenhaState,
  formData: FormData,
): Promise<RecuperarSenhaState> {
  const email = (formData.get('email') as string | null)?.trim() ?? '';

  if (!email) return { error: 'Informe o e-mail.' };

  const supabase = await createClient();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/redefinir-senha`,
  });

  if (error) {
    return { error: error.message ?? 'Não foi possível enviar o link.' };
  }

  // Audit — non-blocking
  await insertAuditLog({
    usuarioId: null,
    perfil: 'Sistema',
    acao: 'Recuperação de senha solicitada',
    entidade: 'Usuário',
  });

  return { success: true };
}

// ──────────────────────────────────────────────────────────────────────────────
// F1A.3 — Redefinir senha
// ──────────────────────────────────────────────────────────────────────────────

export type RedefinirSenhaState = {
  error?: string;
  tokenInvalido?: boolean;
};

export async function redefinirSenhaAction(
  _prev: RedefinirSenhaState,
  formData: FormData,
): Promise<RedefinirSenhaState> {
  const novaSenha = (formData.get('novaSenha') as string | null) ?? '';
  const confirmar = (formData.get('confirmar') as string | null) ?? '';

  if (novaSenha.length < 8) return { error: 'A senha deve ter ao menos 8 caracteres.' };
  if (!/[A-Z]/.test(novaSenha)) return { error: 'A senha deve conter ao menos 1 letra maiúscula.' };
  if (!/[a-z]/.test(novaSenha)) return { error: 'A senha deve conter ao menos 1 letra minúscula.' };
  if (!/[0-9]/.test(novaSenha)) return { error: 'A senha deve conter ao menos 1 número.' };
  if (novaSenha !== confirmar) return { error: 'As senhas não coincidem.' };

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { tokenInvalido: true };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: novaSenha,
  });

  if (updateError) {
    return { error: updateError.message ?? 'Não foi possível atualizar a senha.' };
  }

  await insertAuditLog({
    usuarioId: user.id,
    perfil: 'Sistema',
    acao: 'Senha redefinida via recuperação',
    entidade: 'Usuário',
    entidadeId: user.id,
  });

  redirect('/login?redefinida=1');
}
