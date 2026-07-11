import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { bulkDeleteFoodItems } from '@/lib/db/food'

// Deletes exactly the selected food_log rows (multi-select on the Food timeline) — not the whole day.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const ids = body?.ids
  if (!Array.isArray(ids) || !ids.length || !ids.every((id) => typeof id === 'string')) {
    return NextResponse.json({ error: 'A non-empty array of string ids is required' }, { status: 400 })
  }

  try {
    await bulkDeleteFoodItems(user.id, ids, supabase)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[food-log/bulk-delete] error:', err)
    return NextResponse.json({ error: 'Failed to delete selected items' }, { status: 500 })
  }
}
