'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  recomputeDailyStats,
  deleteLogEntryById,
  deleteWorkoutById,
  deleteInjuryCheckinById,
  removeSupplementFromToday,
  removeHabitFromToday,
  resolveInjuryById,
  getActiveInjuries,
  upsertHealthStatus,
} from '@/lib/db/queries'
import { ParsedLogSchema } from '@/lib/schemas'
import { applyParsedLog } from '@/lib/logApply'
import type { ParsedLog } from '@/lib/ai/types'

export async function saveLog(rawText: string, parsedIn: ParsedLog): Promise<{ error?: string; entryId?: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Not authenticated' }

  // saveLog is a Server Action — a real network endpoint any client can call
  // directly with arbitrary JSON, bypassing the zod validation that
  // /api/parse-log runs on the AI's raw output. It's also the normal path
  // for user-edited data: ConfirmationDrawer lets the user hand-edit the
  // parsed object before this is called. Re-validate here so malformed
  // edits (NaN from a cleared number input, a free-typed mood value) never
  // reach the database — reject the whole save rather than coerce silently,
  // matching the rule /api/parse-log already follows.
  const validation = ParsedLogSchema.safeParse(parsedIn)
  if (!validation.success) {
    console.error('[saveLog] validation failed:', validation.error.flatten())
    return { error: 'Some of the edited values were invalid — please check the numbers and try again.' }
  }

  const result = await applyParsedLog(user.id, rawText, validation.data, supabase)
  revalidatePath('/')
  return result
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
