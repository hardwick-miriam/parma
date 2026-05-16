import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ADMIN_EMAIL = 'hardwickars@gmail.com'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, plan } = await request.json() as { userId: string; plan: 'free' | 'premium' }
  const admin = createAdminClient()
  await admin.from('profiles').update({
    plan,
    plan_type: plan === 'premium' ? 'monthly' : null,
    plan_expires_at: plan === 'premium' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
  }).eq('user_id', userId)

  return NextResponse.json({ ok: true })
}
