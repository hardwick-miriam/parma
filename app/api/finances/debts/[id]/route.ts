import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateFinanceDebt, deleteFinanceDebt } from '@/lib/db/finances'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const updates = await request.json().catch(() => null)
  if (!updates) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })

  try {
    const debt = await updateFinanceDebt(user.id, id, updates, supabase)
    return NextResponse.json({ debt })
  } catch (err) {
    console.error('[finances/debts/:id] update error:', err)
    return NextResponse.json({ error: 'Failed to update debt' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await deleteFinanceDebt(user.id, id, supabase)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[finances/debts/:id] delete error:', err)
    return NextResponse.json({ error: 'Failed to delete debt' }, { status: 500 })
  }
}
