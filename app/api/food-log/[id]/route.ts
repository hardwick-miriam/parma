import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateFoodItem, deleteFoodItem } from '@/lib/db/food'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const updates = await request.json().catch(() => null)
  if (!updates) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  try {
    const item = await updateFoodItem(user.id, id, updates, supabase)
    return NextResponse.json({ item })
  } catch (err) {
    console.error('[food-log/:id] update error:', err)
    return NextResponse.json({ error: 'Failed to update food item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await deleteFoodItem(user.id, id, supabase)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[food-log/:id] delete error:', err)
    return NextResponse.json({ error: 'Failed to delete food item' }, { status: 500 })
  }
}
