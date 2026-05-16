type Props = {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: { img: 36, text: '0.65rem', gap: 10 },
  md: { img: 44, text: '0.8rem', gap: 12 },
  lg: { img: 72, text: '1.1rem', gap: 18 },
}

export default function Wordmark({ size = 'md', className }: Props) {
  const s = sizes[size]
  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: s.gap, flexShrink: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/crest.png" alt="" aria-hidden="true"
        style={{ height: s.img, width: 'auto', objectFit: 'contain', filter: 'grayscale(1) invert(1)', mixBlendMode: 'screen', opacity: 0.78 }} />
      <span style={{ color: '#d4cfc8', fontSize: s.text, letterSpacing: '0.22em', fontWeight: 300, textTransform: 'uppercase', fontFamily: 'var(--font-garamond)' }}>
        Parma
      </span>
    </div>
  )
}
