# §20 — Auditoria — Helper Centralizado

**Arquivo:** `lib/audit.ts`

---

## Interface

```typescript
// Interface padrão — usar em todos os Server Actions
async function insertAuditLog({
  usuarioId,   // auth.uid() ou null para ações automáticas (ex: cron)
  perfil,      // do users_profile — ou 'Sistema' para cron
  acao,        // string descritiva (ex: 'Aluno criado', 'Comprovante aprovado')
  entidade,    // 'Aluno' | 'Financeiro' | 'Usuário' | 'Professor' | 'Agenda' | 'Sistema'
  entidadeId,  // UUID da entidade afetada (opcional)
  dadosAntes,  // JSON (opcional) — estado antes da mutação
  dadosDepois, // JSON (opcional) — estado após a mutação
  ip,          // capturar de request headers
  userAgent,   // capturar de request headers
})
```

## Captura de IP e UserAgent

Em Server Actions, usar `headers()` do Next.js:

```typescript
import { headers } from 'next/headers'

const headersList = headers()
const ip = headersList.get('x-forwarded-for') ?? headersList.get('x-real-ip') ?? 'unknown'
const userAgent = headersList.get('user-agent') ?? 'unknown'
```
