import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { bulkSetFoodItemsMeal } from '@/lib/db/food'

const VALID_MEALS = ['breakfast', 'lunch', 'dinner', 'snack']

// Assigns a meal-time to exactly the selected food_log rows (multi-select on the Food timeline).
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const ids = body?.ids
  const meal = body?.meal
  if (!Array.isArray(ids) || !ids.length || !ids.every((id) => typeof id === 'string')) {
    return NextResponse.json({ error: 'A non-empty array of string ids is required' }, { status: 400 })
  }
  if (!VALID_MEALS.includes(meal)) {
    return NextResponse.json({ error: 'meal must be one of breakfast, lunch, dinner, snack' }, { status: 400 })
  }

  try {
    await bulkSetFoodItemsMeal(user.id, ids, meal, supabase)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[food-log/bulk-meal] error:', err)
    return NextResponse.json({ error: 'Failed to set meal-time for selected items' }, { status: 500 })
  }
}
