import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMounjaroDoses, getMounjaroEffects } from '@/lib/db/mounjaro'
import { computeDueStatus } from '@/lib/mounjaroTiming'
import { getLocalDate } from '@/lib/date'

export const dynamic = 'force-dynamic'

// Full dose + side-effect history for the Health module's Mounjaro section —
// distinct from /api/mounjaro/due, which only returns the due-banner status.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [doses, effects] = await Promise.all([
      getMounjaroDoses(user.id, 365, supabase),
      getMounjaroEffects(user.id, 365, supabase),
    ])
    const status = computeDueStatus(doses, getLocalDate())
    return NextResponse.json({ doses, effects, status })
  } catch (err) {
    console.error('[mounjaro/history] GET error:', err)
    return NextResponse.json({ error: 'Failed to load Mounjaro history' }, { status: 500 })
  }
}
