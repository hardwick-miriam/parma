import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLocalDate } from '@/lib/date'
import { parseQuestion, answerQuestion } from '@/lib/nlSearch'

export const maxDuration = 30

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question } = await request.json().catch(() => ({}))
  if (!question?.trim()) return NextResponse.json({ error: 'No question' }, { status: 400 })

  try {
    const parsed = await parseQuestion(question, getLocalDate())
    const answer = await answerQuestion(user.id, parsed, supabase)
    return NextResponse.json({ answer, intent: parsed.intent })
  } catch (err) {
    console.error('[query] error:', err)
    return NextResponse.json({ error: 'Failed to answer — check Anthropic credits' }, { status: 500 })
  }
}
