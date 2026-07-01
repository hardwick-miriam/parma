import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getJournalNotes, upsertJournalNote } from '@/lib/db/journal'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const notes = await getJournalNotes(user.id, 90)
  return NextResponse.json({ notes })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { date, note } = await request.json() as { date: string; note: string }
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

  const result = await upsertJournalNote(user.id, date, note ?? '')
  return NextResponse.json({ note: result })
}
