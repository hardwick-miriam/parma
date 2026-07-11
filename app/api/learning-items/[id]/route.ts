import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateLearningItem, deleteLearningItem } from '@/lib/db/learningItems'
import { getLocalDate } from '@/lib/date'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const updates = await request.json().catch(() => null)
  if (!updates) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  if (updates.status === 'finished' && !updates.finished_on) updates.finished_on = getLocalDate()
  if (updates.status === 'in-progress' && !updates.started_on) updates.started_on = getLocalDate()

  try {
    const item = await updateLearningItem(user.id, id, updates, supabase)
    return NextResponse.json({ item })
  } catch (err) {
    console.error('[learning-items/:id] update error:', err)
    return NextResponse.json({ error: 'Failed to update learning item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await deleteLearningItem(user.id, id, supabase)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[learning-items/:id] delete error:', err)
    return NextResponse.json({ error: 'Failed to delete learning item' }, { status: 500 })
  }
}
