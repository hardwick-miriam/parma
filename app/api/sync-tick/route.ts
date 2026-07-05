import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { syncWhoopUser } from '@/lib/whoop/sync'

export const dynamic = 'force-dynamic'

const SKIP_WINDOW_MS = 10 * 60 * 1000 // 10 minutes

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true
  const querySecret = request.nextUrl.searchParams.get('secret')
  if (querySecret && querySecret === process.env.CRON_SECRET) return true
  return false
}

// GET  — called by the Vercel cron or external cron-job.org (requires CRON_SECRET)
// Accepts:  Authorization: Bearer <secret>  OR  ?secret=<secret>
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const t0 = Date.now()
  const supabase = createServiceClient()
  const { data: connections } = await supabase
    .from('whoop_connections')
    .select('user_id, last_sync_at')

  if (!connections?.length) {
    return NextResponse.json({ synced_users: 0, skipped: 0, records: 0, took_ms: Date.now() - t0 })
  }

  const now = Date.now()
  const fresh = connections.filter((c: { user_id: string; last_sync_at: string | null }) => {
    if (!c.last_sync_at) return false
    return now - new Date(c.last_sync_at).getTime() < SKIP_WINDOW_MS
  })
  const stale = connections.filter((c: { user_id: string; last_sync_at: string | null }) => !fresh.includes(c))

  const results = await Promise.allSettled(
    stale.map((c: { user_id: string }) => syncWhoopUser(c.user_id))
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled')
  const failed = results.filter((r) => r.status === 'rejected').length
  const totalRecords = succeeded.reduce((sum, r) => {
    if (r.status === 'fulfilled') return sum + (r.value.synced ?? 0)
    return sum
  }, 0)

  return NextResponse.json({
    synced_users: succeeded.length,
    skipped: fresh.length,
    failed,
    records: totalRecords,
    took_ms: Date.now() - t0,
    ts: new Date().toISOString(),
  })
}

// POST — called by an authenticated user to manually trigger their own sync
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const t0 = Date.now()
  try {
    const result = await syncWhoopUser(user.id)
    if (result.error) {
      return NextResponse.json({ error: result.error, detail: result }, { status: 500 })
    }
    return NextResponse.json({ ...result, took_ms: Date.now() - t0, ts: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected sync failure' },
      { status: 500 }
    )
  }
}
