import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFoodNotes, upsertFoodNote, getMostEatenFoods } from '@/lib/db/food'
import { matchFoodNote } from '@/lib/foodNoteMatch'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const notes = await getFoodNotes(user.id, supabase)
  return NextResponse.json({ notes })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))

  // Direct attach: { description, note }
  if (typeof body.description === 'string' && typeof body.note === 'string') {
    try {
      const saved = await upsertFoodNote(user.id, body.description, body.note, supabase)
      return NextResponse.json({ note: saved })
    } catch (err) {
      console.error('food-notes POST (direct) error:', err)
      return NextResponse.json({ error: 'Failed to save note' }, { status: 500 })
    }
  }

  // NLP-lite: { text } — "the chicken wrap made me feel sick"
  if (typeof body.text === 'string' && body.text.trim()) {
    const recent = await getMostEatenFoods(user.id, 50, supabase)
    const match = matchFoodNote(body.text, recent.map((f) => f.description))
    if (!match) {
      return NextResponse.json({ error: "Couldn't identify a food and note in that text" }, { status: 400 })
    }
    try {
      const saved = await upsertFoodNote(user.id, match.description, match.note, supabase)
      return NextResponse.json({ note: saved, matched: match })
    } catch (err) {
      console.error('food-notes POST (nlp) error:', err)
      return NextResponse.json({ error: 'Failed to save note' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Provide either {description, note} or {text}' }, { status: 400 })
}
