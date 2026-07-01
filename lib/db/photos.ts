import { createClient } from '@/lib/supabase/server'

export interface ProgressPhoto {
  id: string
  user_id: string
  photo_date: string
  storage_path: string
  created_at: string
}

export interface ProgressPhotoWithUrl extends ProgressPhoto {
  url: string | null
}

export async function getProgressPhotos(userId: string): Promise<ProgressPhoto[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('progress_photos')
    .select('*')
    .eq('user_id', userId)
    .order('photo_date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function addProgressPhoto(
  userId: string,
  photoDate: string,
  storagePath: string
): Promise<ProgressPhoto> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('progress_photos')
    .insert({ user_id: userId, photo_date: photoDate, storage_path: storagePath })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProgressPhotoById(userId: string, photoId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: photo } = await supabase
    .from('progress_photos')
    .select('storage_path')
    .eq('id', photoId)
    .eq('user_id', userId)
    .single()

  if (!photo) return null

  await supabase.storage.from('progress-photos').remove([photo.storage_path])

  const { error } = await supabase
    .from('progress_photos')
    .delete()
    .eq('id', photoId)
    .eq('user_id', userId)

  if (error) throw error
  return photo.storage_path
}
