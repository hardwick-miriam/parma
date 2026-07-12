'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getLocalDate } from '@/lib/date'
import { computeBreakdown } from '@/lib/mediaTaste'
import type { MediaEntry } from '@/lib/db/media'

const GENRE_LABEL: Record<string, string> = {
  crime: 'Crime', horror: 'Horror', comedy: 'Comedy', documentary: 'Documentary', drama: 'Drama',
  thriller: 'Thriller', action: 'Action', 'sci-fi': 'Sci-Fi', romance: 'Romance', reality: 'Reality',
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface border border-border p-3 flex flex-col gap-0.5">
      <p className="text-[10px] text-text-subtle uppercase tracking-widest">{label}</p>
      <p className="text-lg font-bold text-text tabular-nums">{value}</p>
    </div>
  )
}

export default function MediaBreakdownSection({ entries }: { entries: MediaEntry[] }) {
  const year = getLocalDate().slice(0, 4)
  const breakdown = computeBreakdown(entries, year)
  const total = breakdown.filmCount + breakdown.showCount

  return (
    <div className="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-4">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">What I watch</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard label="Films vs shows" value={total ? `${Math.round((breakdown.filmCount / total) * 100)}% / ${Math.round((breakdown.showCount / total) * 100)}%` : '—'} />
        <StatCard label="Avg rating" value={breakdown.averageRating != null ? `${breakdown.averageRating.toFixed(1)}/10` : '—'} />
        <StatCard label="Top genre" value={breakdown.mostWatchedGenre ? (GENRE_LABEL[breakdown.mostWatchedGenre] ?? breakdown.mostWatchedGenre) : '—'} />
        <StatCard label={`Logged in ${year}`} value={String(breakdown.thisYearCount)} />
      </div>

      {breakdown.ratedCount > 1 && (
        <div>
          <p className="text-[10px] text-text-subtle uppercase tracking-widest mb-1">Rating distribution</p>
          <div style={{ width: '100%', height: 120 }}>
            <ResponsiveContainer>
              <BarChart data={breakdown.ratingDistribution}>
                <XAxis dataKey="rating" tick={{ fontSize: 10, fill: 'var(--text-faint)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-faint)' }} width={24} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {breakdown.ratingDistribution.map((d, i) => (
                    <Cell key={i} fill={d.rating >= 7 ? 'var(--positive)' : d.rating >= 4 ? 'var(--warning)' : 'var(--negative)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
