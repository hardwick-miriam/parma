'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SplashScreen from './SplashScreen'

type Props = {
  authenticated: boolean
  children: React.ReactNode
}

export default function SplashWrapper({ authenticated, children }: Props) {
  const [done, setDone] = useState(false)
  const router = useRouter()

  const onComplete = () => {
    if (authenticated) {
      router.push('/dashboard')
    } else {
      setDone(true)
    }
  }

  if (!done) return <SplashScreen onComplete={onComplete} />
  return <>{children}</>
}
