'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeatherData {
  location: string
  temp: number
  feelsLike: number
  humidity: number
  description: string
  emoji: string
  windKph: number
  conditionCode: number
  isDay: boolean
  periods: Array<{ dt: number; temp: number; emoji: string; description: string }>
}

type ConditionKey =
  | 'clear-day' | 'clear-night'
  | 'partly-cloudy-day' | 'partly-cloudy-night'
  | 'clouds'
  | 'drizzle' | 'rain' | 'heavy-rain'
  | 'thunderstorm'
  | 'snow'
  | 'fog'

// ─── Condition mapping ────────────────────────────────────────────────────────

// Maps Open-Meteo WMO codes to animation condition keys
function getCondition(wmo: number, isDay: boolean): ConditionKey {
  if (wmo === 0 || wmo === 1) return isDay ? 'clear-day' : 'clear-night'
  if (wmo === 2) return isDay ? 'partly-cloudy-day' : 'partly-cloudy-night'
  if (wmo === 3) return 'clouds'
  if (wmo === 45 || wmo === 48) return 'fog'
  if (wmo >= 51 && wmo <= 57) return 'drizzle'
  if (wmo >= 61 && wmo <= 64) return 'rain'
  if (wmo === 65 || wmo === 66 || wmo === 67 || wmo === 82) return 'heavy-rain'
  if (wmo >= 71 && wmo <= 77) return 'snow'
  if (wmo >= 80 && wmo <= 81) return 'rain'
  if (wmo >= 85 && wmo <= 86) return 'snow'
  if (wmo >= 95) return 'thunderstorm'
  return isDay ? 'clear-day' : 'clear-night'
}

// ─── Background gradients ─────────────────────────────────────────────────────

const BG: Record<ConditionKey, string> = {
  'clear-day':           'linear-gradient(170deg, #0d0820 0%, #1e0f42 45%, #2d1505 100%)',
  'clear-night':         'linear-gradient(170deg, #020408 0%, #04091c 55%, #060b24 100%)',
  'partly-cloudy-day':   'linear-gradient(170deg, #0b0820 0%, #16102e 50%, #1a1430 100%)',
  'partly-cloudy-night': 'linear-gradient(170deg, #030408 0%, #05070f 55%, #07091a 100%)',
  'clouds':              'linear-gradient(170deg, #0c0f18 0%, #131720 55%, #161c28 100%)',
  'drizzle':             'linear-gradient(170deg, #090d18 0%, #0e1424 55%, #121a2e 100%)',
  'rain':                'linear-gradient(170deg, #060c18 0%, #0a1220 55%, #0e1828 100%)',
  'heavy-rain':          'linear-gradient(170deg, #040810 0%, #060c18 55%, #090f20 100%)',
  'thunderstorm':        'linear-gradient(170deg, #020308 0%, #040610 55%, #060918 100%)',
  'snow':                'linear-gradient(170deg, #0a0d14 0%, #0e1220 55%, #131828 100%)',
  'fog':                 'linear-gradient(170deg, #0c0e14 0%, #111420 55%, #161928 100%)',
}

// ─── Canvas particle animations ───────────────────────────────────────────────

interface RainDrop {
  x: number; y: number; speed: number
  length: number; opacity: number; width: number
}

function makeRaindrops(n: number, w: number, h: number, heavy: boolean): RainDrop[] {
  return Array.from({ length: n }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    speed: (heavy ? 9 : 6) + Math.random() * 5,
    length: (heavy ? 18 : 11) + Math.random() * 10,
    opacity: 0.25 + Math.random() * 0.45,
    width: heavy ? 1.4 : 0.8,
  }))
}

interface Snowflake {
  x: number; y: number; r: number
  speed: number; driftAmp: number; driftFreq: number; phase: number; opacity: number
}

function makeSnowflakes(n: number, w: number, h: number): Snowflake[] {
  return Array.from({ length: n }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: 1 + Math.random() * 3,
    speed: 0.6 + Math.random() * 1.4,
    driftAmp: 15 + Math.random() * 25,
    driftFreq: 0.3 + Math.random() * 0.5,
    phase: Math.random() * Math.PI * 2,
    opacity: 0.5 + Math.random() * 0.5,
  }))
}

