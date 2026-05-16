import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ADMIN_EMAIL = 'hardwickars@gmail.com'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { message, expiresInDays } = await request.json() as { message: string; expiresInDays?: number }
  if (!message?.trim()) return NextResponse.json({ error: 'No message' }, { status: 400 })

  const expires_at = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null

  const admin = createAdminClient()
  const { data } = await admin.from('broadcasts').insert({ message: message.trim(), expires_at }).select().single()
  return NextResponse.json({ ok: true, id: data?.id })
}
