import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WHOOP_BASE, getValidConnectionService } from '@/lib/whoop/client'

// Diagnostic endpoint — authenticated users only; returns a full trace of every
// query the dashboard makes, env var status, RLS check, and layout state.
export async function GET() {
  const log: Record<string, unknown>[] = []

  // ── 1. Auth ──────────────────────────────────────────────────────────────────
  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  log.push({ step: '1_auth', userId: user.id })

  // ── 2. Env vars ───────────────────────────────────────────────────────────────
  log.push({
    step: '2_env',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'MISSING',
    WHOOP_CLIENT_ID: process.env.WHOOP_CLIENT_ID ? 'SET' : 'MISSING',
    WHOOP_CLIENT_SECRET: process.env.WHOOP_CLIENT_SECRET ? 'SET' : 'MISSING',
  })

  // ── 3. Service-role client ────────────────────────────────────────────────────
  let svc: ReturnType<typeof import('@/lib/supabase/service').createServiceClient>
  try {
    const { createServiceClient } = await import('@/lib/supabase/service')
    svc = createServiceClient()
    log.push({ step: '3_service_client', ok: true })
  } catch (err) {
    log.push({ step: '3_service_client', ok: false, error: String(err) })
    return NextResponse.json({ log })
  }

  // ── 4. Saved layout (what's in user_preferences) ─────────────────────────────
  const { data: prefs } = await svc
    .from('user_preferences')
    .select('layouts')
    .eq('user_id', user.id)
    .maybeSingle()
  const savedLayouts = prefs?.layouts as Record<string, unknown> | null
  const savedLgKeys = Array.isArray((savedLayouts as Record<string,unknown>)?.lg)
    ? ((savedLayouts as Record<string,unknown>).lg as Array<{i:string}>).map(i => i.i)
    : null
  log.push({
    step: '4_saved_layout',
    has_saved_layout: !!savedLayouts && Object.keys(savedLayouts).length > 0,
    lg_widget_keys: savedLgKeys,
    whoop_in_saved_lg: savedLgKeys ? savedLgKeys.includes('whoop') : 'no saved layout',
  })

  // ── 5. whoop_connections — service role vs user client ────────────────────────
  const { data: connSvc, error: connSvcErr } = await svc
    .from('whoop_connections')
    .select('user_id, whoop_display_name, last_sync_at, token_expires_at')
    .eq('user_id', user.id)
    .maybeSingle()
  log.push({
    step: '5a_connection_via_service_role',
    found: !!connSvc,
    user_id_in_row: connSvc?.user_id,
    auth_uid: user.id,
    uuids_match: connSvc?.user_id === user.id,
    last_sync_at: connSvc?.last_sync_at,
    error: connSvcErr ? { code: connSvcErr.code, message: connSvcErr.message } : null,
  })

  const { data: connUser, error: connUserErr } = await userClient
    .from('whoop_connections')
    .select('user_id, whoop_display_name, last_sync_at')
    .eq('user_id', user.id)
    .maybeSingle()
  log.push({
    step: '5b_connection_via_user_client_rls',
    found: !!connUser,
    error: connUserErr ? { code: connUserErr.code, message: connUserErr.message } : null,
    rls_select_works: !!connUser,
  })

  // ── 6. whoop_metrics — service role vs user client ────────────────────────────
  const since = new Date(Date.now() - 10 * 86400_000).toISOString().split('T')[0]

  const { data: metricsSvc, count: countSvc, error: metricsSvcErr } = await svc
    .from('whoop_metrics')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .gte('date', since)
    .order('date', { ascending: false })
  log.push({
    step: '6a_metrics_via_service_role',
    since,
    total_rows_in_window: countSvc,
    sample: metricsSvc?.slice(0, 3),
    error: metricsSvcErr ? { code: metricsSvcErr.code, message: metricsSvcErr.message } : null,
  })

  const { data: metricsUser, count: countUser, error: metricsUserErr } = await userClient
    .from('whoop_metrics')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .gte('date', since)
    .order('date', { ascending: false })
  log.push({
    step: '6b_metrics_via_user_client_rls',
    since,
    total_rows_in_window: countUser,
    sample: metricsUser?.slice(0, 3),
    error: metricsUserErr ? { code: metricsUserErr.code, message: metricsUserErr.message } : null,
    rls_select_works: countUser != null && countUser > 0,
  })

  // ── 7. getLatestWhoopMetrics equivalent ───────────────────────────────────────
  const utcToday = new Date().toISOString().split('T')[0]
  const { data: latest, error: latestErr } = await userClient
    .from('whoop_metrics')
    .select('*')
    .eq('user_id', user.id)
    .not('recovery_score', 'is', null)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()
  log.push({
    step: '7_latest_scored_row',
    utc_server_today: utcToday,
    latest_row: latest,
    is_today: latest?.date === utcToday,
    error: latestErr ? { code: latestErr.code, message: latestErr.message } : null,
  })

  // ── 8. WHOOP API health check ──────────────────────────────────────────────────
  if (connSvc) {
    let conn: Awaited<ReturnType<typeof getValidConnectionService>>
    try {
      conn = await getValidConnectionService(user.id)
      const startDate = new Date(Date.now() - 10 * 86400_000).toISOString()
      const res = await fetch(
        `${WHOOP_BASE}/cycle?start=${encodeURIComponent(startDate)}&limit=5`,
        { headers: { Authorization: `Bearer ${conn.access_token}` } }
      )
      const body = await res.json() as { records?: unknown[]; next_token?: string }
      log.push({
        step: '8_whoop_api_cycles',
        http_status: res.status,
        record_count: body.records?.length ?? 0,
        has_next_page: !!body.next_token,
        first_record: body.records?.[0] ?? null,
      })
    } catch (err) {
      log.push({ step: '8_whoop_api_cycles', error: String(err) })
    }
  } else {
    log.push({ step: '8_whoop_api_cycles', skipped: 'no connection row' })
  }

  return NextResponse.json({ log })
}
