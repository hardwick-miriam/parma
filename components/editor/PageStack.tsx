'use client'

import { useState } from 'react'
import type { UserSettings } from '@/types'

const A4_HEIGHT = 1123

type Props = {
  pageCount: number
  pagePreviews: string[]
  settings: Pick<UserSettings, 'stack_style' | 'pages_visible' | 'gap' | 'shadow_depth'>
  darkMode: boolean
  onPageClick: (pageIdx: number) => void
}

export default function PageStack({ pageCount, pagePreviews, settings, darkMode, onPageClick }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)
  const { stack_style, pages_visible, gap, shadow_depth } = settings

  const shown = Math.min(pages_visible, pageCount - 1)
  if (shown <= 0) return null

  const peekW = 44
  const totalW = shown * (peekW + gap)

  const parchment = darkMode ? '#14100a' : '#f3ede4'
  const borderColor = darkMode ? 'rgba(120,80,20,0.35)' : 'rgba(168,144,100,0.45)'
  const numColor = darkMode ? 'rgba(180,140,70,0.38)' : 'rgba(80,55,25,0.32)'

  return (
    <div
      style={{
        position: 'relative',
        width: totalW,
        height: A4_HEIGHT,
        flexShrink: 0,
        pointerEvents: 'none',
      }}
    >
      {Array.from({ length: shown }, (_, i) => {
        const pageIdx = i + 1
        if (pageIdx >= pageCount) return null

        let transform = 'none'
        if (stack_style === 'Shuffled') {
          const jitter = Math.sin(pageIdx * 37.3) * 7
          transform = `translateY(${jitter}px)`
        } else if (stack_style === 'Slipped') {
          transform = `rotate(${i * 0.7}deg) translateY(${i * 5}px)`
        }

        const left = i * (peekW + gap)
        const isHov = hovered === pageIdx
        const preview = pagePreviews[pageIdx] || ''

        return (
          <div
            key={pageIdx}
            title={preview ? `Page ${pageIdx + 1}: ${preview}…` : `Page ${pageIdx + 1}`}
            onClick={() => onPageClick(pageIdx)}
            onMouseEnter={() => setHovered(pageIdx)}
            onMouseLeave={() => setHovered(null)}
            style={{
              position: 'absolute',
              left,
              top: 0,
              width: peekW,
              height: A4_HEIGHT,
              background: parchment,
              border: `1px solid ${borderColor}`,
              borderLeft: 'none',
              borderRadius: '0 2px 2px 0',
              boxShadow: `inset ${shadow_depth}px 0 ${shadow_depth * 1.8}px rgba(0,0,0,${isHov ? 0.35 : 0.22}), ${shadow_depth / 2}px 0 ${shadow_depth}px rgba(0,0,0,${isHov ? 0.4 : 0.25})`,
              cursor: 'pointer',
              transform,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingTop: '2.5rem',
              transition: 'box-shadow 0.18s ease, opacity 0.18s ease',
              opacity: isHov ? 1 : (0.88 - i * 0.07),
              zIndex: shown - i,
              pointerEvents: 'auto',
              userSelect: 'none',
            }}
          >
            <span
              style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                color: numColor,
                fontSize: '0.6rem',
                letterSpacing: '0.14em',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 300,
              }}
            >
              {pageIdx + 1}
            </span>
          </div>
        )
      })}
    </div>
  )
}
