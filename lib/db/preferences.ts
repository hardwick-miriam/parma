import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

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
  calorie_target: number
  protein_target_g: number
  carbs_target_g: number
  fat_target_g: number
  fibre_target_g: number
  sugar_target_g: number
  salt_target_g: number
  updated_at: string
}

export async function getUserPreferences(userId: string, client?: SupabaseClient): Promise<UserPreferences | null> {
  const supabase = client ?? (await createClient())
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
    calorie_target: (data.calorie_target as number) ?? 2000,
    protein_target_g: (data.protein_target_g as number) ?? 150,
    carbs_target_g: (data.carbs_target_g as number) ?? 250,
    fat_target_g: (data.fat_target_g as number) ?? 70,
    fibre_target_g: (data.fibre_target_g as number) ?? 30,
    sugar_target_g: (data.sugar_target_g as number) ?? 90,
    salt_target_g: (data.salt_target_g as number) ?? 6,
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
