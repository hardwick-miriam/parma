import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { removeBackground } from '@/lib/wardrobeBgRemoval'
import { proposeWardrobeItemFromPhoto } from '@/lib/ai/wardrobeVision'

export const maxDuration = 60

// Per-photo bulk-import pipeline: background removal → AI identification.
// Writes nothing to the DB — the client stages every processed item in the
// batch review grid and only /confirm persists anything, so abandoning a
// batch mid-review leaves no orphaned rows or storage objects.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const imageBase64 = body?.imageBase64
  const mediaType = body?.mediaType === 'image/png' ? 'image/png' : 'image/jpeg'
  if (typeof imageBase64 !== 'string' || imageBase64.length < 100) {
    return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 })
  }

  const originalBytes = Buffer.from(imageBase64, 'base64')

  const bgResult = await removeBackground(new Uint8Array(originalBytes), mediaType)
  const cutoutBase64 = Buffer.from(bgResult.bytes).toString('base64')

  try {
    const proposed = await proposeWardrobeItemFromPhoto(cutoutBase64, bgResult.mediaType)
    return NextResponse.json({
      proposed,
      needsReview: proposed.needs_review ?? [],
      cutoutBase64,
      cutoutMediaType: bgResult.mediaType,
      bgRemoved: bgResult.bgRemoved,
    })
  } catch (err) {
    console.error('[wardrobe/bulk-import/process] vision analysis failed:', err)
    // Still return the cutout (or original, if bg removal also failed) so the
    // photo itself is never lost — just with empty proposed fields for the
    // user to fill in manually in the review grid.
    return NextResponse.json({
      proposed: { name: '', type: 'other', needs_review: ['name', 'type', 'colours', 'brand', 'seasons', 'tags'] },
      needsReview: ['name', 'type', 'colours', 'brand', 'seasons', 'tags'],
      cutoutBase64,
      cutoutMediaType: bgResult.mediaType,
      bgRemoved: bgResult.bgRemoved,
      analysisFailed: true,
    })
  }
}
