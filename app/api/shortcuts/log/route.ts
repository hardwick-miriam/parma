import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getAIProvider } from '@/lib/ai'
import { getActiveInjuries } from '@/lib/db/queries'
import { ParsedLogSchema } from '@/lib/schemas'
import { applyParsedLog } from '@/lib/logApply'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  // Validate Bearer token
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })

  // This route authenticates via a per-user secret token, not a Supabase
  // session cookie — there is no `auth.uid()` for RLS to match against, so
  // the lookup must use the service-role client (bypasses RLS by design,
  // same as cron/webhook routes). Using the anon client here would silently
  // return zero rows once RLS is enabled on user_preferences (C1).
  const supabase = createServiceClient()
  const { data: prefs, error: prefsError } = await supabase
    .from('user_preferences')
    .select('user_id, shortcuts_token')
    .eq('shortcuts_token', token)
    .maybeSingle()

  if (prefsError) {
    console.error('shortcuts/log token lookup error:', prefsError.message)
    return NextResponse.json({ error: 'Token lookup failed' }, { status: 500 })
  }
  if (!prefs) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  const userId = prefs.user_id

  const { text, place } = await request.json()
  if (!text?.trim()) return NextResponse.json({ error: 'No text provided' }, { status: 400 })

  try {
    const [provider, activeInjuries] = await Promise.all([
      Promise.resolve(getAIProvider()),
      getActiveInjuries(userId, supabase).catch(() => []),
    ])

    const rawParsed = await provider.parseLog(text, {
      activeInjuries: activeInjuries.map((inj) => ({
        id: inj.id,
        description: inj.description,
        body_part: inj.body_part,
      })),
    })

    // This route calls the AI provider directly instead of going through
    // /api/parse-log, so it never got the schema check that route runs on
    // the AI's raw output — validate here too, same "reject, never coerce"
    // rule (CLAUDE.md), instead of writing a possibly-malformed shape.
    const validation = ParsedLogSchema.safeParse(rawParsed)
    if (!validation.success) {
      console.error('[shortcuts/log] AI output failed schema validation:', validation.error.flatten(), 'raw:', rawParsed)
      return NextResponse.json({ error: 'AI returned invalid shape', detail: validation.error.flatten() }, { status: 502 })
    }

    // Same apply pipeline saveLog uses (M17) — this route used to hand-roll
    // a partial subset (stats/workouts/sick/mounjaro only), silently
    // dropping media, countries visited, world clocks, muscle soreness, and
    // injury check-ins/resolutions when logged via Apple Shortcuts.
    const rawText = `[Shortcut${place ? ` · ${place}` : ''}] ${text}`
    const result = await applyParsedLog(userId, rawText, validation.data, supabase)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ ok: true, parsed: validation.data })
  } catch (err) {
    console.error('shortcuts/log error:', err)
    return NextResponse.json({ error: 'Failed to process log' }, { status: 500 })
  }
}
