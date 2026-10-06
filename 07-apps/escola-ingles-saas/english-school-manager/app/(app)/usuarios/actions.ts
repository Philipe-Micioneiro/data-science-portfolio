'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { insertAuditLog } from '@/lib/audit';
import { sendEmail } from '@/lib/email';

// ─────────────────────────────────────────────────────────────────────────────
// Algoritmo de senha temporária — SPEC §0.6
// ─────────────────────────────────────────────────────────────────────────────
function gerarSenhaTemp(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sem I, O
  const lower = 'abcdefghjkmnpqrstuvwxyz';   // sem i, l, o
  const digits = '23456789';                  // sem 0, 1
  const rand = (s: string) => s[Math.floor(Math.random() * s.length)];
  const suffix = Array.from({ length: 4 }, () => rand(upper + lower + digits)).join('');
  return `Temp#${new Date().getFullYear()}${rand(upper)}${rand(digits)}${suffix}`;
  // Exemplo: Temp#2026A7mKp3
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos compartilhados
// ─────────────────────────────────────────────────────────────────────────────

export type ActionResult<T = undefined> =
  | { ok: true; data: T; emailFailed?: boolean }
  | { ok: false; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// F2B.2 — Criar Usuário
// ─────────────────────────────────────────────────────────────────────────────

export interface CriarUsuarioInput {
  nome: string;
  email: string;
  perfil: 'Secretário' | 'Professor';
}

export interface CriarUsuarioData {
  senhaTemp: string;
  usuarioId: string;
}

export async function criarUsuarioAction(
  input: CriarUsuarioInput,
): Promise<ActionResult<CriarUsuarioData>> {
  // ── Validações server-side ───────────────────────────────────────────────
  const nome = input.nome.trim();
  const email = input.email.trim().toLowerCase();
  const perfil = input.perfil;

  if (!nome) return { ok: false, error: 'Nome é obrigatório.' };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'E-mail inválido.' };
  }
  if (!['Secretário', 'Professor'].includes(perfil)) {
    return { ok: false, error: 'Perfil inválido. Use Secretário ou Professor.' };
  }

  // ── Verificar sessão do admin que está executando a ação ─────────────────
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { ok: false, error: 'Sessão expirada.' };

  const { data: currentProfile } = await supabase
    .from('users_profile')
    .select('perfil, nome')
    .eq('id', currentUser.id)
    .single();

  if (currentProfile?.perfil !== 'Administrador') {
    return { ok: false, error: 'Apenas administradores podem criar usuários.' };
  }

  // ── Verificar unicidade de email via admin client ─────────────────────────
  const adminClient = createAdminClient();

  const { data: existingUsers, error: listError } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    return { ok: false, error: 'Erro ao verificar emails existentes.' };
  }
  const emailTaken = existingUsers.users.some(
    (u) => u.email?.toLowerCase() === email,
  );
  if (emailTaken) {
    return { ok: false, error: 'Este e-mail já está em uso.' };
  }

  // ── Gerar senha temporária ────────────────────────────────────────────────
  const senhaTemp = gerarSenhaTemp();

  // ── Criar usuário no Auth ─────────────────────────────────────────────────
  const { data: newAuthUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: senhaTemp,
    email_confirm: true,
  });

  if (createError || !newAuthUser.user) {
    return { ok: false, error: createError?.message ?? 'Erro ao criar usuário no Auth.' };
  }

  const novoId = newAuthUser.user.id;

  // ── INSERT users_profile ──────────────────────────────────────────────────
  const { error: profileError } = await adminClient
    .from('users_profile')
    .insert({
      id: novoId,
      nome,
      email,
      perfil,
      status: 'Ativo',
      precisa_trocar_senha: true,
    });

  if (profileError) {
    // Rollback: remover auth user criado para não deixar orfão
    await adminClient.auth.admin.deleteUser(novoId);
    return { ok: false, error: `Erro ao criar perfil: ${profileError.message}` };
  }

  // ── Enviar email de boas-vindas (falha silenciosa) ────────────────────────
  const emailFailed = !(await sendEmail({
    template: 'senha-temporaria',
    to: email,
    payload: { nome, email, senha: senhaTemp },
  }));

  // ── Auditoria ─────────────────────────────────────────────────────────────
  await insertAuditLog({
    usuarioId: currentUser.id,
    perfil: currentProfile.perfil,
    acao: 'Usuário criado',
    entidade: 'Usuário',
    entidadeId: novoId,
    dadosDepois: { nome, email, perfil, status: 'Ativo' },
  });

  return { ok: true, data: { senhaTemp, usuarioId: novoId }, emailFailed };
}

// ─────────────────────────────────────────────────────────────────────────────
// F2B.3 — Editar Usuário
// ─────────────────────────────────────────────────────────────────────────────

