import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (error) {
    console.error('[auth/callback] OAuth error:', error, errorDescription)
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(errorDescription ?? error)}`)
  }

  if (!code) {
    console.error('[auth/callback] No code in callback URL')
    return NextResponse.redirect(`${origin}/?error=missing_code`)
  }

  const redirectTo = NextResponse.redirect(`${origin}/dashboard`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            redirectTo.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    console.error('[auth/callback] exchangeCodeForSession error:', exchangeError.message)
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(exchangeError.message)}`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirectTo

  // Use service role to upsert profile and seed demo folder
  const admin = createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Upsert profile — ignore if already exists
  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .upsert({ user_id: user.id, onboarded: false, plan: 'free' }, { onConflict: 'user_id', ignoreDuplicates: true })
    .select('onboarded')
    .single()

  // Check if this is truly first login (profile didn't exist before)
  const isFirstLogin = !profileErr && profile?.onboarded === false

  if (isFirstLogin) {
    // Seed demo folder
    const { data: folder } = await admin
      .from('folders')
      .insert({
        user_id: user.id,
        name: 'The Darkwood Chronicles',
        color: '#6b2737',
        icon: 'bookOpen',
        status: 'in_progress',
      })
      .select()
      .single()

    if (folder) {
      // Seed a welcome document
      await admin.from('documents').insert({
        user_id: user.id,
        folder_id: folder.id,
        title: 'Chapter One — The Darkwood Calls',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'This is your sample folio. Explore the Characters map, the Timeline, and the Worldbuilding sidebar — then begin your own story.' }],
            },
          ],
        },
      })

      // Seed a sample character
      await admin.from('worldbuilding_entries').insert({
        user_id: user.id,
        folder_id: folder.id,
        section: 'characters',
        name: 'Mira Ashvale',
        content: 'A wandering cartographer with a talent for finding doors that should not exist.',
      })
    }
  }

  return redirectTo
}
