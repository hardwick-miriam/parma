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
  carbs_g: number
  fat_g: number
  fibre_g: number
  sugar_g: number
  salt_g: number
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
  items: Array<{
    meal?: string; description: string; calories: number; protein_g: number
    carbs_g?: number; fat_g?: number; fibre_g?: number; sugar_g?: number; salt_g?: number
  }>,
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
      carbs_g: item.carbs_g ?? 0,
      fat_g: item.fat_g ?? 0,
      fibre_g: item.fibre_g ?? 0,
      sugar_g: item.sugar_g ?? 0,
      salt_g: item.salt_g ?? 0,
      source: 'ai-estimate' as const,
      log_entry_id: logEntryId ?? null,
    }))
  )
  if (error) throw error
}

export interface FoodNote {
  id: string
  user_id: string
  food_key: string
  note: string
  updated_at: string
}

export function normaliseFoodKey(description: string): string {
  return description.toLowerCase().trim().replace(/\s+/g, ' ')
}

export async function getFoodNotes(userId: string, client?: SupabaseClient): Promise<FoodNote[]> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase.from('food_notes').select('*').eq('user_id', userId)
  if (error) throw error
  return data ?? []
}

export async function upsertFoodNote(
  userId: string,
  description: string,
  note: string,
  client?: SupabaseClient
): Promise<FoodNote> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('food_notes')
    .upsert(
      { user_id: userId, food_key: normaliseFoodKey(description), note, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,food_key' }
    )
    .select('*')
    .single()
  if (error) throw error
  return data as FoodNote
}

export interface FoodDay {
  date: string
  items: FoodLogItem[]
  water_ml: number
  supplements: string[]
}

/** Paginated by distinct day (not row count) — for the /food timeline's infinite scroll. */
export async function getFoodLogTimeline(
  userId: string,
  opts: { before?: string; limitDays?: number },
  client?: SupabaseClient
): Promise<{ days: FoodDay[]; hasMore: boolean }> {
  const supabase = client ?? (await createClient())
  const limitDays = opts.limitDays ?? 7

  let query = supabase
    .from('food_log')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: true })
  if (opts.before) query = query.lt('date', opts.before)

  const { data, error } = await query.limit(500)
  if (error) throw error

  const byDate = new Map<string, FoodLogItem[]>()
  for (const item of (data ?? []) as FoodLogItem[]) {
    const list = byDate.get(item.date) ?? []
    list.push(item)
    byDate.set(item.date, list)
  }

  const dates = Array.from(byDate.keys()).sort().reverse().slice(0, limitDays)
  if (!dates.length) return { days: [], hasMore: false }

  const { data: statsRows, error: statsError } = await supabase
    .from('daily_stats')
    .select('date, water_ml, supplements')
    .eq('user_id', userId)
    .in('date', dates)
  if (statsError) throw statsError
  const statsByDate = new Map((statsRows ?? []).map((s) => [s.date, s]))

  const days: FoodDay[] = dates.map((date) => ({
    date,
    items: byDate.get(date)!,
    water_ml: statsByDate.get(date)?.water_ml ?? 0,
    supplements: statsByDate.get(date)?.supplements ?? [],
  }))

  const oldest = dates[dates.length - 1]
  const { count, error: countError } = await supabase
    .from('food_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .lt('date', oldest)
  if (countError) throw countError

  return { days, hasMore: (count ?? 0) > 0 }
}

export interface MostEatenFood {
  description: string
  count: number
  meal: FoodLogItem['meal']
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fibre_g: number
  sugar_g: number
  salt_g: number
}

/** Aggregates recent food_log rows by normalised description for the "quick re-log" grid. */
export async function getMostEatenFoods(
  userId: string,
  limit = 12,
  client?: SupabaseClient
): Promise<MostEatenFood[]> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('food_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error

  const byKey = new Map<string, { latest: FoodLogItem; count: number }>()
  for (const item of (data ?? []) as FoodLogItem[]) {
    const key = normaliseFoodKey(item.description)
    const existing = byKey.get(key)
    if (existing) existing.count += 1
    else byKey.set(key, { latest: item, count: 1 })
  }

  return Array.from(byKey.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(({ latest, count }) => ({
      description: latest.description,
      count,
      meal: latest.meal,
      calories: latest.calories,
      protein_g: latest.protein_g,
      carbs_g: latest.carbs_g,
      fat_g: latest.fat_g,
      fibre_g: latest.fibre_g,
      sugar_g: latest.sugar_g,
      salt_g: latest.salt_g,
    }))
}
