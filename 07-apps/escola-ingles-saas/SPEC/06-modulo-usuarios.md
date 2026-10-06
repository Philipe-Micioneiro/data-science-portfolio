# §6 — Módulo: Usuários (Admin exclusivo)

**Design:** `screens-users.jsx`
**Rota:** `/usuarios`

---

## §6.1 — Listagem

**Componente design:** `UsuariosScreen`

**Dados:**
```sql
SELECT up.*, au.last_sign_in_at AS ultimo_acesso
FROM users_profile up
LEFT JOIN auth.users au ON au.id = up.id
ORDER BY up.criado_em DESC;
```

**KPIs:** calcular client-side a partir da lista (total, por perfil, inativos).

**Filtros:** por perfil e por busca — filtrar client-side na lista carregada.

---

## §6.2 — Criar Usuário

**Componente design:** `NovoUsuarioModal`

**Ação:**
```
POST /api/auth/create-user (Server Action)
→ Validar: email único, nome obrigatório, perfil válido
→ supabaseAdmin.auth.admin.createUser({ email, password: senhaTemp, email_confirm: true })
→ INSERT INTO users_profile (id, nome, perfil, precisa_trocar_senha=true)
→ sendEmail({ template: 'boas_vindas', email, nome, senhaTemp })
  ⚠️ Falha de email NÃO interrompe a criação — registrar erro no log e retornar sucesso com aviso
→ insertAuditLog({ acao: 'Usuário criado', entidade: 'Usuário', entidade_id: novoId })
→ Retornar { senhaTemp } para exibir no TempPwBanner
```

**UI pós-criação:** design exibe `TempPwBanner` (fundo verde) com a senha e botão de copiar (`CopyButton`). O modal NÃO fecha automaticamente — usuário fecha manualmente após copiar.

**Senha temporária:** algoritmo obrigatório em `00-decisoes-e-divergencias.md §0.6`.

**Perfis criáveis:** apenas Secretário ou Professor. Admin não pode criar outro Admin por este fluxo.

---

## §6.3 — Editar Usuário

**Componente design:** `EditarUsuarioModal`

**Ação:**
```
UPDATE users_profile SET nome, email, status WHERE id = usuario_id
→ Se status mudou para 'Inativo': supabase.auth.admin.updateUserById(id, { ban_duration: 'none+' }) // banir sessão
→ insertAuditLog({ acao: 'Usuário editado', dados_antes, dados_depois })
```

**Regras:**
- Perfil é read-only (exibido como badge, não editável)
- Admin não pode inativar a si mesmo (verificar `usuario.id === currentUser.id`)

---

## §6.4 — Reset de Senha

**Componente design:** `UsuarioDetailModal` (botão "Resetar senha")

**Ação:**
```
→ supabaseAdmin.auth.admin.updateUserById(id, { password: novaSenhaTemp })
→ UPDATE users_profile SET precisa_trocar_senha = true WHERE id = usuario_id
→ Retornar novaSenhaTemp para exibir inline no modal (design: painel azul)
→ insertAuditLog({ acao: 'Senha resetada pelo admin', entidade: 'Usuário' })
```
