import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCode, getWhoopProfile, APP_BASE_URL } from '@/lib/whoop/client'
import { upsertWhoopConnection } from '@/lib/db/whoop'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const cookieStore = await cookies()
  const savedState = cookieStore.get('whoop_oauth_state')?.value
  cookieStore.delete('whoop_oauth_state')

  if (error) {
    return NextResponse.redirect(`${APP_BASE_URL}/settings?error=whoop_denied`)
  }

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(`${APP_BASE_URL}/settings?error=whoop_invalid_state`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${APP_BASE_URL}/login`)

  try {
    const tokens = await exchangeCode(code)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Fetch WHOOP profile to store display name
    const profile = await getWhoopProfile(tokens.access_token)

    await upsertWhoopConnection(user.id, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt,
      whoop_user_id: profile.user_id,
      whoop_display_name: `${profile.first_name} ${profile.last_name}`.trim(),
    })

    return NextResponse.redirect(`${APP_BASE_URL}/settings?connected=whoop`)
  } catch {
    return NextResponse.redirect(`${APP_BASE_URL}/settings?error=whoop_token_failed`)
  }
}
