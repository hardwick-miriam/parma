import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { proposeWardrobeItemFromPhoto } from '@/lib/ai/wardrobeVision'

export const maxDuration = 30

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

  try {
    const proposed = await proposeWardrobeItemFromPhoto(imageBase64, mediaType)
    return NextResponse.json({ proposed })
  } catch (err) {
    console.error('[wardrobe/analyze] error:', err)
    return NextResponse.json({ error: 'Failed to analyze photo' }, { status: 500 })
  }
}
