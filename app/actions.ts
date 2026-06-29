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
} from '@/lib/db/queries'
import type { ParsedLog } from '@/lib/ai/types'

export async function saveLog(rawText: string, parsed: ParsedLog): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  try {
    await Promise.all([
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

      let matchedId: string | undefined
      if (body_part) {
        const bp = body_part.toLowerCase()
        const match = activeInjuries.find(
          (inj) =>
            (inj.body_part?.toLowerCase().includes(bp) ?? false) ||
            bp.includes(inj.body_part?.toLowerCase() ?? '')
        )
        matchedId = match?.id
      } else {
        matchedId = activeInjuries[0]?.id
      }

      if (!matchedId) {
        const created = await createInjury(
          user.id,
          body_part ?? 'injury',
          body_part ?? null,
          null
        )
        matchedId = created.id
      }

      await insertInjuryCheckin(matchedId, user.id, feeling_pct, activity ?? null, notes ?? null)
    }

    if (parsed.injured === true && !parsed.injury_checkin) {
      await upsertHealthStatus(user.id, {
        injured: true,
        injury_description: parsed.injury_description,
        injury_estimated_days: parsed.injury_estimated_days,
      })
      const activeInjuries = await getActiveInjuries(user.id)
      const desc = parsed.injury_description ?? 'Injury'
      const alreadyExists = activeInjuries.some(
        (inj) =>
          inj.description.toLowerCase().includes(desc.toLowerCase()) ||
          desc.toLowerCase().includes(inj.description.toLowerCase())
      )
      if (!alreadyExists) {
        await createInjury(user.id, desc, null, parsed.injury_estimated_days ?? null)
      }
    }

    if (parsed.injured === false) {
      await upsertHealthStatus(user.id, { injured: false })
    }

    revalidatePath('/')
    return {}
  } catch (err) {
    console.error('saveLog error:', err)
    return { error: 'Failed to save log' }
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
