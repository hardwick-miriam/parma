import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai'
import { getActiveInjuries } from '@/lib/db/queries'
import { getSavedMeals } from '@/lib/db/savedMeals'
import { matchSavedMealQuickAdd } from '@/lib/savedMealMatch'
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

  // Zero-AI-cost saved-meal quick-add: "log my usual breakfast" from the Food
  // chat bar matches against the user's saved meal names before ever calling
  // the AI. Still goes through the normal confirm-before-save flow (same as
  // every other text log) — this only skips the Claude call, not the review step.
  if (moduleContext === 'food') {
    try {
      const savedMeals = await getSavedMeals(user.id)
      if (savedMeals.length) {
        const matchedName = matchSavedMealQuickAdd(text, savedMeals.map((m) => m.name))
        const meal = matchedName ? savedMeals.find((m) => m.name === matchedName) : undefined
        if (meal) {
          const totals = meal.items.reduce(
            (acc, i) => ({
              calories: acc.calories + i.calories,
              protein_g: acc.protein_g + i.protein_g,
              carbs_g: acc.carbs_g + i.carbs_g,
              fat_g: acc.fat_g + i.fat_g,
              fibre_g: acc.fibre_g + i.fibre_g,
              sugar_g: acc.sugar_g + i.sugar_g,
              salt_g: acc.salt_g + i.salt_g,
            }),
            { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, sugar_g: 0, salt_g: 0 }
          )
          const parsed = ParsedLogSchema.parse({
            foods: meal.items,
            ...totals,
            notes: `Quick-added from saved meal "${meal.name}"`,
          })
          return NextResponse.json({ parsed })
        }
      }
    } catch (err) {
      console.error('[parse-log] saved-meal quick-add lookup failed, falling through to AI:', err)
    }
  }

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
