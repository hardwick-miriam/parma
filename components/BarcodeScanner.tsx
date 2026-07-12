'use client'

import { useEffect, useRef, useState } from 'react'
import type { OFFProduct } from '@/lib/openFoodFacts'

interface BarcodeScannerProps {
  onResult: (product: OFFProduct, barcode: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onResult, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<{ stop: () => void } | null>(null)
  const divRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'starting' | 'scanning' | 'found' | 'error'>('starting')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let stopped = false

    async function init() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (!divRef.current || stopped) return

        const scanner = new Html5Qrcode('barcode-reader')
        scannerRef.current = { stop: () => scanner.stop().catch(() => {}) }
        setStatus('scanning')

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          async (decodedText) => {
            if (stopped) return
            stopped = true
            scanner.stop().catch(() => {})
            setStatus('found')

            try {
              const res = await fetch(`/api/food?barcode=${encodeURIComponent(decodedText)}`)
              const data = await res.json()
              if (data.product) {
                onResult(data.product as OFFProduct, decodedText)
              } else {
                setErrorMsg('Product not found in Open Food Facts.')
                setStatus('error')
              }
            } catch {
              setErrorMsg('Failed to look up barcode.')
              setStatus('error')
            }
          },
          undefined
        )
      } catch (err) {
        console.error('[barcode] init error:', err)
        setErrorMsg('Camera access denied or not available.')
        setStatus('error')
      }
    }

    init()

    return () => {
      stopped = true
      scannerRef.current?.stop()
    }
  }, [onResult])

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-strong)' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold text-text">Scan barcode</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text text-lg">×</button>
        </div>

        {status === 'error' ? (
          <div className="p-6 text-center">
            <p className="text-sm text-negative">{errorMsg}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div id="barcode-reader" ref={divRef} className="w-full" style={{ minHeight: 200 }} />
            <p className="text-center text-xs text-text-muted py-3">
              {status === 'starting' ? 'Starting camera…' : status === 'found' ? 'Found! Looking up…' : 'Point camera at barcode'}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
