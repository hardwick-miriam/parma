'use client'

import { useState } from 'react'
import { ChevronRight, X } from 'lucide-react'

const STEPS = [
  {
    title: 'Welcome to Parma',
    desc: 'A writing space built for those who take their craft seriously. Atmospheric, distraction-free, and crafted like the tools of a working author.',
    svg: (
      <svg viewBox="0 0 200 140" width="200" height="140" fill="none">
        <rect x="40" y="20" width="120" height="100" rx="2" fill="#1e1812" stroke="rgba(192,144,80,0.3)" strokeWidth="0.5"/>
        <rect x="48" y="32" width="104" height="6" rx="1" fill="rgba(192,144,80,0.2)"/>
        <rect x="48" y="44" width="80" height="3" rx="1" fill="rgba(192,144,80,0.12)"/>
        <rect x="48" y="52" width="96" height="3" rx="1" fill="rgba(192,144,80,0.12)"/>
        <rect x="48" y="60" width="72" height="3" rx="1" fill="rgba(192,144,80,0.12)"/>
        <rect x="48" y="68" width="88" height="3" rx="1" fill="rgba(192,144,80,0.12)"/>
        <circle cx="160" cy="32" r="8" fill="rgba(120,55,8,0.6)" stroke="rgba(192,144,80,0.4)" strokeWidth="0.5"/>
        <path d="M157 32 L160 28 L163 32 L160 36 Z" fill="rgba(255,180,60,0.8)"/>
      </svg>
    ),
  },
  {
    title: 'Your Library',
    desc: 'Organise your work into Folios — folders for novels, stories, or projects. Each folio holds your documents, worldbuilding notes, and a timeline.',
    svg: (
      <svg viewBox="0 0 200 140" width="200" height="140" fill="none">
        {[0, 1, 2].map(i => (
          <rect key={i} x={20 + i * 52} y={30} width={44} height={80} rx="3" fill="#1e1812" stroke={`rgba(${i === 0 ? '107,39,55' : '58,50,40'},0.6)`} strokeWidth="0.5"/>
        ))}
        <rect x="22" y="38" width="40" height="6" rx="1" fill="rgba(107,39,55,0.4)"/>
        <rect x="22" y="50" width="30" height="3" rx="1" fill="rgba(90,80,72,0.3)"/>
        <rect x="22" y="57" width="36" height="3" rx="1" fill="rgba(90,80,72,0.3)"/>
        <rect x="74" y="38" width="40" height="4" rx="1" fill="rgba(90,80,72,0.2)"/>
        <rect x="74" y="48" width="28" height="3" rx="1" fill="rgba(90,80,72,0.15)"/>
        <rect x="126" y="38" width="40" height="4" rx="1" fill="rgba(90,80,72,0.2)"/>
      </svg>
    ),
  },
  {
    title: 'Build Your World',
    desc: 'Characters with portraits and relationship maps. Locations and lore in your worldbuilding sidebar. A living timeline for your story\'s events.',
    svg: (
      <svg viewBox="0 0 200 140" width="200" height="140" fill="none">
        {[
          { x: 60, y: 40, label: 'E' },
          { x: 140, y: 40, label: 'L' },
          { x: 100, y: 100, label: 'T' },
        ].map(({ x, y, label }) => (
          <g key={label}>
            <circle cx={x} cy={y} r={18} fill="#1e1812" stroke="rgba(192,144,80,0.3)" strokeWidth="0.5"/>
            <circle cx={x} cy={y} r={10} fill="#2a2218"/>
            <text x={x} y={y + 4} textAnchor="middle" fill="rgba(192,144,80,0.6)" fontSize="10" fontFamily="serif">{label}</text>
          </g>
        ))}
        <line x1="78" y1="46" x2="122" y2="46" stroke="rgba(192,144,80,0.25)" strokeWidth="0.5"/>
        <line x1="67" y1="57" x2="93" y2="88" stroke="rgba(192,144,80,0.25)" strokeWidth="0.5"/>
        <line x1="133" y1="57" x2="107" y2="88" stroke="rgba(192,144,80,0.25)" strokeWidth="0.5"/>
      </svg>
    ),
  },
  {
    title: 'Your desk is ready',
    desc: 'A sample folio — "The Darkwood Chronicles" — has been set up to show you around. Start there, or create your own. Write like the candles are always lit.',
    svg: (
      <svg viewBox="0 0 200 140" width="200" height="140" fill="none">
        <path d="M80 120 L100 20 L120 120" stroke="rgba(192,144,80,0.5)" strokeWidth="0.5" fill="none"/>
        <path d="M90 80 Q100 70 110 80" stroke="rgba(192,144,80,0.4)" strokeWidth="0.5" fill="none"/>
        <ellipse cx="100" cy="22" rx="6" ry="10" fill="rgba(255,160,40,0.7)" stroke="rgba(255,180,80,0.4)" strokeWidth="0.5"/>
        <rect x="70" y="118" width="60" height="4" rx="1" fill="rgba(90,80,72,0.4)"/>
        <rect x="60" y="125" width="80" height="3" rx="1" fill="rgba(90,80,72,0.25)"/>
        <circle cx="100" cy="22" r="16" fill="rgba(120,55,8,0.2)"/>
      </svg>
    ),
  },
]

