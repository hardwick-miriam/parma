'use client'

import { useEffect, useState } from 'react'

type Props = {
  onComplete: () => void
}

export default function SplashScreen({ onComplete }: Props) {
  const [phase, setPhase] = useState(0)
  // 0 = black, 1 = candle+glow, 2 = crest, 3 = title, 4 = fade out

  useEffect(() => {
    playCandleSound()
    const t1 = setTimeout(() => setPhase(1), 350)
    const t2 = setTimeout(() => setPhase(2), 1600)
    const t3 = setTimeout(() => setPhase(3), 2550)
    const t4 = setTimeout(() => setPhase(4), 4100)
    const t5 = setTimeout(() => onComplete(), 5000)
    return () => { [t1, t2, t3, t4, t5].forEach(clearTimeout) }
  }, [onComplete])

  const fade = (show: boolean, delay = 0) => ({
    opacity: show ? 1 : 0,
    transition: `opacity 0.9s ease ${delay}ms`,
    pointerEvents: 'none' as const,
  })

  return (
    <div
      onClick={() => { if (phase >= 1) { setPhase(4); setTimeout(onComplete, 800) } }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: '#000',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        opacity: phase === 4 ? 0 : 1,
        transition: phase === 4 ? 'opacity 0.9s ease' : undefined,
        cursor: phase >= 1 ? 'pointer' : 'default',
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 65%, rgba(160,80,10,0.55) 0%, rgba(100,45,5,0.28) 30%, transparent 65%)',
        ...fade(phase >= 1),
        animation: phase >= 1 ? 'glowPulse 3.5s ease-in-out infinite' : undefined,
      }} />

      {/* Candle */}
      <div style={{ ...fade(phase >= 1), position: 'absolute', bottom: '18%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <CandleSVG />
      </div>

      {/* Crest */}
      <div style={{ ...fade(phase >= 2), position: 'relative', marginBottom: '1.5rem' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/crest.png"
          alt="Parma"
          style={{
            height: 110,
            width: 'auto',
            filter: 'grayscale(1) invert(1)',
            mixBlendMode: 'screen',
            opacity: 0.82,
            objectFit: 'contain',
          }}
        />
      </div>

      {/* Title */}
      <div style={fade(phase >= 3)}>
        <p style={{
          color: 'rgba(200,192,180,0.75)',
          fontSize: '0.65rem',
          letterSpacing: '0.45em',
          textTransform: 'uppercase',
          fontWeight: 300,
          fontFamily: 'Inter, sans-serif',
          marginTop: '0.25rem',
        }}>
          Parma
        </p>
      </div>
    </div>
  )
}

function CandleSVG() {
  return (
    <svg
      viewBox="0 0 50 120"
      width="44"
      height="105"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <radialGradient id="sp-fg" cx="50%" cy="75%" r="55%">
          <stop offset="0%" stopColor="#fff9c0" />
          <stop offset="25%" stopColor="#ffcc50" />
          <stop offset="60%" stopColor="#ff8020" />
          <stop offset="100%" stopColor="rgba(200,60,0,0)" />
        </radialGradient>
        <radialGradient id="sp-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff9030" stopOpacity="0.45" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      {/* Outer glow halo */}
      <ellipse cx="25" cy="28" rx="22" ry="28"
        fill="url(#sp-glow)"
        style={{ animation: 'glowPulse 2.8s ease-in-out infinite' }}
      />

      {/* Flame body */}
      <g style={{
        transformOrigin: '25px 70px',
        transformBox: 'fill-box',
        animation: 'flameWaver 0.4s ease-in-out infinite alternate',
      }}>
        <path
          d="M 25 70 Q 37 58 34 36 Q 31 18 25 8 Q 19 18 16 36 Q 13 58 25 70 Z"
          fill="url(#sp-fg)"
        />
        {/* Bright inner core */}
        <ellipse cx="25" cy="54" rx="4.5" ry="9" fill="rgba(255,252,210,0.92)" />
      </g>

      {/* Candle body */}
      <rect x="17" y="72" width="16" height="44" rx="2" fill="#ece3cc" />
      <rect x="17" y="72" width="16" height="5" rx="1" fill="#d8ceae" />

      {/* Wick */}
      <path d="M 25 65 Q 26.5 68.5 25 72" stroke="#555" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function playCandleSound() {
  try {
    const ctx = new AudioContext()
    const duration = 4.5
    const sr = ctx.sampleRate
    const buf = ctx.createBuffer(1, sr * duration, sr)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.14
    }

    const src = ctx.createBufferSource()
    src.buffer = buf

    const lpf = ctx.createBiquadFilter()
    lpf.type = 'lowpass'
    lpf.frequency.value = 700
    lpf.Q.value = 0.4

    const gain = ctx.createGain()
    const now = ctx.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.22, now + 1)
    gain.gain.linearRampToValueAtTime(0.16, now + duration - 1)
    gain.gain.linearRampToValueAtTime(0, now + duration)

    src.connect(lpf)
    lpf.connect(gain)
    gain.connect(ctx.destination)
    src.start()
  } catch {
    // Autoplay blocked — silently skip
  }
}
