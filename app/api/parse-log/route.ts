import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { text } = await request.json()
  if (!text?.trim()) {
    return NextResponse.json({ error: 'No text provided' }, { status: 400 })
  }

  try {
    const provider = getAIProvider()
    const parsed = await provider.parseLog(text)
    return NextResponse.json({ parsed })
  } catch (err) {
    console.error('parse-log error:', err)
    return NextResponse.json({ error: 'Failed to parse log' }, { status: 500 })
  }
}
