import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

export interface SavedPlace {
  id: string
  name: string
  action: string
  log_text: string
}

export interface UserPreferences {
  user_id: string
  weight_goal_kg: number | null
  shortcuts_token: string | null
  saved_places: SavedPlace[]
  mounjaro_enabled: boolean
  layouts: Record<string, unknown>
  hidden_widgets: string[]
  theme: string
  weather_bg_enabled: boolean
  bg_effects_mobile: boolean
  updated_at: string
}

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return {
    ...data,
    saved_places: (data.saved_places as SavedPlace[]) ?? [],
    layouts: (data.layouts as Record<string, unknown>) ?? {},
    hidden_widgets: (data.hidden_widgets as string[]) ?? [],
    theme: (data.theme as string) ?? 'normal',
    weather_bg_enabled: (data.weather_bg_enabled as boolean) ?? false,
    bg_effects_mobile: (data.bg_effects_mobile as boolean) ?? false,
  }
}

export async function upsertUserPreferences(
  userId: string,
  updates: Partial<Omit<UserPreferences, 'user_id' | 'updated_at'>>
): Promise<UserPreferences> {
  const supabase = await createClient()

  const row: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
    ...updates,
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(row, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) throw error
  return { ...data, saved_places: (data.saved_places as SavedPlace[]) ?? [] }
}

export async function generateShortcutsToken(userId: string): Promise<string> {
  const token = `parma_${randomBytes(20).toString('hex')}`
  await upsertUserPreferences(userId, { shortcuts_token: token })
  return token
}
