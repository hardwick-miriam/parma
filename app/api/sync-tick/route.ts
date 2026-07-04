import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { syncWhoopUser } from '@/lib/whoop/sync'

export const dynamic = 'force-dynamic'

// GET  — called by the Vercel cron every 15 minutes (requires CRON_SECRET)
// POST — called by an authenticated user to manually trigger their own sync
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data: connections } = await supabase
    .from('whoop_connections')
    .select('user_id')

  if (!connections?.length) {
    return NextResponse.json({ synced: 0, users: 0 })
  }

  const results = await Promise.allSettled(
    connections.map((c: { user_id: string }) => syncWhoopUser(c.user_id))
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return NextResponse.json({ users: connections.length, succeeded, failed, ts: new Date().toISOString() })
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await syncWhoopUser(user.id)
    if (result.error) {
      return NextResponse.json({ error: result.error, detail: result }, { status: 500 })
    }
    return NextResponse.json({ ...result, ts: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unexpected sync failure' },
      { status: 500 }
    )
  }
}
