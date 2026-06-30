import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDailyStatsHistory } from '@/lib/db/history'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const history = await getDailyStatsHistory(user.id, 90).catch(() => [])

  if (history.length < 10) {
    return NextResponse.json({ insights: [], insufficient: true })
  }

  const csvRows = history.map((d) => [
    d.date,
    d.calories || '',
    d.protein_g || '',
    d.steps || '',
    d.water_ml ? (d.water_ml / 1000).toFixed(1) : '',
    d.sleep_hours ?? '',
    d.mood ?? '',
    d.weight_kg ?? '',
  ].join(','))

  const csv = `date,calories,protein_g,steps,water_L,sleep_h,mood,weight_kg\n${csvRows.join('\n')}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 900,
    system: 'You are a health data analyst. Analyze health tracking data and return specific, quantitative insights. Return ONLY a valid JSON array, no other text.',
    messages: [{
      role: 'user',
      content: `Analyze this ${history.length}-day health tracking data. Find 4-6 meaningful correlations or patterns. Only include insights supported by at least 8 data points. Be specific and quantitative (e.g. mention actual numbers/percentages). Return JSON array with objects: {"title": string, "insight": string, "type": "correlation"|"trend"|"pattern"|"consistency"}\n\nData:\n${csv}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
  let insights = []
  try {
    const match = text.match(/\[[\s\S]*\]/)
    insights = match ? JSON.parse(match[0]) : []
  } catch {
    insights = []
  }

  return NextResponse.json({ insights, days: history.length })
}
