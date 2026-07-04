import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

  // Supabase service-level client to look up token across all users
  const supabase = await createClient()
  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('user_id, shortcuts_token')
    .eq('shortcuts_token', token)
    .maybeSingle()

  if (!prefs) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  const userId = prefs.user_id

  const { text, place } = await request.json()
  if (!text?.trim()) return NextResponse.json({ error: 'No text provided' }, { status: 400 })

  try {
    const [provider, activeInjuries] = await Promise.all([
      Promise.resolve(getAIProvider()),
      getActiveInjuries(userId).catch(() => []),
    ])

    const parsed: ParsedLog = await provider.parseLog(text, {
      activeInjuries: activeInjuries.map((inj) => ({
        id: inj.id,
        description: inj.description,
        body_part: inj.body_part,
      })),
    })

    // Save stats
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
      }),
      insertLogEntry(userId, `[Shortcut${place ? ` · ${place}` : ''}] ${text}`, parsed),
    ])

    if (parsed.workouts?.length) {
      await Promise.all(parsed.workouts.map((w) => insertWorkout(userId, w)))
    }
    if (parsed.sick !== undefined) {
      await upsertHealthStatus(userId, { sick: parsed.sick, sick_estimated_days: parsed.sick_estimated_days })
    }
    if (parsed.mounjaro_dose_mg != null) {
      await insertMounjaroDose(userId, parsed.mounjaro_dose_mg, parsed.mounjaro_feeling ?? null, null)
    }
    if (parsed.mounjaro_side_effects) {
      await upsertMounjaroEffects(userId, parsed.mounjaro_side_effects)
    }

    return NextResponse.json({ ok: true, parsed })
  } catch (err) {
    console.error('shortcuts/log error:', err)
    return NextResponse.json({ error: 'Failed to process log' }, { status: 500 })
  }
}
