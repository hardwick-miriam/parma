import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getLocalDate } from '@/lib/date'
import { insertFoodItems } from '@/lib/db/food'
import { upsertDailyStats } from '@/lib/db/queries'

export interface SavedMealItem {
  description: string
  meal?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fibre_g: number
  sugar_g: number
  salt_g: number
}

export interface SavedMeal {
  id: string
  user_id: string
  name: string
  items: SavedMealItem[]
  created_at: string
  updated_at: string
}

export async function getSavedMeals(userId: string, client?: SupabaseClient): Promise<SavedMeal[]> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('saved_meals')
    .select('*')
    .eq('user_id', userId)
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function createSavedMeal(
  userId: string,
  name: string,
  items: SavedMealItem[],
  client?: SupabaseClient
): Promise<SavedMeal> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('saved_meals')
    .upsert(
      { user_id: userId, name, items, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,name' }
    )
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateSavedMeal(
  userId: string,
  id: string,
  updates: { name?: string; items?: SavedMealItem[] },
  client?: SupabaseClient
): Promise<SavedMeal> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('saved_meals')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteSavedMeal(userId: string, id: string, client?: SupabaseClient): Promise<void> {
  const supabase = client ?? (await createClient())
  const { error } = await supabase.from('saved_meals').delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
}

/** Inserts every item of a saved meal into today's food_log and additively updates daily_stats — no AI call. */
export async function quickAddSavedMeal(
  userId: string,
  meal: SavedMeal,
  date: string | undefined,
  client?: SupabaseClient
): Promise<void> {
  const supabase = client ?? (await createClient())
  const targetDate = date ?? getLocalDate()

  await insertFoodItems(userId, targetDate, meal.items, undefined, supabase)

  const totals = meal.items.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      protein_g: acc.protein_g + i.protein_g,
      carbs_g: acc.carbs_g + i.carbs_g,
      fat_g: acc.fat_g + i.fat_g,
      fibre_g: acc.fibre_g + i.fibre_g,
      sugar_g: acc.sugar_g + i.sugar_g,
      salt_g: acc.salt_g + i.salt_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, sugar_g: 0, salt_g: 0 }
  )
  await upsertDailyStats(userId, totals, targetDate, supabase)
}
