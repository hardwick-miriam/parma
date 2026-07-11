'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ACCOUNT_TYPES, DEBT_TYPES, type AccountType, type DebtType } from '@/lib/financeTypes'

interface FinanceAccount {
  id: string; name: string; type: AccountType; balance: number
}
interface FinanceDebt {
  id: string; name: string; type: DebtType; balance: number; apr: number | null; min_payment: number | null
}
interface DebtProjection {
  id: string; name: string; balance: number; apr: number | null; min_payment: number | null; months_at_min_payment: number | null
}
interface Summary {
  totalAssets: number; totalDebts: number; netWorth: number
  allocation: { type: string; balance: number; pct: number }[]
  debtProjections: DebtProjection[]
  trend: { date: string; net_worth: number }[]
  accounts: FinanceAccount[]
  debts: FinanceDebt[]
}

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Cash', investment: 'Investment', pension: 'Pension', crypto: 'Crypto', other: 'Other',
}
const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  loan: 'Loan', 'credit-card': 'Credit card', other: 'Other',
}
const ALLOCATION_COLORS: Record<string, string> = {
  cash: 'var(--accent)', investment: 'var(--positive)', pension: 'var(--warning)', crypto: 'var(--negative)', other: 'var(--text-faint)',
}

function fmtMoney(n: number) {
  return n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
}
function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const tooltipStyle = { background: 'var(--surface-elevated)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12 }

export function FinancesClient() {
  const queryClient = useQueryClient()
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [showAddDebt, setShowAddDebt] = useState(false)
  const [newAccount, setNewAccount] = useState({ name: '', type: 'cash' as AccountType, balance: '' })
  const [newDebt, setNewDebt] = useState({ name: '', type: 'loan' as DebtType, balance: '', apr: '', min_payment: '' })

  const summary = useQuery({
    queryKey: ['finances-summary'],
    queryFn: async () => {
      const res = await fetch('/api/finances/summary')
      if (!res.ok) throw new Error('Failed to load finances')
      return (await res.json()) as Summary
    },
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['finances-summary'] })

  const addAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/finances/accounts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAccount.name, type: newAccount.type, balance: Number(newAccount.balance) }),
      })
      if (!res.ok) throw new Error('Failed to add account')
    },
    onSuccess: () => { invalidate(); setShowAddAccount(false); setNewAccount({ name: '', type: 'cash', balance: '' }) },
  })

  const addDebtMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/finances/debts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDebt.name, type: newDebt.type, balance: Number(newDebt.balance),
          apr: newDebt.apr ? Number(newDebt.apr) : undefined,
          min_payment: newDebt.min_payment ? Number(newDebt.min_payment) : undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to add debt')
    },
    onSuccess: () => { invalidate(); setShowAddDebt(false); setNewDebt({ name: '', type: 'loan', balance: '', apr: '', min_payment: '' }) },
  })

  const updateAccountMutation = useMutation({
    mutationFn: async ({ id, balance }: { id: string; balance: number }) => {
      const res = await fetch(`/api/finances/accounts/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ balance }),
      })
      if (!res.ok) throw new Error('Failed to update')
    },
    onSuccess: invalidate,
  })

  const updateDebtMutation = useMutation({
    mutationFn: async ({ id, balance }: { id: string; balance: number }) => {
      const res = await fetch(`/api/finances/debts/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ balance }),
      })
      if (!res.ok) throw new Error('Failed to update')
    },
    onSuccess: invalidate,
  })

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/finances/accounts/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: invalidate,
  })

  const deleteDebtMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/finances/debts/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: invalidate,
  })

  if (summary.isLoading) return <p className="text-sm text-text-subtle">Loading…</p>
  const data = summary.data
  if (!data) return <p className="text-sm text-text-subtle">Couldn&apos;t load your finances.</p>

  return (
    <div className="flex flex-col gap-4">
      {/* Net worth + trend */}
      <div className="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-3">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Net worth</p>
        <p className="text-3xl font-bold text-text tabular-nums">{fmtMoney(data.netWorth)}</p>
        <p className="text-xs text-text-subtle">{fmtMoney(data.totalAssets)} assets − {fmtMoney(data.totalDebts)} debts</p>
        {data.trend.length > 1 && (
          <div style={{ width: '100%', height: 120 }}>
            <ResponsiveContainer>
              <LineChart data={data.trend}>
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: 'var(--text-faint)' }} minTickGap={30} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} width={40} domain={['dataMin - 100', 'dataMax + 100']} />
                <Tooltip labelFormatter={(l) => fmtDate(String(l))} formatter={(v) => fmtMoney(Number(v))} contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="net_worth" stroke="var(--accent)" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Asset allocation */}
      {data.allocation.length > 0 && (
        <div className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Asset allocation</p>
          <div className="h-3 rounded-full overflow-hidden flex">
            {data.allocation.map((a) => (
              <div key={a.type} style={{ width: `${a.pct}%`, background: ALLOCATION_COLORS[a.type] ?? 'var(--text-faint)' }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-text-subtle">
            {data.allocation.map((a) => (
              <span key={a.type} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: ALLOCATION_COLORS[a.type] ?? 'var(--text-faint)' }} />
                {ACCOUNT_TYPE_LABELS[a.type as AccountType] ?? a.type} {a.pct}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Accounts */}
      <div className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Accounts &amp; holdings</p>
          <button onClick={() => setShowAddAccount((v) => !v)} className="text-xs text-accent">+ Add</button>
        </div>
        {showAddAccount && (
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={newAccount.name} onChange={(e) => setNewAccount((s) => ({ ...s, name: e.target.value }))} placeholder="Name (e.g. Monzo)" className="flex-1 rounded-lg bg-surface-elevated border border-border text-text text-sm px-2 py-1.5" />
            <select value={newAccount.type} onChange={(e) => setNewAccount((s) => ({ ...s, type: e.target.value as AccountType }))} className="rounded-lg bg-surface-elevated border border-border text-text text-sm px-2 py-1.5">
              {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</option>)}
            </select>
            <input type="number" value={newAccount.balance} onChange={(e) => setNewAccount((s) => ({ ...s, balance: e.target.value }))} placeholder="Balance" className="w-28 rounded-lg bg-surface-elevated border border-border text-text text-sm px-2 py-1.5" />
            <button onClick={() => addAccountMutation.mutate()} disabled={!newAccount.name || !newAccount.balance} className="rounded-lg text-xs font-semibold text-white px-3 py-1.5 disabled:opacity-40" style={{ background: 'var(--accent)' }}>Save</button>
          </div>
        )}
        {data.accounts.length === 0 && !showAddAccount && <p className="text-sm text-text-subtle">No accounts yet.</p>}
        {data.accounts.map((a) => (
          <div key={a.id} className="flex items-center justify-between py-1.5 border-t border-border first:border-0">
            <div>
              <p className="text-sm text-text">{a.name}</p>
              <p className="text-xs text-text-subtle">{ACCOUNT_TYPE_LABELS[a.type]}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number" defaultValue={a.balance}
                onBlur={(e) => { const v = Number(e.target.value); if (v !== a.balance) updateAccountMutation.mutate({ id: a.id, balance: v }) }}
                className="w-24 text-right rounded-lg bg-surface-elevated border border-border text-text text-sm px-2 py-1"
              />
              <button onClick={() => deleteAccountMutation.mutate(a.id)} className="text-xs text-red-400">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Debts */}
      <div className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Debts</p>
          <button onClick={() => setShowAddDebt((v) => !v)} className="text-xs text-accent">+ Add</button>
        </div>
        {showAddDebt && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <input value={newDebt.name} onChange={(e) => setNewDebt((s) => ({ ...s, name: e.target.value }))} placeholder="Name (e.g. Car loan)" className="flex-1 rounded-lg bg-surface-elevated border border-border text-text text-sm px-2 py-1.5" />
              <select value={newDebt.type} onChange={(e) => setNewDebt((s) => ({ ...s, type: e.target.value as DebtType }))} className="rounded-lg bg-surface-elevated border border-border text-text text-sm px-2 py-1.5">
                {DEBT_TYPES.map((t) => <option key={t} value={t}>{DEBT_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <input type="number" value={newDebt.balance} onChange={(e) => setNewDebt((s) => ({ ...s, balance: e.target.value }))} placeholder="Balance" className="flex-1 rounded-lg bg-surface-elevated border border-border text-text text-sm px-2 py-1.5" />
              <input type="number" value={newDebt.apr} onChange={(e) => setNewDebt((s) => ({ ...s, apr: e.target.value }))} placeholder="APR %" className="w-24 rounded-lg bg-surface-elevated border border-border text-text text-sm px-2 py-1.5" />
              <input type="number" value={newDebt.min_payment} onChange={(e) => setNewDebt((s) => ({ ...s, min_payment: e.target.value }))} placeholder="Min payment" className="w-28 rounded-lg bg-surface-elevated border border-border text-text text-sm px-2 py-1.5" />
              <button onClick={() => addDebtMutation.mutate()} disabled={!newDebt.name || !newDebt.balance} className="rounded-lg text-xs font-semibold text-white px-3 py-1.5 disabled:opacity-40" style={{ background: 'var(--accent)' }}>Save</button>
            </div>
          </div>
        )}
        {data.debts.length === 0 && !showAddDebt && <p className="text-sm text-text-subtle">No debts tracked.</p>}
        {data.debtProjections.map((d) => (
          <div key={d.id} className="flex flex-col gap-1 py-1.5 border-t border-border first:border-0">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text">{d.name}</p>
              <div className="flex items-center gap-2">
                <input
                  type="number" defaultValue={d.balance}
                  onBlur={(e) => { const v = Number(e.target.value); if (v !== d.balance) updateDebtMutation.mutate({ id: d.id, balance: v }) }}
                  className="w-24 text-right rounded-lg bg-surface-elevated border border-border text-text text-sm px-2 py-1"
                />
                <button onClick={() => deleteDebtMutation.mutate(d.id)} className="text-xs text-red-400">Delete</button>
              </div>
            </div>
            <p className="text-xs text-text-subtle">
              {d.apr != null ? `${d.apr}% APR` : 'No APR set'}
              {d.min_payment != null && (
                <> · {fmtMoney(d.min_payment)}/mo · {
                  d.months_at_min_payment == null
                    ? 'payment never clears this at that rate'
                    : `${d.months_at_min_payment} month${d.months_at_min_payment === 1 ? '' : 's'} to clear`
                }</>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
