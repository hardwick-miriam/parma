import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AUTH_URL, SCOPES, APP_BASE_URL } from '@/lib/whoop/client'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', APP_BASE_URL))

  const state = crypto.randomBytes(16).toString('hex')
  const cookieStore = await cookies()
  cookieStore.set('whoop_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 min
    path: '/',
  })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.WHOOP_CLIENT_ID!,
    redirect_uri: `${APP_BASE_URL}/api/whoop/callback`,
    scope: SCOPES,
    state,
  })

  return NextResponse.redirect(`${AUTH_URL}?${params.toString()}`)
}
