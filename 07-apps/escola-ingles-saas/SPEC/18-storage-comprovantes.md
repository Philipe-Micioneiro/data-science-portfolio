# §18 — Storage — Comprovantes

**Bucket:** `comprovantes` (privado)

---

## Estrutura de Path

```
comprovantes/{payment_id}/{hash_sha256}.{ext}
```

## Acesso

Apenas usuários autenticados com perfil Admin ou Secretário.

## Validação de Upload (Server Action)

- Validar MIME type server-side: aceitar apenas `image/png`, `image/jpeg`, `application/pdf`
- Nunca confiar no client-side para validação de tipo ou hash
- Hash SHA256 verificado server-side via `UNIQUE INDEX` em `payment_receipts.hash_sha256`

## Download como PDF

Imagens PNG/JPG devem ser convertidas para PDF antes do download.
Usar Supabase Edge Function com `pdf-lib` ou equivalente, acionada no momento do download.

**Acesso à Edge Function:** verificar JWT Supabase, aceitar apenas Admin e Secretário.

**URL de download:** gerar Supabase Storage signed URL (não URL pública).
