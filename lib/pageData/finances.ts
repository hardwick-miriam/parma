import { getFinanceAccounts, getFinanceDebts, getFinanceSnapshots, monthsToPayoff } from '@/lib/db/finances'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Shared by the Finances server page (first paint) and /api/finances/summary (client refetch on realtime invalidation) — one computation, not two. */
export async function getFinancesPageData(userId: string, supabase: SupabaseClient) {
  const [accounts, debts, snapshots] = await Promise.all([
    getFinanceAccounts(userId, supabase),
    getFinanceDebts(userId, supabase),
    getFinanceSnapshots(userId, 365, supabase),
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

  return { totalAssets, totalDebts, netWorth, allocation, debtProjections, trend, accounts, debts }
}

export type FinancesPageData = Awaited<ReturnType<typeof getFinancesPageData>>
