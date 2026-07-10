import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai'
import { getActiveInjuries } from '@/lib/db/queries'
import { ParseLogPayloadSchema, ParsedLogSchema } from '@/lib/schemas'
import { getLocalDate, getWeekdayName, getLocalHour } from '@/lib/date'
import { chronoParseDate } from '@/lib/chronoParse'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const raw = await request.json()
  const payloadResult = ParseLogPayloadSchema.safeParse(raw)
  if (!payloadResult.success) {
    console.error('[parse-log] invalid payload:', payloadResult.error.flatten())
    return NextResponse.json({ error: 'Invalid payload', detail: payloadResult.error.flatten() }, { status: 400 })
  }
  const { text, date, timezone, moduleContext } = payloadResult.data

  const tz = (typeof timezone === 'string' && timezone) ? timezone : 'Europe/London'
  const today = date ?? getLocalDate(tz)
  const weekday = getWeekdayName(today)

  // Pre-parse date expressions locally — gives AI ground truth, shrinks prompt
  const chrono = chronoParseDate(text, tz)
  const resolvedDate = chrono.resolvedDate ?? today

  try {
    const [provider, activeInjuries] = await Promise.all([
      Promise.resolve(getAIProvider()),
      getActiveInjuries(user.id).catch(() => []),
    ])

    const rawParsed = await provider.parseLog(text, {
      activeInjuries: activeInjuries.map((inj) => ({
        id: inj.id,
        description: inj.description,
        body_part: inj.body_part,
      })),
      today,
      timezone: tz,
      weekday,
      resolvedDate,
      currentHour: getLocalHour(tz),
      moduleContext,
    })

    const parseResult = ParsedLogSchema.safeParse(rawParsed)
    if (!parseResult.success) {
      console.error('[parse-log] AI output failed schema validation:', parseResult.error.flatten(), 'raw:', rawParsed)
      return NextResponse.json({ error: 'AI returned invalid shape', detail: parseResult.error.flatten() }, { status: 502 })
    }
    const parsed = parseResult.data

    return NextResponse.json({ parsed })
  } catch (err) {
    console.error('parse-log error:', err)
    return NextResponse.json({ error: 'Failed to parse log' }, { status: 500 })
  }
}
