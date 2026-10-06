import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import UsuariosClient, { type UsuarioRow } from '@/components/usuarios/UsuariosClient';

/**
 * /usuarios — Módulo de Gestão de Usuários
 *
 * Server Component:
 * - Valida que o usuário autenticado é Administrador (dupla verificação além do proxy.ts)
 * - Busca lista de users_profile via admin client
 * - Faz join manual com auth.admin.listUsers() para obter last_sign_in_at
 * - Passa dados para UsuariosClient (Client Component)
 */
export default async function UsuariosPage() {
  const supabase = await createClient();

  // Verificar sessão
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Verificar perfil — dupla proteção além do proxy.ts
  const { data: currentProfile } = await supabase
    .from('users_profile')
    .select('perfil, nome')
    .eq('id', user.id)
    .single();

  if (!currentProfile || currentProfile.perfil !== 'Administrador') {
    redirect('/dashboard');
  }

  const perfil: string = currentProfile.perfil;

  // Buscar lista de usuários via admin client (necessário para bypass de RLS)
  const adminClient = createAdminClient();

  const [profilesResult, authUsersResult] = await Promise.all([
    adminClient
      .from('users_profile')
      .select('id, nome, email, perfil, status, precisa_trocar_senha, criado_em')
      .order('criado_em', { ascending: false }),
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const profiles = profilesResult.data ?? [];
  const authUsers = authUsersResult.data?.users ?? [];

  // Join manual: adicionar last_sign_in_at de auth.users
  const authMap = new Map(authUsers.map((u) => [u.id, u.last_sign_in_at ?? null]));

  const usuarios: UsuarioRow[] = profiles.map((p) => ({
    id: p.id,
    nome: p.nome ?? '',
    email: p.email ?? '',
    perfil: p.perfil ?? 'Professor',
    status: p.status ?? 'Ativo',
    precisa_trocar_senha: p.precisa_trocar_senha ?? false,
    criado_em: p.criado_em ?? null,
    ultimo_acesso: authMap.get(p.id) ?? null,
  }));

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header da página */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
          Usuários do sistema
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>
          Gerencie contas e perfis de acesso · apenas administradores podem criar e inativar usuários
        </p>
      </div>

      <UsuariosClient
        usuarios={usuarios}
        currentUserId={user.id}
        currentUserPerfil={perfil}
      />
    </div>
  );
}
