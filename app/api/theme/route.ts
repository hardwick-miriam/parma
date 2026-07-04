import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { upsertUserPreferences } from '@/lib/db/preferences'

export const dynamic = 'force-dynamic'

const VALID_THEMES = ['normal', 'hacker', 'brutalism', 'old-money', 'dark-academia', 'midnight-ocean', 'synthwave']

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { theme } = await request.json() as { theme: string }
  if (!VALID_THEMES.includes(theme)) {
    return NextResponse.json({ error: 'Invalid theme' }, { status: 400 })
  }

  await upsertUserPreferences(user.id, { theme })

  const cookieStore = await cookies()
  cookieStore.set('parma-theme', theme, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  return NextResponse.json({ theme })
}
