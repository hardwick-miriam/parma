import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMostEatenFoods } from '@/lib/db/food'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const foods = await getMostEatenFoods(user.id, 12, supabase)
    return NextResponse.json({ foods })
  } catch (err) {
    console.error('food-log/most-eaten GET error:', err)
    return NextResponse.json({ error: 'Failed to load most-eaten foods' }, { status: 500 })
  }
}
