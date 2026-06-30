'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { upsertUserPreferences, generateShortcutsToken } from '@/lib/db/preferences'
import type { SavedPlace } from '@/lib/db/preferences'
import { randomUUID } from 'crypto'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export async function saveSettings(updates: {
  weight_goal_kg?: number | null
  mounjaro_enabled?: boolean
}): Promise<void> {
  const user = await getUser()
  await upsertUserPreferences(user.id, updates)
  revalidatePath('/')
  revalidatePath('/settings')
}

export async function generateToken(): Promise<string> {
  const user = await getUser()
  return generateShortcutsToken(user.id)
}

export async function addPlace(place: Omit<SavedPlace, 'id'>): Promise<SavedPlace> {
  const user = await getUser()
  const { getUserPreferences, upsertUserPreferences } = await import('@/lib/db/preferences')
  const prefs = await getUserPreferences(user.id)
  const existing = prefs?.saved_places ?? []
  const newPlace: SavedPlace = { ...place, id: randomUUID() }
  await upsertUserPreferences(user.id, { saved_places: [...existing, newPlace] })
  return newPlace
}

export async function removePlace(id: string): Promise<void> {
  const user = await getUser()
  const { getUserPreferences, upsertUserPreferences } = await import('@/lib/db/preferences')
  const prefs = await getUserPreferences(user.id)
  const updated = (prefs?.saved_places ?? []).filter((p) => p.id !== id)
  await upsertUserPreferences(user.id, { saved_places: updated })
}

export async function changePassword(
  newPassword: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }
  return {}
}
