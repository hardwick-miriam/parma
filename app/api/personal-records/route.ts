import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', user.id)
    .order('exercise')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ records: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { exercise, value, unit, reps, notes } = body

  if (!exercise?.trim() || value == null || !unit) {
    return NextResponse.json({ error: 'exercise, value, unit required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('personal_records')
    .upsert({
      user_id: user.id,
      exercise: exercise.trim(),
      value: Number(value),
      unit,
      reps: reps ?? null,
      notes: notes ?? null,
      logged_at: new Date().toISOString().split('T')[0],
    }, { onConflict: 'user_id,exercise,unit' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ record: data })
}
