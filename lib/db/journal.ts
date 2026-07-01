import { createClient } from '@/lib/supabase/server'

export interface JournalNote {
  id: string
  user_id: string
  note_date: string
  note: string
  created_at: string
  updated_at: string
}

export async function getJournalNotes(userId: string, limit = 90): Promise<JournalNote[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('journal_notes')
    .select('*')
    .eq('user_id', userId)
    .order('note_date', { ascending: false })
    .limit(limit)
  return (data ?? []) as JournalNote[]
}

export async function upsertJournalNote(
  userId: string,
  date: string,
  note: string,
): Promise<JournalNote | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('journal_notes')
    .upsert(
      { user_id: userId, note_date: date, note, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,note_date' },
    )
    .select()
    .single()
  return data as JournalNote | null
}
