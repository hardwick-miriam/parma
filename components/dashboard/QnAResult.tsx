'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface QnAResultProps {
  question: string
  answer: string
  loading: boolean
  onClose: () => void
}

export function QnAResult({ question, answer, loading, onClose }: QnAResultProps) {
  return (
    <AnimatePresence>
      {(loading || answer !== '') && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <motion.div
            className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 flex flex-col gap-4"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-strong)',
              boxShadow: 'var(--shadow-lg), 0 0 40px rgba(139,92,246,0.12)',
            }}
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* Question */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] text-text-subtle uppercase tracking-widest mb-1">Question</p>
                <p className="text-sm text-text-muted italic">{question}</p>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 w-7 h-7 rounded-full bg-surface-elevated flex items-center justify-center text-text-muted hover:text-text text-lg leading-none"
              >
                ×
              </button>
            </div>

            {/* Answer */}
            <div
              className="rounded-xl p-4"
              style={{ background: 'var(--accent-dim)', border: '1px solid rgba(139,92,246,0.2)' }}
            >
              {loading && answer === '' ? (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Looking through your data…
                </div>
              ) : (
                <p className="text-sm text-text leading-relaxed">
                  {answer}
                  {loading && (
                    <span
                      className="inline-block w-[2px] h-[1em] ml-[1px] align-middle"
                      style={{
                        background: 'var(--accent)',
                        animation: 'blink 0.8s step-end infinite',
                      }}
                    />
                  )}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
