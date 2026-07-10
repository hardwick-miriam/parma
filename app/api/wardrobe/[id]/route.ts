import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWardrobeItem, updateWardrobeItem, deleteWardrobeItem, type NewWardrobeItem } from '@/lib/db/wardrobe'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const item = await getWardrobeItem(user.id, id, supabase)
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ item })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const updates = (await request.json().catch(() => null)) as Partial<NewWardrobeItem> | null
  if (!updates) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  try {
    const item = await updateWardrobeItem(user.id, id, updates, supabase)
    return NextResponse.json({ item })
  } catch (err) {
    console.error('[wardrobe] update failed:', err)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await deleteWardrobeItem(user.id, id, supabase)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[wardrobe] delete failed:', err)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}
