'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function NavigationProgress() {
  const pathname = usePathname()
  const [width, setWidth] = useState(0)
  const [visible, setVisible] = useState(false)
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    setVisible(true)
    setWidth(0)
    const t1 = setTimeout(() => setWidth(85), 20)
    const t2 = setTimeout(() => setWidth(100), 350)
    const t3 = setTimeout(() => setVisible(false), 550)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [pathname])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: 2,
        width: `${width}%`,
        background: 'linear-gradient(90deg, #6b2737, #a06878)',
        zIndex: 9999,
        transition: 'width 0.35s ease, opacity 0.2s ease',
        opacity: visible ? 1 : 0,
        pointerEvents: 'none',
      }}
    />
  )
}