export interface EditarUsuarioInput {
  usuarioId: string;
  nome: string;
  email: string;
  status: 'Ativo' | 'Inativo';
}

export async function editarUsuarioAction(
  input: EditarUsuarioInput,
): Promise<ActionResult<undefined>> {
  const nome = input.nome.trim();
  const email = input.email.trim().toLowerCase();
  const { usuarioId, status } = input;

  if (!nome) return { ok: false, error: 'Nome é obrigatório.' };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'E-mail inválido.' };
  }
  if (!['Ativo', 'Inativo'].includes(status)) {
    return { ok: false, error: 'Status inválido.' };
  }

  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { ok: false, error: 'Sessão expirada.' };

  const { data: currentProfile } = await supabase
    .from('users_profile')
    .select('perfil, nome')
    .eq('id', currentUser.id)
    .single();

  if (currentProfile?.perfil !== 'Administrador') {
    return { ok: false, error: 'Apenas administradores podem editar usuários.' };
  }

  // Admin não pode inativar a si mesmo
  if (usuarioId === currentUser.id && status === 'Inativo') {
    return { ok: false, error: 'Você não pode inativar sua própria conta.' };
  }

  const adminClient = createAdminClient();

  // Buscar dados anteriores para auditoria
  const { data: dadosAntes } = await adminClient
    .from('users_profile')
    .select('nome, email, status, perfil')
    .eq('id', usuarioId)
    .single();

  if (!dadosAntes) {
    return { ok: false, error: 'Usuário não encontrado.' };
  }

  // Atualizar perfil
  const { error: updateError } = await adminClient
    .from('users_profile')
    .update({ nome, email, status })
    .eq('id', usuarioId);

  if (updateError) {
    return { ok: false, error: `Erro ao atualizar usuário: ${updateError.message}` };
  }

  // Se status mudou para Inativo: banir sessão (ban por 10 anos = 87600h)
  if (status === 'Inativo' && dadosAntes.status !== 'Inativo') {
    const { error: banError } = await adminClient.auth.admin.updateUserById(usuarioId, {
      ban_duration: '87600h',
    });
    if (banError) {
      console.error('[usuarios/actions] Erro ao banir usuário:', banError.message);
    }
  }

  // Se status mudou de Inativo para Ativo: remover ban
  if (status === 'Ativo' && dadosAntes.status === 'Inativo') {
    const { error: unbanError } = await adminClient.auth.admin.updateUserById(usuarioId, {
      ban_duration: 'none',
    });
    if (unbanError) {
      console.error('[usuarios/actions] Erro ao remover ban do usuário:', unbanError.message);
    }
  }

  // Auditoria
  await insertAuditLog({
    usuarioId: currentUser.id,
    perfil: currentProfile.perfil,
    acao: 'Usuário editado',
    entidade: 'Usuário',
    entidadeId: usuarioId,
    dadosAntes: { nome: dadosAntes.nome, email: dadosAntes.email, status: dadosAntes.status },
    dadosDepois: { nome, email, status },
  });

  return { ok: true, data: undefined };
}

// ─────────────────────────────────────────────────────────────────────────────
// F2B.4 — Reset de Senha
// ─────────────────────────────────────────────────────────────────────────────

export interface ResetSenhaInput {
  usuarioId: string;
}

export interface ResetSenhaData {
  novaSenhaTemp: string;
}

export async function resetSenhaAction(
  input: ResetSenhaInput,
): Promise<ActionResult<ResetSenhaData>> {
  const { usuarioId } = input;

  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { ok: false, error: 'Sessão expirada.' };

  const { data: currentProfile } = await supabase
    .from('users_profile')
    .select('perfil')
    .eq('id', currentUser.id)
    .single();

  if (currentProfile?.perfil !== 'Administrador') {
    return { ok: false, error: 'Apenas administradores podem resetar senhas.' };
  }

  const novaSenhaTemp = gerarSenhaTemp();
  const adminClient = createAdminClient();

  // Atualizar senha no Auth
  const { error: pwError } = await adminClient.auth.admin.updateUserById(usuarioId, {
    password: novaSenhaTemp,
  });

  if (pwError) {
    return { ok: false, error: `Erro ao resetar senha: ${pwError.message}` };
  }

  // Marcar como precisa trocar senha
  const { error: profileError } = await adminClient
    .from('users_profile')
    .update({ precisa_trocar_senha: true })
    .eq('id', usuarioId);

  if (profileError) {
    console.error('[usuarios/actions] Erro ao marcar precisa_trocar_senha:', profileError.message);
  }

  // Auditoria
  await insertAuditLog({
    usuarioId: currentUser.id,
    perfil: currentProfile.perfil,
    acao: 'Senha resetada pelo admin',
    entidade: 'Usuário',
    entidadeId: usuarioId,
  });

  return { ok: true, data: { novaSenhaTemp } };
}
