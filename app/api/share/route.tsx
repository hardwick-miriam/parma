import { NextRequest, NextResponse } from 'next/server'
import satori from 'satori'
import { createClient } from '@/lib/supabase/server'
import { getDailyStatsHistory } from '@/lib/db/history'
import { getTodayStats } from '@/lib/db/queries'
import { createServiceClient } from '@/lib/supabase/service'

// In-memory card cache: key → { data: Uint8Array | ArrayBuffer; expires: number }
const cardCache = new Map<string, { data: ArrayBuffer; expires: number }>()

async function getFont(): Promise<ArrayBuffer> {
  const cacheKey = '__inter_font__'
  const cached = cardCache.get(cacheKey)
  if (cached && cached.expires > Date.now()) return cached.data

  const res = await fetch(
    'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff',
    { next: { revalidate: 86400 } }
  )
  const buf = await res.arrayBuffer()
  cardCache.set(cacheKey, { data: buf, expires: Date.now() + 86400_000 })
  return buf
}

function moodEmoji(mood: string | null): string {
  const map: Record<string, string> = { great: '🌟', good: '😊', okay: '😐', low: '😔', bad: '😞' }
  return map[mood ?? ''] ?? ''
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'daily'
  const exercise = searchParams.get('exercise') ?? ''

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Cache key and TTL
  const today = new Date().toISOString().split('T')[0]
  const cacheKey = `${user.id}:${type}:${today}:${exercise}`
  const TTL = type === 'pr' ? 5 * 60_000 : 30 * 60_000

  const hit = cardCache.get(cacheKey)
  if (hit && hit.expires > Date.now()) {
    return new Response(hit.data, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=1800' },
    })
  }

  const font = await getFont()

  let jsx: React.ReactNode
  const W = 1200, H = 630
  const BG = '#0f0e17'
  const ACCENT = '#8b5cf6'
  const TEXT = '#f4f0fb'
  const MUTED = '#9d98b0'

  if (type === 'daily') {
    const stats = await getTodayStats(user.id)

    jsx = (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: W,
          height: H,
          background: BG,
          padding: 64,
          fontFamily: 'Inter',
          color: TEXT,
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 48 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: ACCENT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
            }}
          >
            📊
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 28, fontWeight: 700 }}>parma</span>
            <span style={{ fontSize: 16, color: MUTED }}>{today}</span>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'flex', gap: 24, flex: 1 }}>
          {[
            { label: 'Calories', value: stats?.calories ?? 0, unit: 'kcal', icon: '🍽️' },
            { label: 'Protein', value: stats?.protein_g ?? 0, unit: 'g', icon: '💪' },
            { label: 'Steps', value: stats?.steps ?? 0, unit: '', icon: '👟' },
            { label: 'Water', value: stats ? Math.round(stats.water_ml / 100) / 10 : 0, unit: 'L', icon: '💧' },
          ].map(({ label, value, unit, icon }) => (
            <div
              key={label}
              style={{
                flex: 1,
                background: '#1c1828',
                borderRadius: 20,
                padding: 32,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: 28 }}>{icon}</span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 42, fontWeight: 800, color: ACCENT }}>
                  {value.toLocaleString('en-GB')}{unit}
                </span>
                <span style={{ fontSize: 16, color: MUTED, marginTop: 4 }}>{label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Mood + sleep footer */}
        {(stats?.mood || stats?.sleep_hours) && (
          <div style={{ display: 'flex', gap: 24, marginTop: 24 }}>
            {stats?.mood && (
              <span style={{ fontSize: 18, color: MUTED }}>
                {moodEmoji(stats.mood)} Feeling {stats.mood}
              </span>
            )}
            {stats?.sleep_hours && (
              <span style={{ fontSize: 18, color: MUTED }}>
                😴 {stats.sleep_hours}h sleep
              </span>
            )}
          </div>
        )}
      </div>
    )
  } else if (type === 'weekly') {
    const history = await getDailyStatsHistory(user.id, 7)
    const totals = history.reduce(
      (acc, d) => ({
        calories: acc.calories + d.calories,
        protein_g: acc.protein_g + d.protein_g,
        steps: acc.steps + d.steps,
      }),
      { calories: 0, protein_g: 0, steps: 0 }
    )
    const days = history.length || 1
    const maxSteps = Math.max(...history.map((d) => d.steps), 1)

    jsx = (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: W,
          height: H,
          background: BG,
          padding: 64,
          fontFamily: 'Inter',
          color: TEXT,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
            📅
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 28, fontWeight: 700 }}>Weekly recap</span>
            <span style={{ fontSize: 16, color: MUTED }}>Last 7 days · parma</span>
          </div>
        </div>

        {/* Avg stats */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
          {[
            { label: 'avg kcal/day', value: Math.round(totals.calories / days).toLocaleString('en-GB') },
            { label: 'avg protein/day', value: `${Math.round(totals.protein_g / days)}g` },
            { label: 'avg steps/day', value: Math.round(totals.steps / days).toLocaleString('en-GB') },
            { label: 'days logged', value: `${days}/7` },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                flex: 1,
                background: '#1c1828',
                borderRadius: 16,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <span style={{ fontSize: 34, fontWeight: 800, color: ACCENT }}>{value}</span>
              <span style={{ fontSize: 14, color: MUTED, marginTop: 4 }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Steps bar chart */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flex: 1 }}>
          {history.map((d) => {
            const pct = d.steps / maxSteps
            const dayName = new Date(d.date + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short' })
            return (
              <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: '100%',
                    height: Math.max(8, pct * 160),
                    background: ACCENT,
                    borderRadius: 6,
                    opacity: 0.85,
                  }}
                />
                <span style={{ fontSize: 14, color: MUTED }}>{dayName}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  } else if (type === 'pr') {
    // Fetch the most recent PR for the exercise
    const svc = createServiceClient()
    const { data: pr } = await svc
      .from('personal_records')
      .select('*')
      .eq('user_id', user.id)
      .ilike('exercise', exercise || '%')
      .order('logged_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    jsx = (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: W,
          height: H,
          background: BG,
          padding: 80,
          fontFamily: 'Inter',
          color: TEXT,
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: 80, marginBottom: 24 }}>🏆</span>
        <span style={{ fontSize: 24, color: MUTED, fontWeight: 600, letterSpacing: 6, textTransform: 'uppercase', marginBottom: 16 }}>
          Personal Record
        </span>
        <span style={{ fontSize: 64, fontWeight: 800, marginBottom: 12 }}>
          {pr?.exercise ?? exercise}
        </span>
        {pr && (
          <span style={{ fontSize: 80, fontWeight: 900, color: ACCENT }}>
            {pr.value}{pr.unit}{pr.reps ? ` × ${pr.reps}` : ''}
          </span>
        )}
        <span style={{ fontSize: 18, color: MUTED, marginTop: 32 }}>
          logged with parma · {today}
        </span>
      </div>
    )
  } else {
    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  }

  const svg = await satori(jsx as Parameters<typeof satori>[0], {
    width: W,
    height: H,
    fonts: [{ name: 'Inter', data: font, weight: 400, style: 'normal' }],
  })

  // Convert SVG → PNG via @resvg/resvg-js if available, else serve SVG
  let outputData: ArrayBuffer
  let contentType: string
  try {
    const { Resvg } = await import('@resvg/resvg-js')
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: W } })
    const pngBuf = resvg.render().asPng()
    outputData = pngBuf.buffer.slice(pngBuf.byteOffset, pngBuf.byteOffset + pngBuf.byteLength) as ArrayBuffer
    contentType = 'image/png'
  } catch {
    const enc = new TextEncoder()
    outputData = enc.encode(svg).buffer as ArrayBuffer
    contentType = 'image/svg+xml'
  }

  cardCache.set(cacheKey, { data: outputData, expires: Date.now() + TTL })
  return new Response(outputData, {
    headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=1800' },
  })
}
