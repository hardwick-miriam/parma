import { createClient } from '@/lib/supabase/server'

export type MediaCategory = 'book' | 'film' | 'show' | 'song'

export interface MediaEntry {
  id: string
  user_id: string
  category: MediaCategory
  title: string
  rating: number | null
  note: string | null
  added_date: string
  created_at: string
}

export interface MediaCounts {
  book: number
  film: number
  show: number
  song: number
}

export async function getMediaLog(userId: string, limit = 200): Promise<MediaEntry[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('media_log')
    .select('*')
    .eq('user_id', userId)
    .order('added_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function getMediaCounts(userId: string): Promise<MediaCounts> {
  const entries = await getMediaLog(userId)
  return {
    book: entries.filter((e) => e.category === 'book').length,
    film: entries.filter((e) => e.category === 'film').length,
    show: entries.filter((e) => e.category === 'show').length,
    song: entries.filter((e) => e.category === 'song').length,
  }
}

export async function insertMediaEntry(
  userId: string,
  entry: { category: MediaCategory; title: string; rating?: number; note?: string; added_date?: string }
): Promise<MediaEntry> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('media_log')
    .insert({
      user_id: userId,
      category: entry.category,
      title: entry.title,
      rating: entry.rating ?? null,
      note: entry.note ?? null,
      added_date: entry.added_date ?? new Date().toISOString().split('T')[0],
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMediaEntry(userId: string, entryId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('media_log')
    .delete()
    .eq('id', entryId)
    .eq('user_id', userId)
  if (error) throw error
}
