import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getLocalDate } from '@/lib/date'
import type { LearningType, LearningStatus } from '@/lib/learningTypes'

export { LEARNING_TYPES, LEARNING_STATUSES, type LearningType, type LearningStatus } from '@/lib/learningTypes'

export interface LearningItem {
  id: string
  user_id: string
  title: string
  type: LearningType
  status: LearningStatus
  progress_pct: number | null
  rating: number | null
  started_on: string | null
  finished_on: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export async function getLearningItems(userId: string, client?: SupabaseClient): Promise<LearningItem[]> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('learning_items')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export interface UpsertLearningItemInput {
  title: string
  type: LearningType
  status?: LearningStatus
  progress_pct?: number
  rating?: number
  notes?: string
}

/**
 * Finds an existing item by case-insensitive title match (regardless of type)
 * and updates it, or creates a new one — so "finished Dune" after "started
 * Dune" updates the same row instead of creating a duplicate.
 */
export async function upsertLearningItem(
  userId: string,
  input: UpsertLearningItemInput,
  client?: SupabaseClient
): Promise<LearningItem> {
  const supabase = client ?? (await createClient())
  const today = getLocalDate()

  const { data: existing, error: findErr } = await supabase
    .from('learning_items')
    .select('*')
    .eq('user_id', userId)
    .ilike('title', input.title)
    .maybeSingle()
  if (findErr) throw findErr

  const status = input.status ?? existing?.status ?? 'want'
  const updates: Record<string, unknown> = {
    title: input.title,
    type: input.type,
    status,
    updated_at: new Date().toISOString(),
  }
  if (input.progress_pct != null) updates.progress_pct = input.progress_pct
  if (input.rating != null) updates.rating = input.rating
  if (input.notes) updates.notes = input.notes
  if (status === 'in-progress' && !existing?.started_on) updates.started_on = today
  if (status === 'finished') {
    updates.finished_on = today
    if (!existing?.started_on) updates.started_on = today
    if (input.progress_pct == null) updates.progress_pct = 100
  }

  if (existing) {
    const { data, error } = await supabase
      .from('learning_items')
      .update(updates)
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('learning_items')
    .insert({ user_id: userId, ...updates })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateLearningItem(
  userId: string,
  id: string,
  updates: Partial<Omit<LearningItem, 'id' | 'user_id' | 'created_at'>>,
  client?: SupabaseClient
): Promise<LearningItem> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('learning_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteLearningItem(userId: string, id: string, client?: SupabaseClient): Promise<void> {
  const supabase = client ?? (await createClient())
  const { error } = await supabase.from('learning_items').delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
}
