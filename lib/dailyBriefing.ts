import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getLocalDate, subtractDay, daysAgo, getWeekdayName } from '@/lib/date'
import { calculateStreaks } from '@/lib/streaks'
import { getActiveInjuries } from '@/lib/db/queries'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * Gathers a compact context and makes exactly ONE cheap AI call to produce
 * the day's briefing. Called once daily by the cron (app/api/cron/daily-
 * briefing/route.ts) — Main only ever reads the cached result, never
 * triggers a call itself.
 */
export async function generateDailyBriefing(userId: string, supabase: SupabaseClient): Promise<string | null> {
  const today = getLocalDate()
  const yesterday = subtractDay(today)
  const weekday = getWeekdayName(today)

  const [
    { data: whoopToday },
    { data: yesterdayStats },
    { data: yesterdayWorkouts },
    { data: history },
    injuries,
    { data: routines },
  ] = await Promise.all([
    supabase.from('whoop_metrics').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('daily_stats').select('*').eq('user_id', userId).eq('date', yesterday).maybeSingle(),
    supabase.from('workout_sessions').select('*').eq('user_id', userId).eq('date', yesterday),
    supabase.from('daily_stats').select('*').eq('user_id', userId).gte('date', daysAgo(today, 30)).order('date', { ascending: false }).limit(30),
    getActiveInjuries(userId, supabase).catch(() => []),
    supabase.from('routines').select('*').eq('user_id', userId).eq('is_active', true).maybeSingle(),
  ])

  const hasAnyData = whoopToday || yesterdayStats || (yesterdayWorkouts && yesterdayWorkouts.length > 0)
  if (!hasAnyData) return null // graceful fallback — no pointless AI call on an empty account

  const streaks = calculateStreaks(history ?? [], new Set((yesterdayWorkouts ?? []).map((w: { date: string }) => w.date)))
  const streaksAtRisk = Object.entries(streaks).filter(([, count]) => (count as number) >= 3)

  const plannedSession = routines?.sessions?.find((s: { day: string }) => s.day === weekday || s.day === 'Any')

  const contextLines: string[] = [`Today is ${weekday}.`]

  if (whoopToday) {
    contextLines.push(
      `Last night's sleep/recovery: ${whoopToday.recovery_score != null ? `${Math.round(whoopToday.recovery_score)}% recovery` : 'no recovery score'}` +
      `${whoopToday.hrv_rmssd_milli != null ? `, HRV ${Math.round(whoopToday.hrv_rmssd_milli)}ms` : ''}` +
      `${whoopToday.sleep_performance_pct != null ? `, sleep performance ${Math.round(whoopToday.sleep_performance_pct)}%` : ''}.`
    )
  }
  if (yesterdayStats) {
    contextLines.push(
      `Yesterday: ${yesterdayStats.calories ?? 0} kcal, ${yesterdayStats.protein_g ?? 0}g protein` +
      `${yesterdayStats.sleep_hours != null ? `, ${yesterdayStats.sleep_hours}h sleep` : ''}.`
    )
  }
  if (yesterdayWorkouts?.length) {
    contextLines.push(`Yesterday's training: ${yesterdayWorkouts.map((w: { description: string }) => w.description).join(', ')}.`)
  } else {
    contextLines.push('No training logged yesterday.')
  }
  if (injuries?.length) {
    contextLines.push(`Active injuries: ${injuries.map((i: { description: string }) => i.description).join(', ')}.`)
  }
  if (streaksAtRisk.length) {
    contextLines.push(`Streaks in progress: ${streaksAtRisk.map(([k, v]) => `${k} (${v} days)`).join(', ')}.`)
  }
  if (plannedSession) {
    contextLines.push(`Today's planned session: ${plannedSession.label ?? plannedSession.day}.`)
  }

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 150,
    system:
      'You are a sharp, no-fluff personal coach writing a single daily briefing. ' +
      'Write EXACTLY 2-3 sentences, plain English, personal ("you"), synthesising the data given. ' +
      'No greetings, no "Good morning", no bullet points, no emoji, no filler. ' +
      'Be specific with real numbers when you have them. If recovery is low or an injury is active, say so plainly. ' +
      'If there is genuinely nothing notable, say something brief and honest rather than inventing insight.',
    messages: [{ role: 'user', content: contextLines.join('\n') }],
  })

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  return textBlock?.text.trim() ?? null
}
