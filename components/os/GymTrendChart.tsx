'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Split out of LiveLogger and dynamically imported so recharts doesn't load
// as part of the core live-logging bundle every gym session pulls in.
export default function GymTrendChart({ trend }: { trend: { date: string; estimated1RM: number }[] }) {
  return (
    <div className="rounded-2xl bg-surface border border-border p-4">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">Trend (est. 1RM)</p>
      <div style={{ width: '100%', height: 160 }}>
        <ResponsiveContainer>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-faint)' }} width={36} />
            <Tooltip
              labelFormatter={(label) => fmtDate(String(label))}
              contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12 }}
            />
            <Line type="monotone" dataKey="estimated1RM" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
