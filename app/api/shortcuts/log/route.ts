import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getAIProvider } from '@/lib/ai'
import { upsertDailyStats, insertLogEntry, insertWorkout, upsertHealthStatus, getActiveInjuries } from '@/lib/db/queries'
import { insertMounjaroDose, upsertMounjaroEffects } from '@/lib/db/mounjaro'
import type { ParsedLog } from '@/lib/ai/types'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  // Validate Bearer token
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })

  // This route authenticates via a per-user secret token, not a Supabase
  // session cookie — there is no `auth.uid()` for RLS to match against, so
  // the lookup must use the service-role client (bypasses RLS by design,
  // same as cron/webhook routes). Using the anon client here would silently
  // return zero rows once RLS is enabled on user_preferences (C1).
  const supabase = createServiceClient()
  const { data: prefs, error: prefsError } = await supabase
    .from('user_preferences')
    .select('user_id, shortcuts_token')
    .eq('shortcuts_token', token)
    .maybeSingle()

  if (prefsError) {
    console.error('shortcuts/log token lookup error:', prefsError.message)
    return NextResponse.json({ error: 'Token lookup failed' }, { status: 500 })
  }
  if (!prefs) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  const userId = prefs.user_id

  const { text, place } = await request.json()
  if (!text?.trim()) return NextResponse.json({ error: 'No text provided' }, { status: 400 })

  try {
    const [provider, activeInjuries] = await Promise.all([
      Promise.resolve(getAIProvider()),
      getActiveInjuries(userId, supabase).catch(() => []),
    ])

    const parsed: ParsedLog = await provider.parseLog(text, {
      activeInjuries: activeInjuries.map((inj) => ({
        id: inj.id,
        description: inj.description,
        body_part: inj.body_part,
      })),
    })

    const logDate = parsed.log_date ?? undefined

    // Every write below passes `supabase` (the service-role client from the
    // token lookup above) explicitly — this route has no Supabase session,
    // so the cookie-scoped default client these functions normally use
    // would match zero rows once RLS is enabled (C1).
    await Promise.all([
      upsertDailyStats(userId, {
        calories: parsed.calories,
        protein_g: parsed.protein_g,
        steps: parsed.steps,
        water_ml: parsed.water_ml,
        mood: parsed.mood,
        sleep_hours: parsed.sleep_hours,
        weight_kg: parsed.weight_kg,
        supplements: parsed.supplements,
        habits_done: parsed.habits_done,
        notes: parsed.notes,
      }, logDate, supabase),
      insertLogEntry(userId, `[Shortcut${place ? ` · ${place}` : ''}] ${text}`, parsed, logDate, supabase),
    ])

    if (parsed.workouts?.length) {
      await Promise.all(parsed.workouts.map((w) => insertWorkout(userId, w, logDate, supabase)))
    }
    if (parsed.sick !== undefined) {
      await upsertHealthStatus(userId, { sick: parsed.sick, sick_estimated_days: parsed.sick_estimated_days }, logDate, supabase)
    }
    if (parsed.mounjaro_dose_mg != null) {
      await insertMounjaroDose(userId, parsed.mounjaro_dose_mg, parsed.mounjaro_feeling ?? null, null, logDate, supabase)
    }
    if (parsed.mounjaro_side_effects) {
      await upsertMounjaroEffects(userId, parsed.mounjaro_side_effects, undefined, logDate, supabase)
    }

    return NextResponse.json({ ok: true, parsed })
  } catch (err) {
    console.error('shortcuts/log error:', err)
    return NextResponse.json({ error: 'Failed to process log' }, { status: 500 })
  }
}
