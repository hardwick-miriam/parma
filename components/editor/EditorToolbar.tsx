'use client'

import { useReducer, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { Bold, Italic, Underline, Maximize, Minimize, Moon, Sun, BookOpen, Share2, Settings } from 'lucide-react'

type Props = {
  editor: Editor | null
  isFullscreen: boolean
  onToggleFullscreen: () => void
  darkMode: boolean
  onToggleDarkMode: () => void
  onReadingMode: () => void
  onShare: () => void
  onSettings: () => void
}

export default function EditorToolbar({
  editor, isFullscreen, onToggleFullscreen,
  darkMode, onToggleDarkMode, onReadingMode, onShare, onSettings,
}: Props) {
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    if (!editor) return
    editor.on('transaction', forceUpdate)
    return () => { editor.off('transaction', forceUpdate) }
  }, [editor])

  const formatButtons = [
    { label: 'Bold', icon: Bold, active: editor?.isActive('bold') ?? false, action: () => editor?.chain().focus().toggleBold().run(), shortcut: '⌘B' },
    { label: 'Italic', icon: Italic, active: editor?.isActive('italic') ?? false, action: () => editor?.chain().focus().toggleItalic().run(), shortcut: '⌘I' },
    { label: 'Underline', icon: Underline, active: editor?.isActive('underline') ?? false, action: () => editor?.chain().focus().toggleUnderline().run(), shortcut: '⌘U' },
  ]

  const btn = (active = false): React.CSSProperties => ({
    background: active ? 'rgba(181,150,78,0.15)' : 'transparent',
    border: active ? '1px solid rgba(181,150,78,0.35)' : '1px solid transparent',
    color: active ? 'var(--brass)' : 'var(--brass-dim)',
    filter: active ? 'sepia(0.5) saturate(2) brightness(1.1)' : 'sepia(0.3) saturate(1.5) brightness(0.7)',
    borderRadius: 4,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, cursor: 'pointer',
  })

  const hover = (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.color = 'var(--brass)' }
  const unhover = (e: React.MouseEvent<HTMLButtonElement>, active = false) => {
    e.currentTarget.style.color = active ? 'var(--brass)' : 'var(--brass-dim)'
  }

  return (
    <div className="flex items-center h-8 justify-between">
      <div className="flex items-center gap-0.5">
        {formatButtons.map(({ label, icon: Icon, active, action, shortcut }) => (
          <button key={label} onClick={action} title={`${label} (${shortcut})`} style={btn(active)}>
            <Icon size={12} />
          </button>
        ))}
      </div>

      <div className="flex items-center gap-0.5">
        <button title="Share document" onClick={onShare} style={btn()} onMouseEnter={hover} onMouseLeave={e => unhover(e)}>
          <Share2 size={12} />
        </button>
        <button title="Reading mode" onClick={onReadingMode} style={btn()} onMouseEnter={hover} onMouseLeave={e => unhover(e)}>
          <BookOpen size={12} />
        </button>
        <button title={darkMode ? 'Light mode' : 'Dark mode'} onClick={onToggleDarkMode} style={btn(darkMode)} onMouseEnter={hover} onMouseLeave={e => unhover(e, darkMode)}>
          {darkMode ? <Moon size={12} /> : <Sun size={12} />}
        </button>
        <button title="Page stack settings" onClick={onSettings} style={btn()} onMouseEnter={hover} onMouseLeave={e => unhover(e)}>
          <Settings size={12} />
        </button>
        <button title={isFullscreen ? 'Exit fullscreen (F11)' : 'Fullscreen (F11)'} onClick={onToggleFullscreen} style={btn(isFullscreen)} onMouseEnter={hover} onMouseLeave={e => unhover(e, isFullscreen)}>
          {isFullscreen ? <Minimize size={12} /> : <Maximize size={12} />}
        </button>
      </div>
    </div>
  )
}
