import { createClient } from '@/lib/supabase/server'

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
  notes: string | null
): Promise<void> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabase
    .from('mounjaro_doses')
    .upsert(
      { user_id: userId, taken_date: today, dose_mg: doseMg, feeling, notes },
      { onConflict: 'user_id,taken_date' }
    )

  if (error) throw error
}

export async function upsertMounjaroEffects(
  userId: string,
  effects: { nausea?: number; appetite?: number; energy?: number; notes?: string },
  doseId?: string
): Promise<void> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabase
    .from('mounjaro_effects')
    .upsert(
      {
        user_id: userId,
        logged_date: today,
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
