import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { syncWhoopUser } from '@/lib/whoop/sync'

export async function GET(request: NextRequest) {
  // Vercel cron passes Authorization header with CRON_SECRET
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

  const succeeded = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ users: connections.length, succeeded, failed })
}
