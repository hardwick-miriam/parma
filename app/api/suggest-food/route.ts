import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { calories, protein_g, calorieTarget = 2000, proteinTarget = 150 } = await request.json()

  const calRemaining = Math.max(0, calorieTarget - (calories ?? 0))
  const protRemaining = Math.max(0, proteinTarget - (protein_g ?? 0))

  if (calRemaining < 50 && protRemaining < 10) {
    return NextResponse.json({
      suggestion: "You've hit your targets for today — great work! Stay hydrated.",
    })
  }

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `I need to eat ${calRemaining} more calories and ${protRemaining}g more protein today. Suggest 2-3 specific food options with amounts that would hit or closely match these remaining targets. Be concise — one line per option. No preamble.`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : 'Unable to generate suggestions.'

  return NextResponse.json({ suggestion: text, calRemaining, protRemaining })
}
