import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateSet, deleteSet } from '@/lib/db/workoutSets'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const updates = await request.json().catch(() => null)
  if (!updates) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  try {
    const set = await updateSet(user.id, id, updates, supabase)
    return NextResponse.json({ set })
  } catch (err) {
    console.error('[gym/sets/:id] update error:', err)
    return NextResponse.json({ error: 'Failed to update set' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await deleteSet(user.id, id, supabase)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[gym/sets/:id] delete error:', err)
    return NextResponse.json({ error: 'Failed to delete set' }, { status: 500 })
  }
}
