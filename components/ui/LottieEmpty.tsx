'use client'

import dynamic from 'next/dynamic'

const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

import emptyData from '@/lib/lottie/empty.json'
import waveData from '@/lib/lottie/wave.json'

const ANIMATIONS: Record<string, object> = {
  empty: emptyData,
  wave: waveData,
}

interface LottieEmptyProps {
  title?: string
  subtitle?: string
  size?: number
  animation?: 'empty' | 'wave'
}

export function LottieEmpty({
  title = 'Nothing here yet',
  subtitle,
  size = 80,
  animation = 'empty',
}: LottieEmptyProps) {
  const data = ANIMATIONS[animation] ?? emptyData

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
      <Lottie
        animationData={data}
        loop
        style={{ width: size, height: size }}
      />
      <p className="text-sm font-medium text-text-muted">{title}</p>
      {subtitle && <p className="text-xs text-text-subtle">{subtitle}</p>}
    </div>
  )
}