interface Star {
  x: number; y: number; r: number
  baseOpacity: number; phase: number; twinkleSpeed: number
}

function makeStars(n: number, w: number, h: number): Star[] {
  return Array.from({ length: n }, () => ({
    x: Math.random() * w,
    y: Math.random() * h * 0.85,
    r: 0.4 + Math.random() * 1.6,
    baseOpacity: 0.35 + Math.random() * 0.65,
    phase: Math.random() * Math.PI * 2,
    twinkleSpeed: 0.4 + Math.random() * 1.2,
  }))
}

// ─── Canvas hook ──────────────────────────────────────────────────────────────

function useWeatherCanvas(
  condition: ConditionKey,
  reduced: boolean
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const stateRef = useRef<{
    drops: RainDrop[]; bgDrops: RainDrop[]
    flakes: Snowflake[]
    stars: Star[]
    flashOpacity: number
    nextFlash: number
    lastFlashTime: number
    startTime: number
  }>({
    drops: [], bgDrops: [], flakes: [], stars: [],
    flashOpacity: 0, nextFlash: 5000, lastFlashTime: 0, startTime: Date.now(),
  })

  const initParticles = useCallback((w: number, h: number) => {
    const s = stateRef.current
    const isRain = ['rain', 'heavy-rain', 'drizzle', 'thunderstorm'].includes(condition)
    const heavy = ['heavy-rain', 'thunderstorm'].includes(condition)
    if (isRain) {
      s.drops = makeRaindrops(heavy ? 100 : 65, w, h, heavy)
      s.bgDrops = makeRaindrops(heavy ? 60 : 40, w, h, false).map(d => ({
        ...d, speed: d.speed * 0.6, opacity: d.opacity * 0.35, width: 0.5,
      }))
    }
    if (condition === 'snow') {
      s.flakes = makeSnowflakes(70, w, h)
    }
    if (condition === 'clear-night' || condition === 'partly-cloudy-night') {
      s.stars = makeStars(100, w, h)
    }
    s.nextFlash = 4000 + Math.random() * 7000
  }, [condition])

  useEffect(() => {
    if (reduced) return
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1

    function resize() {
      if (!canvas) return
      const { offsetWidth: w, offsetHeight: h } = canvas
      canvas.width = w * dpr
      canvas.height = h * dpr
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)
      initParticles(w, h)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    function draw() {
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      const s = stateRef.current
      const t = (Date.now() - s.startTime) / 1000

      ctx.clearRect(0, 0, W, H)

      // ── Rain / drizzle / thunderstorm ──────────────────────────────────────
      if (['rain', 'heavy-rain', 'drizzle', 'thunderstorm'].includes(condition)) {
        const angle = 0.18 // slight wind tilt
        const dx = Math.sin(angle)
        const dy = Math.cos(angle)

        // Background rain layer (faint, fast)
        for (const d of s.bgDrops) {
          ctx.beginPath()
          ctx.strokeStyle = `rgba(180,210,240,${d.opacity})`
          ctx.lineWidth = d.width
          ctx.moveTo(d.x, d.y)
          ctx.lineTo(d.x + dx * d.length, d.y + dy * d.length)
          ctx.stroke()
          d.y += d.speed * 1.2
          d.x += d.speed * 0.15
          if (d.y > H + d.length) { d.y = -d.length; d.x = Math.random() * W }
          if (d.x > W + 20) d.x = -20
        }

        // Foreground rain layer
        for (const d of s.drops) {
          ctx.beginPath()
          ctx.strokeStyle = `rgba(200,225,250,${d.opacity})`
          ctx.lineWidth = d.width
          ctx.moveTo(d.x, d.y)
          ctx.lineTo(d.x + dx * d.length, d.y + dy * d.length)
          ctx.stroke()
          d.y += d.speed
          d.x += d.speed * 0.18
          if (d.y > H + d.length) { d.y = -d.length; d.x = Math.random() * W }
          if (d.x > W + 20) d.x = -20
        }

        // Lightning flash (thunderstorm only)
        if (condition === 'thunderstorm') {
          const now = Date.now()
          if (now - s.lastFlashTime > s.nextFlash) {
            s.flashOpacity = 0.55
            s.lastFlashTime = now
            s.nextFlash = 4000 + Math.random() * 8000
          }
          if (s.flashOpacity > 0.004) {
            ctx.fillStyle = `rgba(210,225,255,${s.flashOpacity})`
            ctx.fillRect(0, 0, W, H)
            s.flashOpacity *= 0.80
          }
        }
      }

      // ── Snow ──────────────────────────────────────────────────────────────
      if (condition === 'snow') {
        for (const f of s.flakes) {
          const x = f.x + f.driftAmp * Math.sin(t * f.driftFreq + f.phase)
          ctx.beginPath()
          ctx.arc(x, f.y, f.r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(220,235,255,${f.opacity})`
          ctx.fill()
          f.y += f.speed
          if (f.y > H + f.r) { f.y = -f.r; f.x = Math.random() * W }
        }
      }

      // ── Stars ─────────────────────────────────────────────────────────────
      if (condition === 'clear-night' || condition === 'partly-cloudy-night') {
        for (const st of s.stars) {
          const op = st.baseOpacity * (0.5 + 0.5 * Math.sin(t * st.twinkleSpeed + st.phase))
          ctx.beginPath()
          ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,255,255,${op})`
          ctx.fill()
        }
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [condition, reduced, initParticles])

  return canvasRef
}

// ─── CSS background elements ──────────────────────────────────────────────────

function SunElement() {
  return (
    <div className="absolute" style={{ top: '8%', right: '10%', zIndex: 1 }}>
      <div
        className="relative"
        style={{
          width: 64, height: 64,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #ffb347 0%, #ff8c00 55%, transparent 100%)',
          boxShadow: '0 0 30px 10px rgba(255,140,0,0.35), 0 0 60px 20px rgba(255,165,50,0.15)',
          animation: 'sun-pulse 4s ease-in-out infinite',
        }}
      />
      {/* Rays */}
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            width: 2, height: 22, left: 31, top: -14,
            transformOrigin: 'bottom center',
            transform: `rotate(${i * 45}deg)`,
            background: 'rgba(255,165,50,0.45)',
            borderRadius: 2,
            animation: `sun-ray-pulse 4s ease-in-out ${i * 0.1}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

function MoonElement() {
  return (
    <div className="absolute" style={{ top: '8%', right: '10%', zIndex: 1 }}>
      <div
        style={{
          width: 44, height: 44,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 38%, #d8e8ff, #b0c8e8)',
          boxShadow: '0 0 20px 6px rgba(180,210,255,0.25), 0 0 50px 15px rgba(140,170,255,0.10)',
          // Crescent mask via inner circle overlay
          position: 'relative',
          animation: 'moon-glow 5s ease-in-out infinite',
        }}
      >
        <div style={{
          position: 'absolute', width: 32, height: 32,
          borderRadius: '50%', top: -6, left: 10,
          background: 'linear-gradient(170deg, #04091c, #060b24)',
        }} />
      </div>
    </div>
  )
}

function CloudLayers({ opacity = 1 }: { opacity?: number }) {
  const clouds = [
    { w: 160, h: 70,  top: '12%', dur: 28, delay: 0,    op: 0.10, blur: 22, left: '-20%' },
    { w: 110, h: 50,  top: '28%', dur: 40, delay: -12,  op: 0.07, blur: 16, left: '-15%' },
    { w: 200, h: 80,  top: '8%',  dur: 22, delay: -6,   op: 0.06, blur: 26, left: '-25%' },
    { w: 130, h: 55,  top: '42%', dur: 50, delay: -20,  op: 0.05, blur: 14, left: '-18%' },
  ]
  return (
    <>
      {clouds.map((c, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            width: c.w, height: c.h,
            top: c.top,
            left: c.left,
            borderRadius: '50%',
            background: 'rgba(190,210,240,1)',
            filter: `blur(${c.blur}px)`,
            opacity: c.op * opacity,
            animation: `cloud-drift-${i % 2 === 0 ? 'a' : 'b'} ${c.dur}s ${c.delay}s linear infinite`,
            zIndex: 1,
          }}
        />
      ))}
    </>
  )
}

function FogLayer() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(${90 + i * 30}deg, rgba(160,180,210,0.06) 0%, rgba(160,180,210,0.12) 50%, rgba(160,180,210,0.06) 100%)`,
            filter: 'blur(8px)',
            animation: `fog-drift ${18 + i * 7}s ${-i * 5}s ease-in-out infinite alternate`,
            zIndex: 1,
          }}
        />
      ))}
    </>
  )
}

