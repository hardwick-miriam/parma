import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    entries: Array<{ muscle_id: string; intensity: number; source?: string }>
  }

  if (!Array.isArray(body.entries) || body.entries.length === 0) {
    return NextResponse.json({ error: 'No entries' }, { status: 400 })
  }

  const rows = body.entries.map(e => ({
    user_id: user.id,
    muscle_id: e.muscle_id,
    intensity: Math.min(10, Math.max(1, Math.round(e.intensity))),
    source: e.source ?? 'log',
  }))

  const { error: insertErr } = await supabase.from('muscle_soreness').insert(rows)
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  // Update soreness multipliers — exponential moving avg of intensity
  for (const row of rows) {
    const { data: existing } = await supabase
      .from('muscle_soreness_multipliers')
      .select('multiplier, reports')
      .eq('user_id', user.id)
      .eq('muscle_id', row.muscle_id)
      .single()

    const newMultiplier = (row.intensity / 5) // 1.0 = moderate, >1 = longer recovery
    if (existing) {
      const alpha = 0.4
      const blended = existing.multiplier * (1 - alpha) + newMultiplier * alpha
      await supabase
        .from('muscle_soreness_multipliers')
        .update({ multiplier: blended, reports: existing.reports + 1, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('muscle_id', row.muscle_id)
    } else {
      await supabase.from('muscle_soreness_multipliers').insert({
        user_id: user.id,
        muscle_id: row.muscle_id,
        multiplier: newMultiplier,
        reports: 1,
      })
    }
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const since = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: soreness }, { data: multipliers }] = await Promise.all([
    supabase
      .from('muscle_soreness')
      .select('muscle_id, intensity, logged_at, source')
      .eq('user_id', user.id)
      .gte('logged_at', since)
      .order('logged_at', { ascending: false }),
    supabase
      .from('muscle_soreness_multipliers')
      .select('muscle_id, multiplier, reports, updated_at')
      .eq('user_id', user.id),
  ])

  return NextResponse.json({ soreness: soreness ?? [], multipliers: multipliers ?? [] })
}
