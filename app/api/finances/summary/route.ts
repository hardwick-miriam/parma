import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFinanceAccounts, getFinanceDebts, getFinanceSnapshots, monthsToPayoff } from '@/lib/db/finances'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [accounts, debts, snapshots] = await Promise.all([
      getFinanceAccounts(user.id, supabase),
      getFinanceDebts(user.id, supabase),
      getFinanceSnapshots(user.id, 365, supabase),
    ])

    const totalAssets = accounts.reduce((s, a) => s + Number(a.balance), 0)
    const totalDebts = debts.reduce((s, d) => s + Number(d.balance), 0)
    const netWorth = totalAssets - totalDebts

    const allocation = Object.entries(
      accounts.reduce((acc, a) => {
        acc[a.type] = (acc[a.type] ?? 0) + Number(a.balance)
        return acc
      }, {} as Record<string, number>)
    ).map(([type, balance]) => ({ type, balance, pct: totalAssets > 0 ? Math.round((balance / totalAssets) * 100) : 0 }))

    const debtProjections = debts.map((d) => {
      const payment = d.min_payment ?? 0
      return {
        id: d.id,
        name: d.name,
        balance: Number(d.balance),
        apr: d.apr,
        min_payment: d.min_payment,
        months_at_min_payment: monthsToPayoff(Number(d.balance), d.apr, payment),
      }
    })

    const trend = snapshots.map((s) => ({ date: s.snapshot_date, net_worth: Number(s.net_worth) }))

    return NextResponse.json({
      totalAssets, totalDebts, netWorth, allocation, debtProjections, trend,
      accounts, debts,
    })
  } catch (err) {
    console.error('[finances/summary] GET error:', err)
    return NextResponse.json({ error: 'Failed to load finance summary' }, { status: 500 })
  }
}
