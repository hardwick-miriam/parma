'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  upsertDailyStats,
  upsertHealthStatus,
  insertWorkout,
  insertLogEntry,
  getActiveInjuries,
  createInjury,
  insertInjuryCheckin,
  recomputeDailyStats,
  deleteLogEntryById,
  deleteWorkoutById,
  deleteInjuryCheckinById,
  removeSupplementFromToday,
  removeHabitFromToday,
  resolveInjuryById,
} from '@/lib/db/queries'
import { insertMounjaroDose, upsertMounjaroEffects } from '@/lib/db/mounjaro'
import { insertMediaEntry } from '@/lib/db/media'
import type { ParsedLog } from '@/lib/ai/types'
import type { Injury } from '@/lib/db/queries'

function matchInjury(activeInjuries: Injury[], target: string): Injury | undefined {
  const t = target.toLowerCase().trim()
  if (!t) return undefined

  // 1. Exact body_part match
  const exact = activeInjuries.find((inj) => inj.body_part?.toLowerCase() === t)
  if (exact) return exact

  // 2. body_part contained in target or vice-versa (only when body_part is set)
  const bpPartial = activeInjuries.find(
    (inj) =>
      inj.body_part &&
      (inj.body_part.toLowerCase().includes(t) || t.includes(inj.body_part.toLowerCase()))
  )
  if (bpPartial) return bpPartial

  // 3. description contains target word
  const descContains = activeInjuries.find((inj) =>
    inj.description.toLowerCase().includes(t)
  )
  if (descContains) return descContains

  // 4. Any word in target (>3 chars) appears in description
  const targetWords = t.split(/\s+/).filter((w) => w.length > 3)
  const wordMatch = activeInjuries.find((inj) =>
    targetWords.some((w) => inj.description.toLowerCase().includes(w))
  )
  return wordMatch
}

