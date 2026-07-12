'use client'

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { computeGenreRadar } from '@/lib/mediaTaste'
import type { MediaEntry } from '@/lib/db/media'

const GENRE_LABEL: Record<string, string> = {
  crime: 'Crime', horror: 'Horror', comedy: 'Comedy', documentary: 'Documentary', drama: 'Drama',
  thriller: 'Thriller', action: 'Action', 'sci-fi': 'Sci-Fi', romance: 'Romance', reality: 'Reality',
  fantasy: 'Fantasy', mystery: 'Mystery', biography: 'Biography', family: 'Family', animation: 'Animation',
  war: 'War', musical: 'Musical', sport: 'Sport', history: 'History', adventure: 'Adventure',
}

export default function MediaTasteRadar({ entries }: { entries: MediaEntry[] }) {
  const data = computeGenreRadar(entries).map((p) => ({ ...p, label: GENRE_LABEL[p.genre] ?? p.genre }))

  if (data.length < 3) {
    return (
      <div className="rounded-2xl bg-surface border border-border p-5 flex items-center justify-center h-64">
        <p className="text-sm text-text-subtle text-center">Tag a few more genres to unlock your taste radar.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-1">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Genre taste</p>
      <p className="text-[11px] text-text-faint mb-1">
        "You" = rating-weighted preference per genre. "Average" is a flat neutral baseline (50/100) — Parma doesn't have other users' data to compare against.
      </p>
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--text-faint)' }} tickCount={5} />
            <Radar name="Average" dataKey="average" stroke="var(--text-faint)" fill="var(--text-faint)" fillOpacity={0.12} strokeDasharray="4 3" />
            <Radar name="You" dataKey="you" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.35} />
            <Tooltip contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
