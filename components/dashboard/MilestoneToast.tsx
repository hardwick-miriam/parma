'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { type Milestone, dismissMilestone } from '@/lib/milestones'

export function MilestoneToast({ milestones }: { milestones: Milestone[] }) {
  const [queue, setQueue] = useState<Milestone[]>([])
  const current = queue[0] ?? null

  useEffect(() => {
    if (milestones.length > 0) setQueue(milestones)
  }, [milestones.length]) // only re-queue on count change

  const dismiss = useCallback(() => {
    if (!current) return
    dismissMilestone(current.id)
    setQueue((q) => q.slice(1))
  }, [current])

  useEffect(() => {
    if (!current) return
    const t = setTimeout(dismiss, 6000)
    return () => clearTimeout(t)
  }, [current?.id, dismiss])

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          className="fixed bottom-28 left-1/2 z-[200] px-4 w-full max-w-sm"
          style={{ translateX: '-50%' }}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <button
            className="w-full text-left"
            onClick={dismiss}
          >
            <div
              className="rounded-2xl p-4 flex items-start gap-3"
              style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border-strong)',
                boxShadow: 'var(--shadow-lg), 0 0 30px rgba(139,92,246,0.2)',
              }}
            >
              <span className="text-2xl leading-none shrink-0">{current.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text">{current.title}</p>
                <p className="text-xs text-text-muted mt-0.5">{current.message}</p>
              </div>
              <span className="text-text-subtle hover:text-text text-lg leading-none shrink-0">×</span>
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
