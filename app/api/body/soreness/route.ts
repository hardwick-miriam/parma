import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SorenessPayloadSchema } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const raw = await request.json()
  const result = SorenessPayloadSchema.safeParse(raw)
  if (!result.success) {
    console.error('[body/soreness POST] invalid payload:', result.error.flatten())
    return NextResponse.json({ error: 'Invalid payload', detail: result.error.flatten() }, { status: 400 })
  }
  const body = result.data

  const rows = body.entries.map(e => ({
    user_id: user.id,
    muscle_id: e.muscle_id,
    intensity: Math.min(10, Math.max(1, Math.round(e.intensity))),
    source: e.source ?? 'log',
  }))

  const { error: insertErr } = await supabase.from('muscle_soreness').insert(rows)
  if (insertErr) {
    console.error('[body/soreness POST] insert error:', insertErr.code, insertErr.message)
    return NextResponse.json(
      { error: `Failed to log soreness: ${insertErr.message} (${insertErr.code})` },
      { status: insertErr.code === 'PGRST205' ? 503 : 500 }
    )
  }

  for (const row of rows) {
    const { data: existing, error: fetchErr } = await supabase
      .from('muscle_soreness_multipliers')
      .select('multiplier, reports')
      .eq('user_id', user.id)
      .eq('muscle_id', row.muscle_id)
      .maybeSingle()

    if (fetchErr) {
      console.error('[body/soreness POST] multiplier fetch error:', fetchErr.message)
      continue
    }

    const newMultiplier = row.intensity / 5
    if (existing) {
      const blended = existing.multiplier * 0.6 + newMultiplier * 0.4
      const { error: updErr } = await supabase
        .from('muscle_soreness_multipliers')
        .update({ multiplier: blended, reports: existing.reports + 1, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('muscle_id', row.muscle_id)
      if (updErr) console.error('[body/soreness POST] multiplier update error:', updErr.message)
    } else {
      const { error: insErr } = await supabase.from('muscle_soreness_multipliers').insert({
        user_id: user.id, muscle_id: row.muscle_id, multiplier: newMultiplier, reports: 1,
      })
      if (insErr) console.error('[body/soreness POST] multiplier insert error:', insErr.message)
    }
  }

  return NextResponse.json({ ok: true })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const since = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()

  const [soreRes, multRes] = await Promise.all([
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

  if (soreRes.error) {
    console.error('[body/soreness GET] soreness fetch error:', soreRes.error.message)
    return NextResponse.json(
      { error: `Failed to fetch soreness data: ${soreRes.error.message}` },
      { status: soreRes.error.code === 'PGRST205' ? 503 : 500 }
    )
  }
  if (multRes.error) {
    console.error('[body/soreness GET] multipliers fetch error:', multRes.error.message)
    // Multipliers failing is non-fatal — return soreness without them
  }

  return NextResponse.json({
    soreness: soreRes.data ?? [],
    multipliers: multRes.data ?? [],
  })
}
