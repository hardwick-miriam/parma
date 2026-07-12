import { createClient } from '@/lib/supabase/server'
import { getLocalDate } from '@/lib/date'
import type { SupabaseClient } from '@supabase/supabase-js'

export type MediaCategory = 'book' | 'film' | 'show' | 'song'
export type MediaStatus = 'want-to' | 'in-progress' | 'finished'

export interface MediaEntry {
  id: string
  user_id: string
  category: MediaCategory
  title: string
  rating: number | null
  note: string | null
  status: MediaStatus
  added_date: string
  created_at: string
  genres: string[]
  pinned_slot: 1 | 2 | 3 | null
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
  entry: { category: MediaCategory; title: string; rating?: number; note?: string; status?: MediaStatus; added_date?: string },
  client?: SupabaseClient
): Promise<MediaEntry> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('media_log')
    .insert({
      user_id: userId,
      category: entry.category,
      title: entry.title,
      rating: entry.rating ?? null,
      note: entry.note ?? null,
      status: entry.status ?? 'finished',
      added_date: entry.added_date ?? getLocalDate(),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMediaStatus(userId: string, entryId: string, status: MediaStatus): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('media_log')
    .update({ status })
    .eq('id', entryId)
    .eq('user_id', userId)
  if (error) throw error
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

/** Pins an item to a favourites-shelf slot (1-3) for its category, clearing whichever other item previously held that slot — the DB's unique (user_id, category, pinned_slot) index means only one item can occupy a slot at a time. */
export async function setPinnedSlot(
  userId: string,
  entryId: string,
  category: MediaCategory,
  slot: 1 | 2 | 3,
  client?: SupabaseClient
): Promise<void> {
  const supabase = client ?? (await createClient())
  const { error: clearError } = await supabase
    .from('media_log')
    .update({ pinned_slot: null })
    .eq('user_id', userId)
    .eq('category', category)
    .eq('pinned_slot', slot)
  if (clearError) throw clearError

  const { error: setError } = await supabase
    .from('media_log')
    .update({ pinned_slot: slot })
    .eq('id', entryId)
    .eq('user_id', userId)
  if (setError) throw setError
}

export async function clearPinnedSlot(userId: string, entryId: string, client?: SupabaseClient): Promise<void> {
  const supabase = client ?? (await createClient())
  const { error } = await supabase
    .from('media_log')
    .update({ pinned_slot: null })
    .eq('id', entryId)
    .eq('user_id', userId)
  if (error) throw error
}
