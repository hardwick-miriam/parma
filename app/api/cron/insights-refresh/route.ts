import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getDailyStatsHistoryForUser } from '@/lib/db/history'
import { computeInsights } from '@/lib/insights/compute'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Get all users who have logged at least 10 days of data in the last 90 days
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: activeUsers } = await supabase
    .from('daily_stats')
    .select('user_id')
    .gte('date', since)

  if (!activeUsers?.length) return NextResponse.json({ refreshed: 0 })

  const userIds = [...new Set(activeUsers.map((r: { user_id: string }) => r.user_id))]
  let refreshed = 0

  for (const userId of userIds) {
    try {
      const history = await getDailyStatsHistoryForUser(supabase, userId, 90)
      if (history.length < 10) continue

      const computed = computeInsights(history)
      if (computed.length === 0) continue

      await supabase.from('insights').delete().eq('user_id', userId)
      await supabase.from('insights').insert(
        computed.map((ins) => ({
          user_id: userId,
          type: ins.type,
          metric_a: ins.metric_a ?? null,
          metric_b: ins.metric_b ?? null,
          title: ins.title,
          body: ins.body,
          strength: ins.strength,
          computed_at: new Date().toISOString(),
        }))
      )
      refreshed++
    } catch (err) {
      console.error(`insights-refresh failed for user ${userId}:`, err)
    }
  }

  return NextResponse.json({ refreshed, total_users: userIds.length })
}
