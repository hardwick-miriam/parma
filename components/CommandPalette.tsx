'use client'

import { useEffect, useState, useCallback } from 'react'
import { Command } from 'cmdk'
import { useRouter } from 'next/navigation'
import { useTheme, type Theme } from './ThemeProvider'

interface CommandPaletteProps {
  onQuickLog?: (text: string) => void
  onToggleEditMode?: () => void
  onSyncWhoop?: () => void
  editMode?: boolean
}

const THEMES: Array<{ id: Theme; label: string }> = [
  { id: 'normal', label: 'Normal' },
  { id: 'hacker', label: 'Hacker' },
  { id: 'brutalism', label: 'Brutalism' },
  { id: 'old-money', label: 'Old Money' },
  { id: 'dark-academia', label: 'Dark Academia' },
  { id: 'midnight-ocean', label: 'Midnight Ocean' },
  { id: 'synthwave', label: 'Synthwave' },
]

export function CommandPalette({ onQuickLog, onToggleEditMode, onSyncWhoop, editMode }: CommandPaletteProps) {
  const [open, setOpen] = useState(false)
  const [logInput, setLogInput] = useState('')
  const [mode, setMode] = useState<'default' | 'log' | 'theme'>('default')
  const { setTheme } = useTheme()
  const router = useRouter()

  const openPalette = useCallback(() => {
    setOpen(true)
    setMode('default')
    setLogInput('')
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
        if (!open) { setMode('default'); setLogInput('') }
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function runAndClose(fn: () => void) {
    fn()
    setOpen(false)
    setMode('default')
  }

  function submitLog() {
    if (!logInput.trim()) return
    onQuickLog?.(logInput.trim())
    setOpen(false)
    setMode('default')
    setLogInput('')
  }

  if (!open) {
    return (
      <button
        onClick={openPalette}
        data-tour="command-palette"
        className="fixed bottom-20 right-4 z-40 sm:hidden p-3 rounded-full bg-surface border border-border shadow-lg text-text-muted"
        aria-label="Open command palette"
        title="Search (⌘K)"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
        </svg>
      </button>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <Command
        className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-strong)' }}
        shouldFilter={mode === 'default'}
      >
        {mode === 'log' ? (
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs text-text-muted shrink-0">Log:</span>
            <input
              autoFocus
              value={logInput}
              onChange={(e) => setLogInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitLog()
                if (e.key === 'Escape') { setMode('default'); setLogInput('') }
              }}
              placeholder="had oats and a coffee, went for a run…"
              className="flex-1 bg-transparent outline-none text-sm text-text placeholder:text-text-muted"
            />
            <button
              onClick={submitLog}
              className="text-xs px-2 py-1 rounded font-medium"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Log
            </button>
          </div>
        ) : (
          <Command.Input
            autoFocus
            placeholder="Search commands…"
            className="w-full px-4 py-3 bg-transparent outline-none text-sm text-text placeholder:text-text-muted border-b"
            style={{ borderColor: 'var(--border)' }}
          />
        )}

        {mode === 'default' && (
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-text-muted">
              No commands found
            </Command.Empty>

            <Command.Group heading="Log" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-text-muted">
              <CmdItem icon="✏️" label="Quick log" onSelect={() => setMode('log')} />
            </Command.Group>

            <Command.Group heading="Navigate" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-text-muted">
              <CmdItem icon="⚙️" label="Settings" onSelect={() => runAndClose(() => router.push('/settings'))} />
              <CmdItem icon="💡" label="Insights" onSelect={() => runAndClose(() => router.push('/insights'))} />
              <CmdItem icon="📋" label="Review" onSelect={() => runAndClose(() => router.push('/review'))} />
            </Command.Group>

            <Command.Group heading="Dashboard" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-text-muted">
              <CmdItem
                icon={editMode ? '🔒' : '✏️'}
                label={editMode ? 'Lock layout' : 'Edit layout'}
                onSelect={() => runAndClose(() => onToggleEditMode?.())}
              />
              {onSyncWhoop && (
                <CmdItem icon="🔄" label="Sync WHOOP" onSelect={() => runAndClose(() => onSyncWhoop())} />
              )}
            </Command.Group>

            <Command.Group heading="Theme" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-text-muted">
              <CmdItem icon="🎨" label="Switch theme…" onSelect={() => setMode('theme')} />
            </Command.Group>
          </Command.List>
        )}

        {mode === 'theme' && (
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Group heading="Choose theme" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-text-muted">
              {THEMES.map((t) => (
                <CmdItem
                  key={t.id}
                  icon="🎨"
                  label={t.label}
                  onSelect={() => runAndClose(() => setTheme(t.id))}
                />
              ))}
            </Command.Group>
          </Command.List>
        )}

        <div className="px-4 py-2 border-t flex items-center gap-3 text-xs text-text-muted" style={{ borderColor: 'var(--border)' }}>
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> select</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
          <span className="ml-auto"><kbd className="font-mono">⌘K</kbd></span>
        </div>
      </Command>
    </div>
  )
}

function CmdItem({ icon, label, onSelect }: { icon: string; label: string; onSelect: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-text data-[selected=true]:bg-accent/20 data-[selected=true]:text-accent outline-none"
    >
      <span className="text-base w-5 text-center shrink-0">{icon}</span>
      {label}
    </Command.Item>
  )
}