// ─── CSS keyframes injected once ─────────────────────────────────────────────

const KEYFRAMES = `
@keyframes sun-pulse {
  0%,100% { box-shadow: 0 0 30px 10px rgba(255,140,0,0.35), 0 0 60px 20px rgba(255,165,50,0.15); }
  50%      { box-shadow: 0 0 40px 14px rgba(255,140,0,0.5),  0 0 80px 28px rgba(255,165,50,0.22); }
}
@keyframes sun-ray-pulse {
  0%,100% { opacity: 0.45; height: 22px; }
  50%      { opacity: 0.7;  height: 28px; }
}
@keyframes moon-glow {
  0%,100% { box-shadow: 0 0 20px 6px rgba(180,210,255,0.25), 0 0 50px 15px rgba(140,170,255,0.10); }
  50%      { box-shadow: 0 0 28px 9px rgba(180,210,255,0.38), 0 0 70px 22px rgba(140,170,255,0.18); }
}
@keyframes cloud-drift-a {
  from { transform: translateX(0); }
  to   { transform: translateX(140vw); }
}
@keyframes cloud-drift-b {
  from { transform: translateX(0); }
  to   { transform: translateX(130vw); }
}
@keyframes fog-drift {
  from { transform: translateX(-4%) scaleX(1); }
  to   { transform: translateX(4%)  scaleX(1.06); }
}
`

