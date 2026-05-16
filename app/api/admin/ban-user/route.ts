import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ADMIN_EMAIL = 'hardwickars@gmail.com'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, banned } = await request.json() as { userId: string; banned: boolean }
  const admin = createAdminClient()
  await admin.from('profiles').update({ banned }).eq('user_id', userId)
  return NextResponse.json({ ok: true })
}
