import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLocalDate } from '@/lib/date'
import { insertFoodItems } from '@/lib/db/food'
import { upsertDailyStats } from '@/lib/db/queries'

// Quick re-log: one tap re-inserts a previously-eaten food's last-known
// macros as a new entry for today. No AI call — this is not a fresh
// estimate, it's a deliberate repeat of a known value.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body?.description || typeof body.calories !== 'number') {
    return NextResponse.json({ error: 'description and calories are required' }, { status: 400 })
  }

  const today = getLocalDate()
  const item = {
    meal: body.meal ?? undefined,
    description: String(body.description),
    calories: Number(body.calories) || 0,
    protein_g: Number(body.protein_g) || 0,
    carbs_g: Number(body.carbs_g) || 0,
    fat_g: Number(body.fat_g) || 0,
    fibre_g: Number(body.fibre_g) || 0,
    sugar_g: Number(body.sugar_g) || 0,
    salt_g: Number(body.salt_g) || 0,
  }

  try {
    await insertFoodItems(user.id, today, [item], undefined, supabase)
    await upsertDailyStats(user.id, {
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
      fibre_g: item.fibre_g,
      sugar_g: item.sugar_g,
      salt_g: item.salt_g,
    }, today, supabase)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('food-log/relog POST error:', err)
    return NextResponse.json({ error: 'Failed to re-log food' }, { status: 500 })
  }
}
