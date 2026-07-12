import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setPinnedSlot, clearPinnedSlot } from '@/lib/db/media'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const { id, category, slot } = body ?? {}
  if (!id || !category || ![1, 2, 3].includes(slot)) {
    return NextResponse.json({ error: 'id, category, and slot (1-3) are required' }, { status: 400 })
  }

  try {
    await setPinnedSlot(user.id, id, category, slot, supabase)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[media/pin] error:', err)
    return NextResponse.json({ error: 'Failed to pin item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  try {
    await clearPinnedSlot(user.id, id, supabase)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[media/pin] unpin error:', err)
    return NextResponse.json({ error: 'Failed to unpin item' }, { status: 500 })
  }
}
