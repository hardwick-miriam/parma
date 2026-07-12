'use client'

import { useEffect, useState, useCallback } from 'react'

export function OfflineQueue() {
  const [offline, setOffline] = useState(false)
  const [queueCount, setQueueCount] = useState(0)
  const [flushing, setFlushing] = useState(false)

  useEffect(() => {
    setOffline(!navigator.onLine)

    async function updateCount() {
      const { pendingCount } = await import('@/lib/offlineQueue')
      setQueueCount(await pendingCount())
    }

    updateCount()

    const handleOnline = () => {
      setOffline(false)
      flush()
    }
    const handleOffline = () => setOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('parma:queued', updateCount)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('parma:queued', updateCount)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const flush = useCallback(async () => {
    const { flushQueue, pendingCount } = await import('@/lib/offlineQueue')
    const count = await pendingCount()
    if (count === 0) return
    setFlushing(true)
    await flushQueue(
      () => {
        window.dispatchEvent(new CustomEvent('parma:saved'))
      },
      (text, err) => {
        console.error('[offline-queue] flush failed for:', text.slice(0, 40), err)
      }
    )
    setQueueCount(await pendingCount())
    setFlushing(false)
  }, [])

  if (!offline && queueCount === 0) return null

  return (
    <div
      className="fixed top-16 left-1/2 z-[100] px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5"
      style={{
        transform: 'translateX(-50%)',
        background: offline ? 'rgba(239,68,68,0.15)' : 'var(--accent-dim)',
        border: `1px solid ${offline ? 'rgba(239,68,68,0.3)' : 'var(--accent)'}`,
        color: offline ? '#f87171' : 'var(--accent)',
      }}
    >
      {offline ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-negative" />
          Offline{queueCount > 0 ? ` · ${queueCount} queued` : ''}
        </>
      ) : (
        <>
          <span>{queueCount} queued</span>
          {flushing ? (
            <span>syncing…</span>
          ) : (
            <button onClick={flush} className="underline">sync now</button>
          )}
        </>
      )}
    </div>
  )
}
