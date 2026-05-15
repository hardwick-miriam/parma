'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useDebounce } from 'use-debounce'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { AutocorrectExtension } from '@/lib/extensions/AutocorrectExtension'
import { createClient } from '@/lib/supabase/client'
import type { Document, Folder, WorldbuildingEntry } from '@/types'
import TipTapEditor from './TipTapEditor'
import EditorToolbar from './EditorToolbar'
import SaveIndicator from './SaveIndicator'
import WorldbuildingSidebar from '@/components/sidebar/WorldbuildingSidebar'
import { getWordCount, getReadingTime, extractPlainText } from '@/lib/utils/wordCount'
import { exportToPdf, exportToDocx } from '@/lib/utils/export'
import { ArrowLeft, BookOpen, Download, ChevronDown } from 'lucide-react'
import Link from 'next/link'

type SaveStatus = 'saved' | 'saving' | 'unsaved'

type Props = {
  document: Document
  folder: Folder
  initialWorldbuilding: WorldbuildingEntry[]
  userId: string
}

// All colour constants so nothing ends up in a CSS class that might be stripped
const C = {
  shellBg:    '#1c1510',
  headerBg:   '#120f0b',
  headerBorder: '#2a2218',
  toolbarBorder: '#1e1812',
  inputColor: '#9a8a78',
  dimText:    '#3a3228',
  surroundBg: 'radial-gradient(ellipse at 50% 35%, rgba(140,90,20,0.38) 0%, rgba(80,42,10,0.22) 28%, #1c1510 58%)',
  parchmentBg: [
    'radial-gradient(ellipse at 15% 85%, rgba(160,120,55,0.16) 0%, transparent 42%)',
    'radial-gradient(ellipse at 85% 15%, rgba(140,100,40,0.11) 0%, transparent 38%)',
    'radial-gradient(ellipse at 50% 105%, rgba(130,90,30,0.09) 0%, transparent 48%)',
    '#f5f0e8',
  ].join(', '),
  parchmentBorder: 'rgba(168,168,176,0.25)',
  parchmentShadow: '0 8px 80px rgba(0,0,0,0.7), 0 0 120px rgba(100,58,8,0.14), inset 0 0 80px rgba(180,140,60,0.05)',
  sidebarBg:  '#110e0b',
  sidebarBorder: '#2a2218',
}

