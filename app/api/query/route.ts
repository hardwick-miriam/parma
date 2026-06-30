import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { getDailyStatsHistory } from '@/lib/db/history'
import { getRecentWorkouts } from '@/lib/db/queries'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question } = await request.json()
  if (!question?.trim()) return NextResponse.json({ error: 'No question' }, { status: 400 })

  try {
    const [history, workouts] = await Promise.all([
      getDailyStatsHistory(user.id, 30),
      getRecentWorkouts(user.id, 30),
    ])

    const statsLines = history.map((d) => {
      const parts = [
        `${d.date}`,
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

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system: `You are Parma, a personal health assistant. Answer the user's question about their data in 1-3 sentences — direct, honest, conversational. No bullet points. No preamble like "Based on your data". If data is missing or the window is too short, say so plainly.

User data (last 30 days, most recent last):
${statsLines.join('\n') || 'No data yet'}

Recent workouts:
${workoutLines.join('\n') || 'No workouts recorded'}`,
      messages: [{ role: 'user', content: question }],
    })

    const answer = response.content.find((b) => b.type === 'text')?.text ?? 'No answer generated.'
    return NextResponse.json({ answer })
  } catch (err) {
    console.error('query error:', err)
    return NextResponse.json({ error: 'Failed to answer — check Anthropic credits' }, { status: 500 })
  }
}
