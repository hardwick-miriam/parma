import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBriefing } from '@/lib/db/briefings'
import { getLocalDate } from '@/lib/date'

export const dynamic = 'force-dynamic'

// Read-only — Main only ever reads the cron-generated cache, never triggers
// an AI call itself, so this stays a zero-cost endpoint no matter how often
// the page is loaded.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const briefing = await getBriefing(user.id, getLocalDate(), supabase).catch(() => null)
  return NextResponse.json({ briefing })
}