export async function saveLog(rawText: string, parsed: ParsedLog): Promise<{ error?: string; entryId?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  try {
    const [, entryId] = await Promise.all([
      upsertDailyStats(user.id, {
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
      insertLogEntry(user.id, rawText, parsed),
    ])

    if (parsed.workouts?.length) {
      await Promise.all(parsed.workouts.map((w) => insertWorkout(user.id, w)))
    }

    if (parsed.sick !== undefined) {
      await upsertHealthStatus(user.id, {
        sick: parsed.sick,
        sick_estimated_days: parsed.sick_estimated_days,
      })
    }

    if (parsed.injury_checkin) {
      const { body_part, feeling_pct, activity, notes } = parsed.injury_checkin
      const activeInjuries = await getActiveInjuries(user.id)

      let matched = body_part
        ? matchInjury(activeInjuries, body_part)
        : activeInjuries[0]

      if (!matched) {
        // No existing injury found — create one from the check-in body part
        matched = await createInjury(user.id, body_part ?? 'injury', body_part ?? null, null)
      }

      await insertInjuryCheckin(matched.id, user.id, feeling_pct, activity ?? null, notes ?? null)
    }

    if (parsed.injured === true && !parsed.injury_checkin) {
      await upsertHealthStatus(user.id, {
        injured: true,
        injury_description: parsed.injury_description,
        injury_estimated_days: parsed.injury_estimated_days,
      })
      const activeInjuries = await getActiveInjuries(user.id)
      const desc = parsed.injury_description ?? 'Injury'
      // Only create a new injury record if there isn't already one that matches
      const alreadyExists = matchInjury(activeInjuries, desc) != null
      if (!alreadyExists) {
        await createInjury(
          user.id,
          desc,
          parsed.injury_body_part ?? null,  // now stores body_part explicitly
          parsed.injury_estimated_days ?? null
        )
      }
    }

    if (parsed.media?.length) {
      await Promise.all(parsed.media.map((m) => insertMediaEntry(user.id, m)))
    }

    if (parsed.countries_visited?.length) {
      const newCodes = parsed.countries_visited.map((c) => c.toUpperCase())
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('visited_countries')
        .eq('user_id', user.id)
        .maybeSingle()
      const current: string[] = (existing?.visited_countries as string[]) ?? []
      const merged = [...new Set([...current, ...newCodes])]
      await supabase
        .from('user_preferences')
        .upsert({ user_id: user.id, visited_countries: merged, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    }

    if (parsed.world_clock_cities?.length) {
      const { data: existingPrefs } = await supabase
        .from('user_preferences')
        .select('world_clocks')
        .eq('user_id', user.id)
        .maybeSingle()
      type CityConfig = { name: string; country: string; lat: number; lon: number; timezone: string }
      const currentClocks: CityConfig[] = (existingPrefs?.world_clocks as CityConfig[]) ?? []
      const added: CityConfig[] = []
      for (const cityName of parsed.world_clock_cities) {
        if (currentClocks.some((c) => c.name.toLowerCase() === cityName.toLowerCase())) continue
        try {
          const geoRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`,
          )
          const geoData = await geoRes.json()
          const r = geoData.results?.[0]
          if (!r) continue
          added.push({ name: r.name, country: r.country ?? '', lat: r.latitude, lon: r.longitude, timezone: r.timezone })
        } catch { /* skip unresolvable cities */ }
      }
      if (added.length) {
        const merged = [...currentClocks, ...added]
        await supabase
          .from('user_preferences')
          .upsert({ user_id: user.id, world_clocks: merged, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      }
    }

    if (parsed.mounjaro_dose_mg != null) {
      await insertMounjaroDose(user.id, parsed.mounjaro_dose_mg, parsed.mounjaro_feeling ?? null, null)
    }

    if (parsed.mounjaro_side_effects) {
      await upsertMounjaroEffects(user.id, parsed.mounjaro_side_effects)
    }

    if (parsed.injury_resolved) {
      const { body_part } = parsed.injury_resolved
      const activeInjuries = await getActiveInjuries(user.id)

      // If no active injuries, nothing to resolve
      if (activeInjuries.length === 0) {
        // No-op — injury may have already been resolved
      } else if (!body_part && activeInjuries.length > 1) {
        // Ambiguous — multiple active injuries, can't tell which one
        revalidatePath('/')
        return {
          error: `You have ${activeInjuries.length} active injuries (${activeInjuries.map((i) => i.description).join(', ')}). Please say which one is healed, or use the "Mark as healed" button on the injury card.`,
        }
      } else {
        const matched = body_part
          ? (matchInjury(activeInjuries, body_part) ?? activeInjuries[0])
          : activeInjuries[0]

        await resolveInjuryById(user.id, matched.id)
        const remaining = await getActiveInjuries(user.id)
        if (remaining.length === 0) {
          await upsertHealthStatus(user.id, { injured: false })
        }
      }
    }

    revalidatePath('/')
    return { entryId }
  } catch (err) {
    // PostgrestError is a plain object {code, message, details, hint}, not an Error instance
    const pg = err as Record<string, unknown>
    const msg =
      typeof pg?.message === 'string' ? `${pg.message}${pg.code ? ` (${pg.code})` : ''}` :
      err instanceof Error ? err.message :
      'Failed to save log'
    console.error('saveLog error:', JSON.stringify(err))
    return { error: msg }
  }
}

export async function deleteLogEntry(entryId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const result = await deleteLogEntryById(user.id, entryId)
    if (!result) return { error: 'Entry not found' }
    await recomputeDailyStats(user.id, result.date)
    revalidatePath('/')
    return {}
  } catch {
    return { error: 'Delete failed' }
  }
}

export async function deleteWorkout(workoutId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    await deleteWorkoutById(user.id, workoutId)
    revalidatePath('/')
    return {}
  } catch {
    return { error: 'Delete failed' }
  }
}

export async function deleteInjuryCheckin(checkinId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    await deleteInjuryCheckinById(user.id, checkinId)
    revalidatePath('/')
    return {}
  } catch {
    return { error: 'Delete failed' }
  }
}

export async function removeSupplement(supplement: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    await removeSupplementFromToday(user.id, supplement)
    revalidatePath('/')
    return {}
  } catch {
    return { error: 'Delete failed' }
  }
}

export async function removeHabit(habit: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    await removeHabitFromToday(user.id, habit)
    revalidatePath('/')
    return {}
  } catch {
    return { error: 'Delete failed' }
  }
}

export async function markInjuryHealed(injuryId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    await resolveInjuryById(user.id, injuryId)
    const remaining = await getActiveInjuries(user.id)
    if (remaining.length === 0) {
      await upsertHealthStatus(user.id, { injured: false })
    }
    revalidatePath('/')
    return {}
  } catch {
    return { error: 'Failed to mark as healed' }
  }
}
