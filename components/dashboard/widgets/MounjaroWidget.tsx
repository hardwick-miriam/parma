'use client'

import type { MounjaroDose, MounjaroEffect } from '@/lib/db/mounjaro'

function fmt(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Bar({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-text-subtle w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
        <div className="h-full rounded-full bg-accent" style={{ width: `${(value / 10) * 100}%` }} />
      </div>
      <span className="text-[10px] text-text-subtle tabular-nums w-4 text-right">{value}</span>
    </div>
  )
}

interface MounjaroWidgetProps {
  doses: MounjaroDose[]
  effects: MounjaroEffect[]
}

export function MounjaroWidget({ doses, effects }: MounjaroWidgetProps) {
  const lastDose = doses[0] ?? null
  const todayStr = new Date().toISOString().split('T')[0]
  const todayEffect = effects.find((e) => e.logged_date === todayStr)
  const latestEffect = todayEffect ?? effects[0]

  return (
    <div className="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-4" style={{ boxShadow: 'var(--shadow-md)' }}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Mounjaro</h2>
        {lastDose && (
          <span className="text-xs font-medium text-accent">{lastDose.dose_mg}mg</span>
        )}
      </div>

      {lastDose ? (
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] text-text-subtle uppercase tracking-widest mb-1">Last dose</p>
            <p className="text-sm font-semibold text-text">{fmt(lastDose.taken_date)}</p>
            <p className="text-xs font-medium text-accent">{lastDose.dose_mg}mg</p>
            {lastDose.feeling && (
              <p className="text-xs text-text-muted italic mt-1">"{lastDose.feeling}"</p>
            )}
          </div>
          {doses.length > 1 && (
            <div className="text-right">
              <p className="text-[10px] text-text-subtle uppercase tracking-widest mb-1">Previous</p>
              <p className="text-xs text-text">{fmt(doses[1].taken_date)}</p>
              <p className="text-xs text-text-muted">{doses[1].dose_mg}mg</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-text-subtle">
          No doses yet — log your injection naturally:<br />
          <span className="text-text-muted italic">"took my Mounjaro, 5mg"</span>
        </p>
      )}

      {latestEffect && (
        <div className="border-t border-border pt-3">
          <p className="text-[10px] text-text-subtle uppercase tracking-widest mb-2">
            {todayEffect ? "Today's symptoms" : `Symptoms · ${fmt(latestEffect.logged_date)}`}
          </p>
          <div className="flex flex-col gap-1.5">
            <Bar label="Nausea" value={latestEffect.nausea} />
            <Bar label="Appetite" value={latestEffect.appetite} />
            <Bar label="Energy" value={latestEffect.energy} />
          </div>
          {latestEffect.notes && (
            <p className="text-[10px] text-text-subtle italic mt-2">{latestEffect.notes}</p>
          )}
        </div>
      )}

      {doses.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="text-[10px] text-text-subtle uppercase tracking-widest mb-2">Dose history</p>
          <div className="flex flex-col gap-1">
            {doses.slice(0, 5).map((d) => (
              <div key={d.id} className="flex items-center justify-between py-0.5">
                <span className="text-xs text-text-muted">{fmt(d.taken_date)}</span>
                <span className="text-xs font-medium text-accent">{d.dose_mg}mg</span>
                {d.feeling && (
                  <span className="text-[10px] text-text-subtle italic truncate max-w-[80px]">{d.feeling}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
