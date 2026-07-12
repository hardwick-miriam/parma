'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

function fmtMoney(n: number) {
  return n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })
}
function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const tooltipStyle = { background: 'var(--surface-elevated)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12 }

// Split out of FinancesClient and dynamically imported so recharts doesn't
// block the rest of the page's paint.
export default function FinanceNetWorthChart({ trend }: { trend: { date: string; net_worth: number }[] }) {
  return (
    <div style={{ width: '100%', height: 120 }}>
      <ResponsiveContainer>
        <LineChart data={trend}>
          <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: 'var(--text-faint)' }} minTickGap={30} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} width={40} domain={['dataMin - 100', 'dataMax + 100']} />
          <Tooltip labelFormatter={(l) => fmtDate(String(l))} formatter={(v) => fmtMoney(Number(v))} contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="net_worth" stroke="var(--accent)" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