let keyframesInjected = false
function injectKeyframes() {
  if (keyframesInjected || typeof document === 'undefined') return
  const style = document.createElement('style')
  style.textContent = KEYFRAMES
  document.head.appendChild(style)
  keyframesInjected = true
}

// ─── Weather background orchestrator ─────────────────────────────────────────

function WeatherBackground({ condition, reduced }: { condition: ConditionKey; reduced: boolean }) {
  useEffect(() => { injectKeyframes() }, [])
  const canvasRef = useWeatherCanvas(condition, reduced)

  const showSun = !reduced && condition === 'clear-day'
  const showMoon = !reduced && (condition === 'clear-night' || condition === 'partly-cloudy-night')
  const showClouds = !reduced && ['clouds', 'partly-cloudy-day', 'partly-cloudy-night', 'fog'].includes(condition)
  const showFog = !reduced && condition === 'fog'
  const cloudOpacity = condition === 'fog' ? 0.7 : condition === 'partly-cloudy-day' || condition === 'partly-cloudy-night' ? 0.6 : 1
  const hasCanvas = !reduced && ['rain', 'heavy-rain', 'drizzle', 'thunderstorm', 'snow', 'clear-night', 'partly-cloudy-night'].includes(condition)

  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl" style={{ zIndex: 0 }}>
      {/* Gradient base */}
      <div className="absolute inset-0" style={{ background: BG[condition] }} />

      {showSun && <SunElement />}
      {showMoon && <MoonElement />}
      {showClouds && <CloudLayers opacity={cloudOpacity} />}
      {showFog && <FogLayer />}

      {/* Particle canvas */}
      {hasCanvas && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ display: 'block' }}
        />
      )}

      {/* Vignette — pulls attention to content */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.45) 0%, transparent 70%)',
        }}
      />
    </div>
  )
}

