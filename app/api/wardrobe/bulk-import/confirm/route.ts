import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { insertWardrobeItem, uploadWardrobePhoto } from '@/lib/db/wardrobe'
import type { NewWardrobeItem } from '@/lib/wardrobeTypes'

export const maxDuration = 60

interface BulkConfirmItem {
  fields: NewWardrobeItem
  imageBase64: string
  imageMediaType: 'image/png' | 'image/jpeg'
}

// Persists a confirmed batch: uploads each item's cutout to the private
// wardrobe bucket, then inserts the row. Every item is attempted
// independently — one failure doesn't abort the rest of the batch, and every
// failure is reported by index/name rather than swallowed, so the user knows
// exactly which items (if any) still need re-saving.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const items = body?.items as BulkConfirmItem[] | undefined
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 })
  }

  const saved: Array<{ index: number; item: unknown }> = []
  const failed: Array<{ index: number; name: string; error: string }> = []

  for (let i = 0; i < items.length; i++) {
    const { fields, imageBase64, imageMediaType } = items[i]
    if (!fields?.name || !fields?.type) {
      failed.push({ index: i, name: fields?.name ?? `item ${i + 1}`, error: 'Missing name or type' })
      continue
    }

    try {
      let photoPath: string | null = null
      if (imageBase64) {
        const bytes = Buffer.from(imageBase64, 'base64')
        const ext = imageMediaType === 'image/png' ? 'png' : 'jpg'
        photoPath = await uploadWardrobePhoto(user.id, new Uint8Array(bytes), ext, supabase)
      }

      const item = await insertWardrobeItem(user.id, { ...fields, photo_path: photoPath }, supabase)
      let photoUrl: string | null = null
      if (photoPath) {
        const { data, error: signError } = await supabase.storage.from('wardrobe').createSignedUrl(photoPath, 3600)
        if (signError) console.error(`[wardrobe/bulk-import/confirm] signed URL failed for ${photoPath}:`, signError.message)
        photoUrl = data?.signedUrl ?? null
      }
      saved.push({ index: i, item: { ...item, photo_url: photoUrl, wear_count: 0, last_worn: null, cost_per_wear: null } })
    } catch (err) {
      console.error(`[wardrobe/bulk-import/confirm] item ${i} (${fields.name}) failed:`, err)
      failed.push({ index: i, name: fields.name, error: err instanceof Error ? err.message : 'Unknown error' })
    }
  }

  return NextResponse.json({ saved, failed, savedCount: saved.length, failedCount: failed.length })
}
