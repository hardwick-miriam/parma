// Service-role client — bypasses RLS, use only in server-side background tasks.
// Requires SUPABASE_SERVICE_ROLE_KEY env var (set in Vercel dashboard → Settings → Environment Variables).
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — required for background tasks')
  }
  return createSupabaseClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
}
