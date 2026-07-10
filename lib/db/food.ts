import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface FoodLogItem {
  id: string
  user_id: string
  date: string
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
  description: string
  calories: number
  protein_g: number
  source: 'ai-estimate' | 'off' | 'manual'
  log_entry_id: string | null
  created_at: string
}

export async function getFoodLog(userId: string, date: string, client?: SupabaseClient): Promise<FoodLogItem[]> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('food_log')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function insertFoodItems(
  userId: string,
  date: string,
  items: Array<{ meal?: string; description: string; calories: number; protein_g: number }>,
  logEntryId: string | undefined,
  client?: SupabaseClient
): Promise<void> {
  if (!items.length) return
  const supabase = client ?? (await createClient())
  const { error } = await supabase.from('food_log').insert(
    items.map((item) => ({
      user_id: userId,
      date,
      meal: item.meal ?? null,
      description: item.description,
      calories: Math.round(item.calories),
      protein_g: item.protein_g,
      source: 'ai-estimate' as const,
      log_entry_id: logEntryId ?? null,
    }))
  )
  if (error) throw error
}
