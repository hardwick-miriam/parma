'use client'

import { useReducer, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { Bold, Italic, Underline, Maximize, Minimize, Moon, Sun, BookOpen, Share2 } from 'lucide-react'

type Props = {
  editor: Editor | null
  isFullscreen: boolean
  onToggleFullscreen: () => void
  darkMode: boolean
  onToggleDarkMode: () => void
  onReadingMode: () => void
  onShare: () => void
}

export default function EditorToolbar({
  editor, isFullscreen, onToggleFullscreen,
  darkMode, onToggleDarkMode, onReadingMode, onShare,
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

  const iconBtn = (active = false): React.CSSProperties => ({
    background: active ? 'rgba(181,150,78,0.15)' : 'transparent',
    border: active ? '1px solid rgba(181,150,78,0.35)' : '1px solid transparent',
    color: active ? 'var(--brass)' : 'var(--brass-dim)',
    filter: active ? 'sepia(0.5) saturate(2) brightness(1.1)' : 'sepia(0.3) saturate(1.5) brightness(0.7)',
    borderRadius: 4,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, cursor: 'pointer',
  })

  return (
    <div className="flex items-center h-8 justify-between">
      {/* Format buttons */}
      <div className="flex items-center gap-0.5">
        {formatButtons.map(({ label, icon: Icon, active, action, shortcut }) => (
          <button key={label} onClick={action} title={`${label} (${shortcut})`} style={iconBtn(active)}>
            <Icon size={12} />
          </button>
        ))}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onShare}
          title="Share document"
          style={iconBtn()}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--brass)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--brass-dim)' }}
        >
          <Share2 size={12} />
        </button>

        <button
          onClick={onReadingMode}
          title="Reading mode"
          style={iconBtn()}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--brass)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--brass-dim)' }}
        >
          <BookOpen size={12} />
        </button>

        <button
          onClick={onToggleDarkMode}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          style={iconBtn(darkMode)}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--brass)' }}
          onMouseLeave={e => { e.currentTarget.style.color = darkMode ? 'var(--brass)' : 'var(--brass-dim)' }}
        >
          {darkMode ? <Moon size={12} /> : <Sun size={12} />}
        </button>

        <button
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen (F11)' : 'Fullscreen (F11)'}
          style={iconBtn(isFullscreen)}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--brass)' }}
          onMouseLeave={e => { e.currentTarget.style.color = isFullscreen ? 'var(--brass)' : 'var(--brass-dim)' }}
        >
          {isFullscreen ? <Minimize size={12} /> : <Maximize size={12} />}
        </button>
      </div>
    </div>
  )
}
