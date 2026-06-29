'use client'

import { useState } from 'react'
import { LogInput } from './LogInput'
import { ConfirmationDrawer } from './ConfirmationDrawer'
import { saveLog } from '@/app/actions'
import type { ParsedLog } from '@/lib/ai/types'

export function LogFlow() {
  const [pending, setPending] = useState<{ text: string; parsed: ParsedLog } | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  function handleParsed(text: string, parsed: ParsedLog) {
    setPending({ text, parsed })
    setSaveError(null)
  }

  async function handleConfirm(edited: ParsedLog) {
    const result = await saveLog(edited)
    if (result.error) {
      setSaveError(result.error)
    } else {
      setPending(null)
    }
  }

  function handleDiscard() {
    setPending(null)
    setSaveError(null)
  }

  return (
    <>
      <LogInput onParsed={handleParsed} />
      {saveError && (
        <p className="text-red-400 text-xs mt-2">{saveError}</p>
      )}
      {pending && (
        <ConfirmationDrawer
          rawText={pending.text}
          parsed={pending.parsed}
          onConfirm={handleConfirm}
          onDiscard={handleDiscard}
        />
      )}
    </>
  )
}
