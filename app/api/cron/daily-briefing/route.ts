import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateDailyBriefing } from '@/lib/dailyBriefing'
import { upsertBriefing } from '@/lib/db/briefings'
import { getLocalDate, daysAgo } from '@/lib/date'
import { getUserPreferences } from '@/lib/db/preferences'
import { getMounjaroDoses } from '@/lib/db/mounjaro'
import { computeDueStatus } from '@/lib/mounjaroTiming'
import { sendPushToUser } from '@/lib/pushNotify'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const today = getLocalDate()

  // Anyone who's logged at least one day of data in the last 30 days —
  // matches the insights-refresh cron's "active user" definition.
  const since = daysAgo(today, 30)
  const { data: activeUsers, error: activeUsersErr } = await supabase
    .from('daily_stats')
    .select('user_id')
    .gte('date', since)

  if (activeUsersErr) {
    console.error('daily-briefing: failed to list active users:', activeUsersErr.message)
    return NextResponse.json({ error: 'Failed to list active users', generated: 0 }, { status: 500 })
  }
  if (!activeUsers?.length) return NextResponse.json({ generated: 0 })

  const userIds = [...new Set(activeUsers.map((r: { user_id: string }) => r.user_id))]
  let generated = 0
  let skipped = 0
  const failures: Array<{ user_id: string; error: string }> = []

  for (const userId of userIds) {
    try {
      const content = await generateDailyBriefing(userId, supabase)
      if (!content) { skipped++; continue }
      await upsertBriefing(userId, today, content, supabase)
      generated++

      // Dose-due push (feature 6a) — best-effort, a failure here shouldn't
      // fail the whole briefing generation for this user.
      try {
        const prefs = await getUserPreferences(userId, supabase)
        if (prefs?.mounjaro_enabled) {
          const doses = await getMounjaroDoses(userId, 180, supabase)
          const status = computeDueStatus(doses, today)
          if (status.due === 'today') {
            await sendPushToUser(userId, 'dose_due', {
              title: 'Mounjaro dose due today',
              body: status.cadenceDays ? `Based on your usual ${status.cadenceDays}-day cadence` : 'Time for your dose',
            })
          }
        }
      } catch (pushErr) {
        console.error(`daily-briefing: dose-due push failed for user ${userId}:`, pushErr)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`daily-briefing failed for user ${userId}:`, msg)
      failures.push({ user_id: userId, error: msg })
    }
  }

  return NextResponse.json({ generated, skipped, total_users: userIds.length, failures })
}