// ─── Module-level cache ───────────────────────────────────────────────────────

let _cache: { data: WeatherData; lat: string; lon: string; ts: number } | null = null
const CACHE_TTL = 10 * 60 * 1000

function formatPeriodTime(dt: number) {
  return new Date(dt * 1000).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
}

// ─── Widget ───────────────────────────────────────────────────────────────────

export function WeatherWidget({ onData }: { onData?: (d: WeatherData) => void }) {
  const [data, setData] = useState<WeatherData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  useEffect(() => {
    let cancelled = false

    function fetchWeather(lat: string, lon: string) {
      if (_cache && _cache.lat === lat && _cache.lon === lon && Date.now() - _cache.ts < CACHE_TTL) {
        if (!cancelled) { setData(_cache.data); setLoading(false); onData?.(_cache.data) }
        return
      }
      fetch(`/api/weather?lat=${lat}&lon=${lon}`)
        .then((r) => r.json())
        .then((json) => {
          if (cancelled) return
          if (json.error) {
            setError(json.error === 'Weather not configured' ? 'No API key set' : json.error)
          } else {
            _cache = { data: json, lat, lon, ts: Date.now() }
            setData(json)
            onData?.(json)
          }
          setLoading(false)
        })
        .catch(() => {
          if (!cancelled) { setError('Could not load weather'); setLoading(false) }
        })
    }

    if (!navigator.geolocation) { setError('Geolocation unavailable'); setLoading(false); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(4)
        const lon = pos.coords.longitude.toFixed(4)
        fetchWeather(lat, lon)
      },
      () => { if (!cancelled) { setError('Location denied'); setLoading(false) } },
      { timeout: 8000 }
    )
    return () => { cancelled = true }
  }, [])

  const condition = data ? getCondition(data.conditionCode, data.isDay) : 'clear-night'

  return (
    <div
      className="relative rounded-2xl overflow-hidden flex flex-col h-full"
      style={{ minHeight: 260, boxShadow: 'var(--shadow-md)' }}
    >
      {/* Animated background */}
      {!loading && (data || error) && (
        <WeatherBackground condition={condition} reduced={reduced} />
      )}

      {/* Fallback static bg while loading */}
      {loading && (
        <div className="absolute inset-0 rounded-2xl" style={{ background: BG['clear-night'] }} />
      )}

      {/* Content */}
      <div className="relative flex flex-col gap-3 p-5 h-full" style={{ zIndex: 10 }}>
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest">Weather</h2>

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-white/30 text-xs">Locating…</span>
          </div>
        )}

        {error && !loading && (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-white/40 text-xs text-center">{error}</span>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Current */}
            <div className="flex items-start gap-2">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white tabular-nums" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
                    {data.temp}°
                  </span>
                  <span className="text-2xl leading-none">{data.emoji}</span>
                </div>
                <p className="text-xs text-white/70 mt-0.5 capitalize">{data.description}</p>
                <p className="text-[10px] text-white/45 mt-0.5">{data.location}</p>
              </div>
            </div>

            {/* Details */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              <span className="text-[11px] text-white/50">Feels {data.feelsLike}°</span>
              <span className="text-[11px] text-white/50">{data.humidity}% humidity</span>
              {data.windKph > 0 && (
                <span className="text-[11px] text-white/50">{data.windKph} km/h</span>
              )}
            </div>

            {/* Forecast */}
            {data.periods.length > 0 && (
              <div
                className="grid grid-cols-3 gap-1 pt-2 mt-auto"
                style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}
              >
                {data.periods.map((p) => (
                  <div key={p.dt} className="flex flex-col items-center gap-0.5 py-1">
                    <span className="text-[10px] text-white/45 tabular-nums">
                      {formatPeriodTime(p.dt)}
                    </span>
                    <span className="text-base leading-none">{p.emoji}</span>
                    <span className="text-xs font-semibold text-white/80 tabular-nums">{p.temp}°</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
