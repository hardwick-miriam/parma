'use client'

import { useReducer, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { Bold, Italic, Underline, Maximize, Minimize } from 'lucide-react'

type Props = {
  editor: Editor | null
  isFullscreen: boolean
  onToggleFullscreen: () => void
}

export default function EditorToolbar({ editor, isFullscreen, onToggleFullscreen }: Props) {
  // Re-render on every transaction so active states stay accurate
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    if (!editor) return
    editor.on('transaction', forceUpdate)
    return () => { editor.off('transaction', forceUpdate) }
  }, [editor])

  const formatButtons = [
    {
      label: 'Bold',
      icon: Bold,
      active: editor?.isActive('bold') ?? false,
      action: () => editor?.chain().focus().toggleBold().run(),
      shortcut: '⌘B',
    },
    {
      label: 'Italic',
      icon: Italic,
      active: editor?.isActive('italic') ?? false,
      action: () => editor?.chain().focus().toggleItalic().run(),
      shortcut: '⌘I',
    },
    {
      label: 'Underline',
      icon: Underline,
      active: editor?.isActive('underline') ?? false,
      action: () => editor?.chain().focus().toggleUnderline().run(),
      shortcut: '⌘U',
    },
  ]

  const brassActive = 'filter: sepia(1) saturate(3) hue-rotate(10deg) brightness(1.1)'
  void brassActive // referenced only as description

  return (
    <div className="flex items-center gap-0.5 h-8 justify-between">
      <div className="flex items-center gap-0.5">
        {formatButtons.map(({ label, icon: Icon, active, action, shortcut }) => (
          <button
            key={label}
            onClick={action}
            title={`${label} (${shortcut})`}
            className="flex items-center justify-center w-7 h-7 rounded"
            style={{
              background: active ? 'rgba(181,150,78,0.15)' : 'transparent',
              border: active ? '1px solid rgba(181,150,78,0.35)' : '1px solid transparent',
              color: active ? 'var(--brass)' : 'var(--brass-dim)',
              filter: active
                ? 'sepia(0.5) saturate(2) brightness(1.1)'
                : 'sepia(0.3) saturate(1.5) brightness(0.7)',
            }}
          >
            <Icon size={12} />
          </button>
        ))}
      </div>

      {/* Fullscreen toggle */}
      <button
        onClick={onToggleFullscreen}
        title={isFullscreen ? 'Exit fullscreen (F11)' : 'Fullscreen (F11)'}
        className="flex items-center justify-center w-7 h-7 rounded"
        style={{
          background: isFullscreen ? 'rgba(181,150,78,0.1)' : 'transparent',
          border: '1px solid transparent',
          color: 'var(--brass-dim)',
          filter: 'sepia(0.3) saturate(1.5) brightness(0.7)',
        }}
        onMouseEnter={(e) => { (e.currentTarget).style.color = 'var(--brass)' }}
        onMouseLeave={(e) => { (e.currentTarget).style.color = 'var(--brass-dim)' }}
      >
        {isFullscreen ? <Minimize size={12} /> : <Maximize size={12} />}
      </button>
    </div>
  )
}
