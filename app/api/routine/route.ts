import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseRoutineText } from '@/lib/routineParser'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET /api/routine — list all routines for the user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[routine GET]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ routines: data ?? [] })
}

// POST /api/routine — parse text + save a new routine
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { text: string; name?: string }
  if (!body.text?.trim()) {
    return NextResponse.json({ error: 'No routine text provided' }, { status: 400 })
  }

  let parsed
  try {
    parsed = await parseRoutineText(body.text)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Parse failed'
    console.error('[routine POST] parse error:', msg)
    return NextResponse.json({ error: `Failed to parse routine: ${msg}` }, { status: 500 })
  }

  if (body.name) parsed.name = body.name

  const { data, error } = await supabase
    .from('routines')
    .insert({
      user_id: user.id,
      name: parsed.name,
      sessions: parsed.sessions,
      is_active: false,
    })
    .select()
    .single()

  if (error) {
    console.error('[routine POST] insert error:', error.code, error.message)
    return NextResponse.json(
      { error: `Failed to save routine: ${error.message}${error.code === 'PGRST205' ? ' (run migration 014)' : ''}` },
      { status: error.code === 'PGRST205' ? 503 : 500 }
    )
  }
  return NextResponse.json({ routine: data })
}

// PUT /api/routine?id=... — update a routine (name, sessions, is_active)
export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const body = await request.json() as { name?: string; sessions?: unknown; is_active?: boolean }
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name !== undefined) updates.name = body.name
  if (body.sessions !== undefined) updates.sessions = body.sessions
  if (body.is_active !== undefined) {
    updates.is_active = body.is_active
    // If activating, deactivate all others first — unchecked, this could
    // silently fail while the activation below succeeds, leaving two
    // routines marked active at once.
    if (body.is_active) {
      const { error: deactivateError } = await supabase
        .from('routines')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .neq('id', id)
      if (deactivateError) {
        console.error('[routine PUT] deactivate-others error:', deactivateError.message)
        return NextResponse.json({ error: 'Failed to deactivate other routines' }, { status: 500 })
      }
    }
  }

  const { data, error } = await supabase
    .from('routines')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('[routine PUT] error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ routine: data })
}

// DELETE /api/routine?id=...
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase
    .from('routines')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[routine DELETE] error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
