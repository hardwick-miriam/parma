'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { upsertDailyStats, upsertHealthStatus, insertWorkout } from '@/lib/db/queries'
import type { ParsedLog } from '@/lib/ai/types'

export async function saveLog(parsed: ParsedLog): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  try {
    await upsertDailyStats(user.id, {
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
    })

    if (parsed.workouts?.length) {
      await Promise.all(parsed.workouts.map((w) => insertWorkout(user.id, w)))
    }

    const hasHealthUpdate = parsed.sick !== undefined || parsed.injured !== undefined
    if (hasHealthUpdate) {
      await upsertHealthStatus(user.id, {
        sick: parsed.sick,
        sick_estimated_days: parsed.sick_estimated_days,
        injured: parsed.injured,
        injury_description: parsed.injury_description,
        injury_estimated_days: parsed.injury_estimated_days,
      })
    }

    revalidatePath('/')
    return {}
  } catch (err) {
    console.error('saveLog error:', err)
    return { error: 'Failed to save log' }
  }
}
