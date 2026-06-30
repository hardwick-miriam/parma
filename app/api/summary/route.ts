import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { getDailyStatsHistory } from '@/lib/db/history'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { period } = await request.json() as { period: 'daily' | 'weekly' }
  const days = period === 'weekly' ? 7 : 1

  try {
    const history = await getDailyStatsHistory(user.id, days)
    if (history.length === 0) return NextResponse.json({ summary: null })

    let userPrompt: string

    if (period === 'weekly') {
      const lines = history.map((d) => {
        const day = new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })
        return `${day}: cal=${d.calories} prot=${d.protein_g}g steps=${d.steps} water=${(d.water_ml / 1000).toFixed(1)}L sleep=${d.sleep_hours ?? '?'}h mood=${d.mood ?? '?'}`
      }).join(' | ')
      userPrompt = `Weekly data: ${lines}. Protein target 150g/day, hydration 2L/day, steps 10k/day. Write 2-3 honest sentences on how the week went — highs, lows, trends. Start with an overall vibe (e.g. "Solid week." or "Mixed.").`
    } else {
      const d = history[history.length - 1]
      userPrompt = `Today: cal=${d.calories}/2000 prot=${d.protein_g}g/150g steps=${d.steps}/10000 water=${(d.water_ml / 1000).toFixed(1)}L/2L sleep=${d.sleep_hours ?? '?'}h mood=${d.mood ?? '?'}. Write 1-2 sentences about today. Be direct.`
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 150,
      system: 'You are Parma, a health assistant with a JARVIS-like tone — terse, intelligent, no fluff. Never start with "Here is" or "Based on". No sign-off.',
      messages: [{ role: 'user', content: userPrompt }],
    })

    const summary = response.content.find((b) => b.type === 'text')?.text ?? null
    return NextResponse.json({ summary })
  } catch (err) {
    console.error('summary error:', err)
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 })
  }
}