type Props = { onComplete: () => void }

export default function OnboardingModal({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const s = STEPS[step]
  const isLast = step === STEPS.length - 1

  const ink = '#d4cfc8'
  const dim = '#5a5048'
  const bdr = '#2a2218'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#1a1510', border: `1px solid ${bdr}`, borderRadius: 4, padding: '2.5rem', width: '100%', maxWidth: 440, position: 'relative', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}>

        {/* Corner ornaments */}
        <svg style={{ position: 'absolute', top: 0, left: 0 }} width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M0 8 L0 0 L8 0" stroke="rgba(192,144,80,0.3)" strokeWidth="0.5"/>
        </svg>
        <svg style={{ position: 'absolute', top: 0, right: 0 }} width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M24 8 L24 0 L16 0" stroke="rgba(192,144,80,0.3)" strokeWidth="0.5"/>
        </svg>
        <svg style={{ position: 'absolute', bottom: 0, left: 0 }} width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M0 16 L0 24 L8 24" stroke="rgba(192,144,80,0.3)" strokeWidth="0.5"/>
        </svg>
        <svg style={{ position: 'absolute', bottom: 0, right: 0 }} width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M24 16 L24 24 L16 24" stroke="rgba(192,144,80,0.3)" strokeWidth="0.5"/>
        </svg>

        <button onClick={onComplete} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#3a3228', cursor: 'pointer', padding: 4 }}>
          <X size={14} />
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          {s.svg}
        </div>

        <h2 style={{ fontFamily: 'var(--font-garamond)', fontSize: '1.3rem', fontWeight: 400, color: ink, textAlign: 'center', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
          {s.title}
        </h2>
        <p style={{ color: dim, fontSize: '0.78rem', lineHeight: 1.8, textAlign: 'center', marginBottom: '2rem' }}>
          {s.desc}
        </p>

        {/* Step dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: '1.5rem' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ width: i === step ? 18 : 6, height: 6, borderRadius: 3, background: i === step ? '#6b2737' : '#2a2218', transition: 'width 0.2s' }} />
          ))}
        </div>

        <button onClick={isLast ? onComplete : () => setStep(s => s + 1)}
          style={{ width: '100%', padding: '10px', background: '#2d1520', border: '1px solid #6b2737', borderRadius: 3, color: '#d4cfc8', fontSize: '0.75rem', letterSpacing: '0.06em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          onMouseEnter={e => { e.currentTarget.style.background = '#6b2737' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#2d1520' }}>
          {isLast ? 'Begin writing' : (<>Continue <ChevronRight size={13} /></>)}
        </button>
      </div>
    </div>
  )
}
