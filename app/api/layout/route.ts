import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { upsertUserPreferences } from '@/lib/db/preferences'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { layouts } = await request.json() as { layouts: Record<string, unknown> }
  if (!layouts || typeof layouts !== 'object') {
    return NextResponse.json({ error: 'Invalid layouts' }, { status: 400 })
  }

  await upsertUserPreferences(user.id, { layouts })
  return NextResponse.json({ ok: true })
}
