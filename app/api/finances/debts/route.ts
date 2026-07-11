import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFinanceDebts, createFinanceDebt, DEBT_TYPES } from '@/lib/db/finances'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const debts = await getFinanceDebts(user.id, supabase)
    return NextResponse.json({ debts })
  } catch (err) {
    console.error('[finances/debts] GET error:', err)
    return NextResponse.json({ error: 'Failed to load debts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body?.name || !DEBT_TYPES.includes(body.type) || typeof body.balance !== 'number') {
    return NextResponse.json({ error: 'name, a valid type, and a numeric balance are required' }, { status: 400 })
  }

  try {
    const debt = await createFinanceDebt(user.id, body.name, body.type, body.balance, body.apr, body.min_payment, supabase)
    return NextResponse.json({ debt })
  } catch (err) {
    console.error('[finances/debts] POST error:', err)
    return NextResponse.json({ error: 'Failed to create debt' }, { status: 500 })
  }
}
