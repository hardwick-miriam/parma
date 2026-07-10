import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSavedMeals, quickAddSavedMeal } from '@/lib/db/savedMeals'

// One-tap quick-add from the Food page — immediate insert, no confirmation
// step (unlike the chat-bar path, which goes through the normal parse ->
// confirm -> save flow like every other text log).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const date = typeof body?.date === 'string' ? body.date : undefined

  const meals = await getSavedMeals(user.id, supabase)
  const meal = meals.find((m) => m.id === id)
  if (!meal) return NextResponse.json({ error: 'Saved meal not found' }, { status: 404 })

  try {
    await quickAddSavedMeal(user.id, meal, date, supabase)
    return NextResponse.json({ ok: true, itemCount: meal.items.length })
  } catch (err) {
    console.error('[saved-meals/:id/quick-add] error:', err)
    return NextResponse.json({ error: 'Failed to quick-add meal' }, { status: 500 })
  }
}
