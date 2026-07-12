'use client'

import Link from 'next/link'
import {
  LineChart, Line, BarChart, Bar, Cell, ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { MainPageData } from '@/lib/pageData/main'

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function TrendCard({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-2 hover:border-border-strong transition-colors block">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">{title}</p>
      {children}
    </Link>
  )
}

const tooltipStyle = { background: 'var(--surface-elevated)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12 }
const axisTick = { fontSize: 10, fill: 'var(--text-faint)' }

interface MainTrendsProps {
  weightTrend: MainPageData['weightTrend']
  sleepTrend: MainPageData['sleepTrend']
  caloriesTrend: MainPageData['caloriesTrend']
  stepsTrend: MainPageData['stepsTrend']
  recoveryStrainTrend: MainPageData['recoveryStrainTrend']
  hrvTrend: MainPageData['hrvTrend']
  calorieTarget: number
}

// Split out of MainClient and dynamically imported (see MainClient.tsx) so
// recharts' bundle doesn't block Main's initial paint — the briefing/rings/
// quick-nav above this section render immediately, this chunk streams in
// just after.
export default function MainTrends({
  weightTrend, sleepTrend, caloriesTrend, stepsTrend, recoveryStrainTrend, hrvTrend, calorieTarget,
}: MainTrendsProps) {
  return (
    <div>
      <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">Trends</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {weightTrend.length > 1 && (
          <TrendCard title="Weight (90d)" href="/health">
            <div style={{ width: '100%', height: 120 }}>
              <ResponsiveContainer>
                <LineChart data={weightTrend}>
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={axisTick} minTickGap={30} />
                  <YAxis tick={axisTick} width={32} domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip labelFormatter={(l) => fmtDate(String(l))} contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TrendCard>
        )}

        {recoveryStrainTrend.length > 1 && (
          <TrendCard title="Recovery & strain (14d)" href="/health">
            <div style={{ width: '100%', height: 120 }}>
              <ResponsiveContainer>
                <ComposedChart data={recoveryStrainTrend}>
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={axisTick} minTickGap={30} />
                  <YAxis tick={axisTick} width={28} />
                  <Tooltip labelFormatter={(l) => fmtDate(String(l))} contentStyle={tooltipStyle} />
                  <Bar dataKey="strain" fill="var(--warning)" opacity={0.5} barSize={6} />
                  <Line type="monotone" dataKey="recovery" stroke="var(--positive)" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </TrendCard>
        )}

        {sleepTrend.length > 1 && (
          <TrendCard title="Sleep vs 8h target (7d)" href="/health">
            <div style={{ width: '100%', height: 120 }}>
              <ResponsiveContainer>
                <BarChart data={sleepTrend}>
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={axisTick} />
                  <YAxis tick={axisTick} width={24} />
                  <Tooltip labelFormatter={(l) => fmtDate(String(l))} contentStyle={tooltipStyle} />
                  <ReferenceLine y={8} stroke="var(--text-faint)" strokeDasharray="3 3" />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                    {sleepTrend.map((d, i) => (
                      <Cell key={i} fill={d.hours >= 8 ? 'var(--positive)' : 'var(--warning)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TrendCard>
        )}

        {caloriesTrend.length > 1 && (
          <TrendCard title="Calories vs target (7d)" href="/food">
            <div style={{ width: '100%', height: 120 }}>
              <ResponsiveContainer>
                <BarChart data={caloriesTrend}>
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={axisTick} />
                  <YAxis tick={axisTick} width={36} />
                  <Tooltip labelFormatter={(l) => fmtDate(String(l))} contentStyle={tooltipStyle} />
                  <ReferenceLine y={calorieTarget} stroke="var(--text-faint)" strokeDasharray="3 3" />
                  <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
                    {caloriesTrend.map((d, i) => (
                      <Cell key={i} fill={d.calories <= calorieTarget ? 'var(--positive)' : 'var(--negative)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TrendCard>
        )}

        {hrvTrend.length > 1 && (
          <TrendCard title="HRV (14d)" href="/health">
            <div style={{ width: '100%', height: 100 }}>
              <ResponsiveContainer>
                <LineChart data={hrvTrend}>
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={axisTick} minTickGap={30} />
                  <YAxis tick={axisTick} width={28} />
                  <Tooltip labelFormatter={(l) => fmtDate(String(l))} contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="hrv" stroke="var(--accent)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TrendCard>
        )}

        {stepsTrend.length > 1 && (
          <TrendCard title="Steps (7d)" href="/health">
            <div style={{ width: '100%', height: 100 }}>
              <ResponsiveContainer>
                <BarChart data={stepsTrend}>
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={axisTick} />
                  <YAxis tick={axisTick} width={36} />
                  <Tooltip labelFormatter={(l) => fmtDate(String(l))} contentStyle={tooltipStyle} />
                  <Bar dataKey="steps" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TrendCard>
        )}
      </div>
    </div>
  )
}
