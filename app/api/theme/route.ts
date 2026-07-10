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

  const { theme, bgEffectsMobile } = await request.json() as { theme?: string; bgEffectsMobile?: boolean }

  const updates: { theme?: string; bg_effects_mobile?: boolean } = {}

  if (theme !== undefined) {
    if (!VALID_THEMES.includes(theme)) {
      return NextResponse.json({ error: 'Invalid theme' }, { status: 400 })
    }
    updates.theme = theme
  }
  if (bgEffectsMobile !== undefined) {
    updates.bg_effects_mobile = bgEffectsMobile
  }

  await upsertUserPreferences(user.id, updates)

  if (theme !== undefined || bgEffectsMobile !== undefined) {
    const cookieStore = await cookies()
    if (theme !== undefined) {
      cookieStore.set('parma-theme', theme, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      })
    }
    if (bgEffectsMobile !== undefined) {
      cookieStore.set('parma-bg-effects-mobile', bgEffectsMobile ? '1' : '0', {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      })
    }
  }

  return NextResponse.json({ theme, bgEffectsMobile })
}
