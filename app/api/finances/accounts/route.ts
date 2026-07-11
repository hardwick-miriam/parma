import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFinanceAccounts, createFinanceAccount, ACCOUNT_TYPES } from '@/lib/db/finances'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const accounts = await getFinanceAccounts(user.id, supabase)
    return NextResponse.json({ accounts })
  } catch (err) {
    console.error('[finances/accounts] GET error:', err)
    return NextResponse.json({ error: 'Failed to load accounts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body?.name || !ACCOUNT_TYPES.includes(body.type) || typeof body.balance !== 'number') {
    return NextResponse.json({ error: 'name, a valid type, and a numeric balance are required' }, { status: 400 })
  }

  try {
    const account = await createFinanceAccount(user.id, body.name, body.type, body.balance, supabase)
    return NextResponse.json({ account })
  } catch (err) {
    console.error('[finances/accounts] POST error:', err)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
