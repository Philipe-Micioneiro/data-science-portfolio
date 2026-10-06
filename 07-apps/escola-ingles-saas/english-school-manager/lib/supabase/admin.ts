import { createClient } from "@supabase/supabase-js";

/**
 * Admin Supabase client using the service role key.
 *
 * IMPORTANTE: Este cliente bypassa RLS completamente.
 * NUNCA expor ao browser. NUNCA importar em Client Components.
 * Usar apenas em: Server Actions, Route Handlers, cron jobs, e lib/audit.ts.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "[admin] NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios."
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
