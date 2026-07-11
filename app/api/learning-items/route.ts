import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLearningItems, upsertLearningItem, LEARNING_TYPES } from '@/lib/db/learningItems'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const items = await getLearningItems(user.id, supabase)
    return NextResponse.json({ items })
  } catch (err) {
    console.error('[learning-items] GET error:', err)
    return NextResponse.json({ error: 'Failed to load learning items' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body?.title || !LEARNING_TYPES.includes(body.type)) {
    return NextResponse.json({ error: 'title and a valid type are required' }, { status: 400 })
  }

  try {
    const item = await upsertLearningItem(user.id, {
      title: body.title,
      type: body.type,
      status: body.status,
      progress_pct: body.progress_pct,
      rating: body.rating,
      notes: body.notes,
    }, supabase)
    return NextResponse.json({ item })
  } catch (err) {
    console.error('[learning-items] POST error:', err)
    return NextResponse.json({ error: 'Failed to save learning item' }, { status: 500 })
  }
}