export default function EditorClient({ document: doc, folder, initialWorldbuilding, userId }: Props) {
  const [title, setTitle] = useState(doc.title)
  const [content, setContent] = useState<object>(doc.content || {})
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [worldbuilding, setWorldbuilding] = useState<WorldbuildingEntry[]>(initialWorldbuilding)
  const supabase = createClient()

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        code: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      AutocorrectExtension,
    ],
    content: Object.keys(content).length > 0 ? content : undefined,
    editorProps: {
      attributes: {
        class: 'tiptap',
        spellcheck: 'true',
        autocorrect: 'on',
        autocapitalize: 'sentences',
      },
    },
    onUpdate({ editor }) {
      setContent(editor.getJSON())
      setSaveStatus('unsaved')
    },
    immediatelyRender: false,
  })

  const plainText = extractPlainText(content)
  const wordCount = getWordCount(plainText)
  const readingTime = getReadingTime(wordCount)

  const [debouncedContent] = useDebounce(content, 1500)
  const [debouncedTitle] = useDebounce(title, 1000)

  const save = useCallback(
    async (savedTitle: string, savedContent: object) => {
      setSaveStatus('saving')
      await supabase
        .from('documents')
        .update({ title: savedTitle, content: savedContent, updated_at: new Date().toISOString() })
        .eq('id', doc.id)
      setSaveStatus('saved')
    },
    [supabase, doc.id]
  )

  useEffect(() => {
    setSaveStatus('unsaved')
    save(debouncedTitle, debouncedContent)
  }, [debouncedTitle, debouncedContent]) // eslint-disable-line

  // Fullscreen — globalThis.document avoids shadowing the `doc` prop
  const toggleFullscreen = useCallback(() => {
    const dom = globalThis.document
    if (!dom.fullscreenElement) dom.documentElement.requestFullscreen()
    else dom.exitFullscreen()
  }, [])

  useEffect(() => {
    const dom = globalThis.document
    const onFS = () => setIsFullscreen(!!dom.fullscreenElement)
    dom.addEventListener('fullscreenchange', onFS)
    return () => dom.removeEventListener('fullscreenchange', onFS)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F11') { e.preventDefault(); toggleFullscreen() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleFullscreen])

  const exportRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!exportMenuOpen) return
    const close = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportMenuOpen(false)
    }
    globalThis.document.addEventListener('mousedown', close)
    return () => globalThis.document.removeEventListener('mousedown', close)
  }, [exportMenuOpen])

  const handleExportPdf = async () => { setExportMenuOpen(false); await exportToPdf(title, content) }
  const handleExportDocx = async () => { setExportMenuOpen(false); await exportToDocx(title, content) }

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: C.shellBg }}
    >
      {/* ── Top bar ──────────────────────────────────────── */}
      <header
        className="flex-shrink-0 border-b"
        style={{ background: C.headerBg, borderColor: C.headerBorder }}
      >
        {isFullscreen ? (
          <div className="max-w-3xl mx-auto px-6 h-10 flex items-center justify-between gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/crest.png"
              alt="Parma"
              style={{ height: 18, width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.4, objectFit: 'contain', flexShrink: 0 }}
            />
            <span style={{ color: '#4a3f2e', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
              {wordCount} words · {readingTime}
            </span>
            <SaveIndicator status={saveStatus} parchment />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 h-12 flex items-center gap-3">
            <Link href={`/folder/${folder.id}`} className="p-1 flex-shrink-0" style={{ color: C.dimText }}>
              <ArrowLeft size={15} />
            </Link>

            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setSaveStatus('unsaved') }}
              className="flex-1 bg-transparent outline-none min-w-0 text-sm"
              style={{ color: C.inputColor, fontWeight: 300, letterSpacing: '0.04em', caretColor: C.inputColor }}
              placeholder="Untitled"
            />

            <span className="hidden sm:block text-xs" style={{ color: C.dimText, letterSpacing: '0.04em', flexShrink: 0 }}>
              {wordCount} · {readingTime}
            </span>

            {/* Export */}
            <div className="relative flex-shrink-0" ref={exportRef}>
              <button
                onClick={() => setExportMenuOpen((v) => !v)}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded border"
                style={{ borderColor: '#2a2218', color: C.dimText, background: 'transparent' }}
              >
                <Download size={11} />
                <ChevronDown size={9} />
              </button>
              {exportMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 py-1 rounded border z-30"
                  style={{ background: '#1a1510', borderColor: '#2a2218', boxShadow: '0 8px 24px rgba(0,0,0,0.7)', minWidth: '7rem' }}
                >
                  {[['Export PDF', handleExportPdf], ['Export Word', handleExportDocx]].map(([label, fn]) => (
                    <button
                      key={label as string}
                      onClick={fn as () => void}
                      className="w-full text-left px-3 py-2 text-xs"
                      style={{ color: C.inputColor, letterSpacing: '0.04em', background: 'transparent' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#241e18' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      {label as string}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Worldbuilding */}
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs px-2 py-1 rounded border flex-shrink-0"
              style={{
                borderColor: sidebarOpen ? '#6b2737' : '#2a2218',
                color: sidebarOpen ? '#a06878' : C.dimText,
                background: sidebarOpen ? '#2d1520' : 'transparent',
              }}
            >
              <BookOpen size={11} />
              <span className="hidden sm:inline" style={{ letterSpacing: '0.04em' }}>World</span>
            </button>

            <SaveIndicator status={saveStatus} parchment />
          </div>
        )}

        {/* Toolbar row */}
        <div className="border-t" style={{ borderColor: C.toolbarBorder }}>
          <div className="max-w-4xl mx-auto px-4">
            <EditorToolbar editor={editor} isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen} />
          </div>
        </div>
      </header>

      {/* ── Content area ─────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Candlelight surround + parchment */}
        <main
          className="flex-1 overflow-y-auto"
          style={{ background: C.surroundBg }}
        >
          <div className="max-w-2xl mx-auto px-4 py-14">
            <div
              style={{
                background: C.parchmentBg,
                border: `1px solid ${C.parchmentBorder}`,
                boxShadow: C.parchmentShadow,
                borderRadius: 2,
                padding: '4rem 3.5rem',
                minHeight: '70vh',
                position: 'relative',
              }}
            >
              <TipTapEditor editor={editor} />
            </div>
          </div>
        </main>

        {/* Worldbuilding sidebar */}
        {sidebarOpen && !isFullscreen && (
          <aside
            className="w-72 border-l overflow-y-auto flex-shrink-0 hidden md:block"
            style={{ background: C.sidebarBg, borderColor: C.sidebarBorder }}
          >
            <WorldbuildingSidebar
              folderId={folder.id}
              userId={userId}
              initialEntries={worldbuilding}
              onChange={setWorldbuilding}
            />
          </aside>
        )}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && !isFullscreen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setSidebarOpen(false)}
        >
          <aside
            className="absolute right-0 top-0 bottom-0 w-72 border-l overflow-y-auto"
            style={{ background: C.sidebarBg, borderColor: C.sidebarBorder }}
            onClick={(e) => e.stopPropagation()}
          >
            <WorldbuildingSidebar
              folderId={folder.id}
              userId={userId}
              initialEntries={worldbuilding}
              onChange={setWorldbuilding}
            />
          </aside>
        </div>
      )}
    </div>
  )
}
