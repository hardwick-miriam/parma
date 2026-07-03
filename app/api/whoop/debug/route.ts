import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WHOOP_BASE } from '@/lib/whoop/client'
import { getValidConnectionService } from '@/lib/whoop/client'

// Diagnostic endpoint — returns full trace of env, WHOOP API calls, and Supabase writes.
// DELETE or gate behind admin check before going public.
export async function GET() {
  const log: Record<string, unknown>[] = []

  // ── 1. Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  log.push({ step: '1_auth', userId: user.id })

  // ── 2. Env vars ───────────────────────────────────────────────────────────────
  log.push({
    step: '2_env',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'MISSING',
    WHOOP_CLIENT_ID: process.env.WHOOP_CLIENT_ID ? 'SET' : 'MISSING',
    WHOOP_CLIENT_SECRET: process.env.WHOOP_CLIENT_SECRET ? 'SET' : 'MISSING',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'MISSING',
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

  // ── 4. WHOOP connection row ───────────────────────────────────────────────────
  const { data: connRow, error: connErr } = await svc
    .from('whoop_connections')
    .select('user_id, whoop_display_name, whoop_user_id, last_sync_at, connected_at, token_expires_at')
    .eq('user_id', user.id)
    .maybeSingle()
  log.push({
    step: '4_connection_row',
    found: !!connRow,
    display_name: connRow?.whoop_display_name,
    last_sync_at: connRow?.last_sync_at,
    token_expires_at: connRow?.token_expires_at,
    db_error: connErr ? { message: connErr.message, code: connErr.code, details: connErr.details } : null,
  })
  if (!connRow) return NextResponse.json({ log })

  // ── 5. Valid token ────────────────────────────────────────────────────────────
  let conn: Awaited<ReturnType<typeof getValidConnectionService>>
  try {
    conn = await getValidConnectionService(user.id)
    log.push({ step: '5_valid_token', ok: true })
  } catch (err) {
    log.push({ step: '5_valid_token', ok: false, error: String(err) })
    return NextResponse.json({ log })
  }

  // ── 6. WHOOP API calls (raw fetch so we capture status codes) ─────────────────
  const startDate = new Date(Date.now() - 30 * 86400_000).toISOString()
  const authHeader = { Authorization: `Bearer ${conn.access_token}` }

  async function whoopProbe(label: string, path: string) {
    const url = `${WHOOP_BASE}${path}?start=${encodeURIComponent(startDate)}&limit=25`
    let status: number, body: unknown
    try {
      const res = await fetch(url, { headers: authHeader })
      status = res.status
      body = await res.json()
    } catch (err) {
      log.push({ step: `6_api_${label}`, url, error: String(err) })
      return
    }
    const records = (body as { records?: unknown[] })?.records ?? []
    log.push({
      step: `6_api_${label}`,
      url,
      http_status: status,
      record_count: records.length,
      next_token: (body as { next_token?: string })?.next_token ?? null,
      first_record: records[0] ?? null,
    })
    return records
  }

  const cycles   = await whoopProbe('cycles',   '/cycle')
  const recoveries = await whoopProbe('recovery', '/recovery')
  const sleeps   = await whoopProbe('sleep',    '/activity/sleep')
  const workouts = await whoopProbe('workout',  '/activity/workout')
  void workouts // logged above; workouts go to whoop_metrics in future work

  // ── 7. Test upsert (first closed cycle, if any) ───────────────────────────────
  const firstClosed = (cycles as Array<{ id: number; end?: string; start: string; timezone_offset: string }> | undefined)
    ?.find(c => !!c.end)
  if (firstClosed) {
    const testDate = firstClosed.start.split('T')[0]
    const testRow = {
      user_id: user.id,
      date: testDate,
      cycle_id: firstClosed.id,
      updated_at: new Date().toISOString(),
    }
    const { data: upsertData, error: upsertErr } = await svc
      .from('whoop_metrics')
      .upsert(testRow, { onConflict: 'user_id,date' })
      .select()
    log.push({
      step: '7_test_upsert',
      row_attempted: testRow,
      returned_rows: upsertData,
      error: upsertErr
        ? { message: upsertErr.message, code: upsertErr.code, details: upsertErr.details, hint: upsertErr.hint }
        : null,
    })
  } else {
    log.push({ step: '7_test_upsert', skipped: 'no closed cycles in last 30 days' })
  }

  // ── 8. Current state of whoop_metrics ─────────────────────────────────────────
  const { data: existing, count, error: readErr } = await svc
    .from('whoop_metrics')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(5)
  log.push({
    step: '8_existing_metrics',
    total_row_count: count,
    most_recent_5: existing,
    read_error: readErr ? { message: readErr.message, code: readErr.code } : null,
  })

  return NextResponse.json({ log })
}
