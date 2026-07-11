'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useGridItemSize } from '@/components/dashboard/GridItemSizeContext'

interface Summary {
  netWorth: number
  totalAssets: number
  totalDebts: number
  trend: { date: string; net_worth: number }[]
}

function fmtMoney(n: number) {
  return n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
}

export function NetWorthWidget() {
  const { w, h } = useGridItemSize()
  const micro = w <= 2 && h <= 3
  const compact = w <= 2 || h <= 4

  const [data, setData] = useState<Summary | null>(null)

  useEffect(() => {
    fetch('/api/finances/summary')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
  }, [])

  const netWorth = data?.netWorth ?? 0
  const first = data?.trend?.[0]?.net_worth
  const changeSinceStart = first != null ? netWorth - first : null

  if (micro) {
    return (
      <Link
        href="/finances"
        className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-1 h-full overflow-hidden justify-center"
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">Net worth</h2>
        <p className="text-lg font-bold text-text tabular-nums truncate">{fmtMoney(netWorth)}</p>
      </Link>
    )
  }

  if (compact) {
    return (
      <Link
        href="/finances"
        className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-2 h-full overflow-hidden"
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">Net worth</h2>
        <p className="text-2xl font-bold text-text tabular-nums">{fmtMoney(netWorth)}</p>
        {changeSinceStart != null && (
          <p className={`text-xs ${changeSinceStart >= 0 ? 'text-positive' : 'text-negative'}`}>
            {changeSinceStart >= 0 ? '+' : ''}{fmtMoney(changeSinceStart)}
          </p>
        )}
      </Link>
    )
  }

  return (
    <Link
      href="/finances"
      className="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-2 h-full overflow-hidden"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">Net worth</h2>
      <p className="text-3xl font-bold text-text tabular-nums">{fmtMoney(netWorth)}</p>
      <p className="text-xs text-text-subtle">{fmtMoney(data?.totalAssets ?? 0)} assets − {fmtMoney(data?.totalDebts ?? 0)} debts</p>
      {changeSinceStart != null && (
        <p className={`text-sm ${changeSinceStart >= 0 ? 'text-positive' : 'text-negative'}`}>
          {changeSinceStart >= 0 ? '+' : ''}{fmtMoney(changeSinceStart)} over tracked period
        </p>
      )}
    </Link>
  )
}
