import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getWardrobeItems, logWear } from '@/lib/db/wardrobe'
import { matchWearLog } from '@/lib/wardrobeMatch'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const text = typeof body?.text === 'string' ? body.text : ''
  if (!text.trim()) return NextResponse.json({ error: 'text is required' }, { status: 400 })

  const items = await getWardrobeItems(user.id, supabase)
  const { date, matches } = matchWearLog(text, items)

  const matched = matches.filter((m) => m.item)
  try {
    await Promise.all(matched.map((m) => logWear(user.id, m.item!.id, date, supabase)))
  } catch (err) {
    console.error('[wardrobe/log-wear] failed:', err)
    return NextResponse.json({ error: 'Failed to log wear(s)' }, { status: 500 })
  }

  return NextResponse.json({ date, matches })
}
