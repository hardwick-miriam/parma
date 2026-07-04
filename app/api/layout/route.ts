import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { upsertUserPreferences } from '@/lib/db/preferences'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { layouts?: Record<string, unknown>; hidden_widgets?: string[] }
  const updates: Record<string, unknown> = {}
  if (body.layouts && typeof body.layouts === 'object') updates.layouts = body.layouts
  if (Array.isArray(body.hidden_widgets)) updates.hidden_widgets = body.hidden_widgets

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  await upsertUserPreferences(user.id, updates as Parameters<typeof upsertUserPreferences>[1])
  return NextResponse.json({ ok: true })
}
