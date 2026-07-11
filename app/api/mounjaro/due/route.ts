import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMounjaroDoses } from '@/lib/db/mounjaro'
import { computeDueStatus } from '@/lib/mounjaroTiming'
import { getLocalDate } from '@/lib/date'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const doses = await getMounjaroDoses(user.id, 180, supabase)
    const status = computeDueStatus(doses, getLocalDate())
    return NextResponse.json(status)
  } catch (err) {
    console.error('[mounjaro/due] GET error:', err)
    return NextResponse.json({ error: 'Failed to compute due status' }, { status: 500 })
  }
}
