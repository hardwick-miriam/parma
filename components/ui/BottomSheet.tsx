'use client'

import { Drawer } from 'vaul'

interface BottomSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  children: React.ReactNode
}

/**
 * Vaul bottom sheet — use on mobile for detail views.
 * On desktop this appears as a centered dialog (handled by Vaul's shouldScaleBackground).
 */
export function BottomSheet({ open, onOpenChange, title, children }: BottomSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <Drawer.Portal>
        <Drawer.Overlay
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-[101] flex flex-col rounded-t-3xl outline-none"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-strong)',
            maxHeight: '85dvh',
          }}
        >
          <div
            className="w-10 h-1 rounded-full mx-auto mt-3 mb-1 shrink-0"
            style={{ background: 'var(--border-strong)' }}
          />
          {title && (
            <div className="px-6 py-3 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-base font-semibold text-text">{title}</h2>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
