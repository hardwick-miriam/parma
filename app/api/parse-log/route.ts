import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai'
import { getActiveInjuries } from '@/lib/db/queries'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { text, date, timezone } = await request.json()
  if (!text?.trim()) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 })
  }

  // Resolve today's date in the user's timezone
  const tz = (typeof timezone === 'string' && timezone) ? timezone : 'Europe/London'
  const today = (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date))
    ? date
    : new Date().toLocaleDateString('en-CA', { timeZone: tz }) // en-CA gives YYYY-MM-DD
  const weekday = new Date(today + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long' })

  try {
    const [provider, activeInjuries] = await Promise.all([
      Promise.resolve(getAIProvider()),
      getActiveInjuries(user.id).catch(() => []),
    ])

    const parsed = await provider.parseLog(text, {
      activeInjuries: activeInjuries.map((inj) => ({
        id: inj.id,
        description: inj.description,
        body_part: inj.body_part,
      })),
      today,
      timezone: tz,
      weekday,
    })

    return NextResponse.json({ parsed })
  } catch (err) {
    console.error('parse-log error:', err)
    return NextResponse.json({ error: 'Failed to parse log' }, { status: 500 })
  }
}
