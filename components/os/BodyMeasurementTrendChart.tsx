'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const tooltipStyle = { background: 'var(--surface-elevated)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12 }

// Split out of BodyMeasurementsSection and dynamically imported so recharts
// doesn't load as part of the core Body page bundle for every card, even
// though most sites only have 1-2 data points and never render a chart.
export default function BodyMeasurementTrendChart({ trend }: { trend: { date: string; value_cm: number }[] }) {
  return (
    <div style={{ width: '100%', height: 80 }}>
      <ResponsiveContainer>
        <LineChart data={trend}>
          <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 9, fill: 'var(--text-faint)' }} minTickGap={30} />
          <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
          <Tooltip labelFormatter={(l) => fmtDate(String(l))} contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="value_cm" stroke="var(--accent)" strokeWidth={2} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
