'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface DataPoint {
  date: string
  value: number | null
}

interface MetricAreaChartProps {
  data: DataPoint[]
  color?: string
  unit?: string
  height?: number
  formatValue?: (v: number) => string
}

function CustomTooltip({
  active,
  payload,
  label,
  unit,
  formatValue,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
  unit?: string
  formatValue?: (v: number) => string
}) {
  if (!active || !payload?.[0]) return null
  const val = payload[0].value
  const display = formatValue ? formatValue(val) : val.toLocaleString()
  return (
    <div
      style={{
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border-strong)',
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: 12,
      }}
    >
      <p style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{label}</p>
      <p style={{ color: 'var(--accent)', fontWeight: 600 }}>
        {display}{unit ? ` ${unit}` : ''}
      </p>
    </div>
  )
}

export function MetricAreaChart({
  data,
  color = 'var(--accent)',
  unit,
  height = 160,
  formatValue,
}: MetricAreaChartProps) {
  const gradientId = `gradient-${color.replace(/[^a-z0-9]/gi, '')}`

  const filled = data.filter((d) => d.value !== null)
  if (filled.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-text-subtle text-sm"
        style={{ height }}
      >
        No data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: 'var(--text-subtle)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: 'var(--text-subtle)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatValue ?? ((v: number) => v.toLocaleString())}
          width={40}
        />
        <Tooltip
          content={<CustomTooltip unit={unit} formatValue={formatValue} />}
          cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
