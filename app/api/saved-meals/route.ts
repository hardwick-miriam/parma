import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSavedMeals, createSavedMeal } from '@/lib/db/savedMeals'
import { SavedMealItemSchema } from '@/lib/schemas'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const meals = await getSavedMeals(user.id, supabase)
  return NextResponse.json({ meals })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body?.name || !Array.isArray(body.items) || !body.items.length) {
    return NextResponse.json({ error: 'name and a non-empty items array are required' }, { status: 400 })
  }

  const parsedItems = z.array(SavedMealItemSchema).safeParse(body.items)
  if (!parsedItems.success) {
    return NextResponse.json(
      { error: 'Invalid meal items', details: parsedItems.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const meal = await createSavedMeal(user.id, body.name, parsedItems.data, supabase)
    return NextResponse.json({ meal })
  } catch (err) {
    console.error('[saved-meals] create error:', err)
    return NextResponse.json({ error: 'Failed to save meal' }, { status: 500 })
  }
}
