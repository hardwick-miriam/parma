import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Handles Supabase auth redirects — email change confirmations, password resets, etc.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  const supabase = await createClient()
  let authError: { message: string } | null = null

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    authError = error
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email_change' | 'signup' | 'recovery' | 'email',
    })
    authError = error
  }

  // A failed exchange used to redirect to `next` anyway, looking like a
  // successful signup/password-reset/email-change confirmation while the
  // user is actually not authenticated.
  if (authError) {
    console.error('auth/callback error:', authError.message)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Sign-in link expired or invalid — please try again.')}`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
