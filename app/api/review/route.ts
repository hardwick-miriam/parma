import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { year, month } = await request.json() // month: 1-12

  const startDate = month
    ? new Date(year, month - 1, 1).toISOString().split('T')[0]
    : `${year}-01-01`
  const endDate = month
    ? new Date(year, month, 0).toISOString().split('T')[0]
    : `${year}-12-31`

  const { data: stats } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  const rows = stats ?? []
  if (rows.length < 3) {
    return NextResponse.json({ error: 'Not enough data for this period', narrative: null, stats: null })
  }

  // Compute summary stats
  const calVals = rows.map((d) => d.calories).filter(Boolean) as number[]
  const protVals = rows.map((d) => d.protein_g).filter(Boolean) as number[]
  const stepVals = rows.map((d) => d.steps).filter(Boolean) as number[]
  const weightVals = rows.map((d) => d.weight_kg).filter((w): w is number => w !== null)
  const hydraVals = rows.map((d) => d.water_ml).filter(Boolean) as number[]

  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0
  const max = (arr: number[]) => arr.length ? Math.max(...arr) : 0

  const summary = {
    daysLogged: rows.length,
    avgCalories: avg(calVals),
    avgProtein: avg(protVals),
    avgSteps: avg(stepVals),
    maxSteps: max(stepVals),
    avgHydrationL: hydraVals.length ? (avg(hydraVals) / 1000).toFixed(1) : '0',
    startWeight: weightVals[0] ?? null,
    endWeight: weightVals[weightVals.length - 1] ?? null,
    weightChange: weightVals.length >= 2 ? +(weightVals[weightVals.length - 1] - weightVals[0]).toFixed(1) : null,
    moodCounts: rows.reduce((acc: Record<string, number>, d) => {
      if (d.mood) acc[d.mood] = (acc[d.mood] ?? 0) + 1
      return acc
    }, {}),
  }

  const periodName = month
    ? new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
    : String(year)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: 'You are JARVIS, a calm intelligent health assistant. Write a concise 2-3 sentence review of this health period. Be specific, use the actual numbers, and end with one forward-looking observation. No bullet points — flowing prose only.',
    messages: [{
      role: 'user',
      content: `Review my ${periodName} health data:\n${JSON.stringify(summary, null, 2)}`,
    }],
  })

  const narrative = response.content[0].type === 'text' ? response.content[0].text : ''

  return NextResponse.json({ narrative, stats: summary, periodName })
}
