import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBriefing } from '@/lib/db/briefings'
import { getLocalDate } from '@/lib/date'

export const dynamic = 'force-dynamic'

// Read-only — Main only ever reads the cron-generated cache, never triggers
// an AI call itself, so this stays a zero-cost endpoint no matter how often
// the page is loaded.
//
// getBriefing itself already returns null (no throw) for the genuine "no
// briefing generated yet" case (maybeSingle finds no row) — so any error it
// does throw is a real failure (RLS, connection, etc), not an absence of
// data, and must be surfaced rather than masked as the same "no briefing
// yet" state.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const briefing = await getBriefing(user.id, getLocalDate(), supabase)
    return NextResponse.json({ briefing })
  } catch (err) {
    console.error('[briefing] GET error:', err)
    return NextResponse.json({ error: 'Failed to load briefing' }, { status: 500 })
  }
}
