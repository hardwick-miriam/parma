import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface Briefing {
  id: string
  user_id: string
  date: string
  content: string
  created_at: string
}

export async function getBriefing(userId: string, date: string, client?: SupabaseClient): Promise<Briefing | null> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('briefings')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertBriefing(
  userId: string,
  date: string,
  content: string,
  client?: SupabaseClient
): Promise<void> {
  const supabase = client ?? (await createClient())
  const { error } = await supabase
    .from('briefings')
    .upsert({ user_id: userId, date, content }, { onConflict: 'user_id,date' })
  if (error) throw error
}
