import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAnthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import { getDailyStatsHistory } from '@/lib/db/history'
import { getRecentWorkouts } from '@/lib/db/queries'

export const maxDuration = 30

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { question } = await request.json()
  if (!question?.trim()) return new Response('No question', { status: 400 })

  try {
    const [history, workouts] = await Promise.all([
      getDailyStatsHistory(user.id, 30),
      getRecentWorkouts(user.id, 30),
    ])

    const statsLines = history.map((d) => {
      const parts = [
        d.date,
        d.calories > 0 ? `cal=${d.calories}` : null,
        d.protein_g > 0 ? `prot=${d.protein_g}g` : null,
        d.steps > 0 ? `steps=${d.steps}` : null,
        d.water_ml > 0 ? `water=${(d.water_ml / 1000).toFixed(1)}L` : null,
        d.sleep_hours ? `sleep=${d.sleep_hours}h` : null,
        d.mood ? `mood=${d.mood}` : null,
        d.weight_kg ? `weight=${d.weight_kg}kg` : null,
      ].filter(Boolean)
      return parts.join(' ')
    })

    const workoutLines = workouts.map((w) => {
      const parts = [
        w.date,
        w.description,
        w.duration_minutes ? `${w.duration_minutes}min` : null,
        w.exercises?.length ? w.exercises.join(', ') : null,
      ].filter(Boolean)
      return parts.join(' — ')
    })

    const systemPrompt = `You are Parma, a personal health assistant. Answer the user's question about their data in 1-3 sentences — direct, honest, conversational. No bullet points. No preamble like "Based on your data". If data is missing or the window is too short, say so plainly.

User data (last 30 days, most recent last):
${statsLines.join('\n') || 'No data yet'}

Recent workouts:
${workoutLines.join('\n') || 'No workouts recorded'}`

    const result = streamText({
      model: anthropic('claude-haiku-4-5'),
      system: systemPrompt,
      messages: [{ role: 'user', content: question }],
      maxOutputTokens: 300,
    })

    return result.toTextStreamResponse()
  } catch (err) {
    console.error('query error:', err)
    return new Response('Failed to answer — check Anthropic credits', { status: 500 })
  }
}
