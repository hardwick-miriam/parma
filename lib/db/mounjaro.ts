import { createClient } from '@/lib/supabase/server'
import { getLocalDate } from '@/lib/date'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface MounjaroDose {
  id: string
  user_id: string
  taken_date: string
  dose_mg: number
  feeling: string | null
  notes: string | null
  created_at: string
}

export interface MounjaroEffect {
  id: string
  user_id: string
  logged_date: string
  dose_id: string | null
  nausea: number | null
  appetite: number | null
  energy: number | null
  notes: string | null
}

export async function getMounjaroDoses(userId: string, days = 90): Promise<MounjaroDose[]> {
  const supabase = await createClient()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('mounjaro_doses')
    .select('*')
    .eq('user_id', userId)
    .gte('taken_date', since.toISOString().split('T')[0])
    .order('taken_date', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getMounjaroEffects(userId: string, days = 90): Promise<MounjaroEffect[]> {
  const supabase = await createClient()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('mounjaro_effects')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_date', since.toISOString().split('T')[0])
    .order('logged_date', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function insertMounjaroDose(
  userId: string,
  doseMg: number,
  feeling: string | null,
  notes: string | null,
  date?: string,
  client?: SupabaseClient
): Promise<void> {
  const supabase = client ?? (await createClient())
  // C4: default to the correct local date, and honour an explicit
  // (backdated) date — the upsert key is (user_id, taken_date), so using
  // "today" unconditionally here used to silently overwrite today's real
  // dose whenever a backdated entry was logged.
  const targetDate = date ?? getLocalDate()

  const { error } = await supabase
    .from('mounjaro_doses')
    .upsert(
      { user_id: userId, taken_date: targetDate, dose_mg: doseMg, feeling, notes },
      { onConflict: 'user_id,taken_date' }
    )

  if (error) throw error
}

export async function upsertMounjaroEffects(
  userId: string,
  effects: { nausea?: number; appetite?: number; energy?: number; notes?: string },
  doseId?: string,
  date?: string,
  client?: SupabaseClient
): Promise<void> {
  const supabase = client ?? (await createClient())
  const targetDate = date ?? getLocalDate()

  const { error } = await supabase
    .from('mounjaro_effects')
    .upsert(
      {
        user_id: userId,
        logged_date: targetDate,
        dose_id: doseId ?? null,
        nausea: effects.nausea ?? null,
        appetite: effects.appetite ?? null,
        energy: effects.energy ?? null,
        notes: effects.notes ?? null,
      },
      { onConflict: 'user_id,logged_date' }
    )

  if (error) throw error
}
