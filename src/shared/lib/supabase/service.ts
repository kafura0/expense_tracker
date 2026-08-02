import { createClient as createSupabaseJsClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role client. Use ONLY in server-only code paths that have already
 * authenticated the caller (e.g. behind `verifySuperAdmin()` or the authed
 * /api/rates route). Never expose this client or the service-role key to the
 * client bundle.
 */
export function createServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createSupabaseJsClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
