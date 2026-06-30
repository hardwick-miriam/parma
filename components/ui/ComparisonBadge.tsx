interface ComparisonBadgeProps {
  change: number
  higherIsBetter?: boolean
}

export function ComparisonBadge({ change, higherIsBetter = true }: ComparisonBadgeProps) {
  if (Math.abs(change) < 3) return null
  const positive = higherIsBetter ? change > 0 : change < 0
  const arrow = change > 0 ? '↑' : '↓'
  return (
    <span
      className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums ${
        positive ? 'bg-positive-dim text-positive' : 'bg-negative-dim text-negative'
      }`}
    >
      {arrow}{Math.abs(change)}%
    </span>
  )
}
