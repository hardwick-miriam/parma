'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useDebounce } from 'use-debounce'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { AutocorrectExtension } from '@/lib/extensions/AutocorrectExtension'
import { createClient } from '@/lib/supabase/client'
import type { Document, Folder, WorldbuildingEntry, UserSettings } from '@/types'
import TipTapEditor from './TipTapEditor'
import EditorToolbar from './EditorToolbar'
import SaveIndicator from './SaveIndicator'
import ReadingMode from './ReadingMode'
import ShareModal from './ShareModal'
import PageStack from './PageStack'
import SettingsPanel from '@/components/settings/SettingsPanel'
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
  initialSettings: UserSettings
  isPremium: boolean
}

const A4_HEIGHT = 1123
const CHARS_PER_PAGE = 2000

const DARK = {
  shellBg:         '#0e0b08',
  headerBg:        '#080604',
  headerBorder:    '#1e1812',
  toolbarBorder:   '#141008',
  surroundBg:      'radial-gradient(ellipse at 50% 35%, rgba(180,110,10,0.65) 0%, rgba(90,46,5,0.42) 28%, #0e0b08 58%)',
  parchmentBg:     '#141008',
  parchmentBorder: 'rgba(120,80,20,0.25)',
  parchmentShadow: '0 8px 80px rgba(0,0,0,0.9), 0 0 140px rgba(120,70,5,0.28), inset 0 0 80px rgba(160,110,20,0.08)',
  ink:             '#e8dfc8',
  breakLine:       'rgba(180,130,50,0.18)',
}

const LIGHT = {
  shellBg:         '#1c1510',
  headerBg:        '#120f0b',
  headerBorder:    '#2a2218',
  toolbarBorder:   '#1e1812',
  surroundBg:      'radial-gradient(ellipse at 50% 35%, rgba(140,90,20,0.38) 0%, rgba(80,42,10,0.22) 28%, #1c1510 58%)',
  parchmentBg: [
    'radial-gradient(ellipse at 15% 85%, rgba(160,120,55,0.16) 0%, transparent 42%)',
    'radial-gradient(ellipse at 85% 15%, rgba(140,100,40,0.11) 0%, transparent 38%)',
    'radial-gradient(ellipse at 50% 105%, rgba(130,90,30,0.09) 0%, transparent 48%)',
    '#f5f0e8',
  ].join(', '),
  parchmentBorder: 'rgba(168,168,176,0.25)',
  parchmentShadow: '0 8px 80px rgba(0,0,0,0.7), 0 0 120px rgba(100,58,8,0.14), inset 0 0 80px rgba(180,140,60,0.05)',
  ink:             '#2a1f0a',
  breakLine:       'rgba(100,70,30,0.1)',
}

const inputColor = '#9a8a78'
const dimText    = '#3a3228'
const sidebarBg  = '#110e0b'
const sidebarBdr = '#2a2218'

export default function EditorClient({ document: doc, folder, initialWorldbuilding, userId, initialSettings, isPremium }: Props) {
  const [title, setTitle] = useState(doc.title)
  const [content, setContent] = useState<object>(doc.content || {})
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [worldbuilding, setWorldbuilding] = useState<WorldbuildingEntry[]>(initialWorldbuilding)
  const [darkMode, setDarkMode] = useState(doc.dark_mode ?? false)
  const [readingMode, setReadingMode] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<UserSettings>(initialSettings)
  const [parchHeight, setParchHeight] = useState(A4_HEIGHT)

  const supabase = createClient()
  const C = darkMode ? DARK : LIGHT
  const mainRef = useRef<HTMLElement>(null)
  const parchmentRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)
  const settingsBtnRef = useRef<HTMLDivElement>(null)

  // Measure parchment to derive page count
  useEffect(() => {
    const el = parchmentRef.current
    if (!el) return
    const obs = new ResizeObserver(() => setParchHeight(el.offsetHeight))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const pageCount = Math.max(1, Math.ceil(parchHeight / A4_HEIGHT))

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, blockquote: false, codeBlock: false,
        horizontalRule: false, strike: false, code: false,
        bulletList: false, orderedList: false, listItem: false,
      }),
      AutocorrectExtension,
    ],
    content: Object.keys(content).length > 0 ? content : undefined,
    editorProps: {
      attributes: { class: 'tiptap', spellcheck: 'true', autocorrect: 'on', autocapitalize: 'sentences' },
    },
    onUpdate({ editor }) { setContent(editor.getJSON()); setSaveStatus('unsaved') },
    immediatelyRender: false,
  })

  const plainText = extractPlainText(content)
  const wordCount = getWordCount(plainText)
  const readingTime = getReadingTime(wordCount)

  const pagePreviews = Array.from({ length: pageCount }, (_, i) =>
    plainText.slice(i * CHARS_PER_PAGE, i * CHARS_PER_PAGE + 100).trim()
  )

  const [debouncedContent] = useDebounce(content, 1500)
  const [debouncedTitle] = useDebounce(title, 1000)
  const [debouncedSettings] = useDebounce(settings, 700)

  const save = useCallback(async (t: string, c: object) => {
    setSaveStatus('saving')
    const wc = getWordCount(extractPlainText(c))
    await Promise.all([
      supabase.from('documents').update({ title: t, content: c, updated_at: new Date().toISOString() }).eq('id', doc.id),
      supabase.from('profiles').upsert(
        { user_id: userId, last_active_at: new Date().toISOString(), total_words_written: wc },
        { onConflict: 'user_id' }
      ),
    ])
    setSaveStatus('saved')
  }, [supabase, doc.id, userId]) // eslint-disable-line

  useEffect(() => { setSaveStatus('unsaved'); save(debouncedTitle, debouncedContent) }, [debouncedTitle, debouncedContent]) // eslint-disable-line

  useEffect(() => {
    supabase.from('user_settings').upsert({ ...debouncedSettings, user_id: userId }, { onConflict: 'user_id' })
  }, [debouncedSettings]) // eslint-disable-line

  const toggleDarkMode = useCallback(async () => {
    const next = !darkMode
    setDarkMode(next)
    await supabase.from('documents').update({ dark_mode: next }).eq('id', doc.id)
  }, [darkMode, supabase, doc.id])

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
    const onKey = (e: KeyboardEvent) => { if (e.key === 'F11') { e.preventDefault(); toggleFullscreen() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleFullscreen])

  useEffect(() => {
    if (!exportMenuOpen) return
    const close = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportMenuOpen(false)
    }
    globalThis.document.addEventListener('mousedown', close)
    return () => globalThis.document.removeEventListener('mousedown', close)
  }, [exportMenuOpen])

  const scrollToPage = useCallback((pageIdx: number) => {
    mainRef.current?.scrollTo({ top: pageIdx * A4_HEIGHT, behavior: 'smooth' })
  }, [])

  const handleExportPdf = async () => { setExportMenuOpen(false); await exportToPdf(title, content) }
  const handleExportDocx = async () => {
    setExportMenuOpen(false)
    if (!isPremium) { window.location.href = '/subscribe'; return }
    await exportToDocx(title, content)
  }

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: C.shellBg, '--tiptap-ink': C.ink } as React.CSSProperties}
    >
      {readingMode && (
        <ReadingMode title={title} html={editor?.getHTML() ?? ''} darkMode={darkMode} onClose={() => setReadingMode(false)} />
      )}
      {shareOpen && (
        <ShareModal documentId={doc.id} userId={userId} onClose={() => setShareOpen(false)} />
      )}

      {/* ── Top bar ── */}
      <header className="flex-shrink-0 border-b" style={{ background: C.headerBg, borderColor: C.headerBorder }}>
        {isFullscreen ? (
          <div className="max-w-3xl mx-auto px-6 h-10 flex items-center justify-between gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/crest.png" alt="Parma" style={{ height: 18, filter: 'grayscale(1) invert(1)', mixBlendMode: 'screen', opacity: 0.4, flexShrink: 0 }} />
            <span style={{ color: '#4a3f2e', fontSize: '0.7rem', letterSpacing: '0.05em' }}>{wordCount} words · {readingTime}</span>
            <SaveIndicator status={saveStatus} parchment />
          </div>
        ) : (
          <div className="max-w-5xl mx-auto px-4 h-12 flex items-center gap-3">
            <Link href={`/folder/${folder.id}`} className="p-1 flex-shrink-0" style={{ color: dimText }}>
              <ArrowLeft size={15} />
            </Link>
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setSaveStatus('unsaved') }}
              className="flex-1 bg-transparent outline-none min-w-0 text-sm"
              style={{ color: inputColor, fontWeight: 300, letterSpacing: '0.04em', caretColor: inputColor }}
              placeholder="Untitled"
            />
            <span className="hidden sm:block text-xs" style={{ color: dimText, letterSpacing: '0.04em', flexShrink: 0 }}>
              {wordCount} · {readingTime}
            </span>
            {/* Export */}
            <div className="relative flex-shrink-0" ref={exportRef}>
              <button onClick={() => setExportMenuOpen(v => !v)} className="flex items-center gap-1 text-xs px-2 py-1 rounded border" style={{ borderColor: '#2a2218', color: dimText, background: 'transparent' }}>
                <Download size={11} /><ChevronDown size={9} />
              </button>
              {exportMenuOpen && (
                <div className="absolute right-0 top-full mt-1 py-1 rounded border z-30" style={{ background: '#1a1510', borderColor: '#2a2218', boxShadow: '0 8px 24px rgba(0,0,0,0.7)', minWidth: '8rem' }}>
                  <button onClick={handleExportPdf} className="w-full text-left px-3 py-2 text-xs" style={{ color: inputColor, letterSpacing: '0.04em', background: 'transparent' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#241e18' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                    Export PDF
                  </button>
                  <button onClick={handleExportDocx} className="w-full text-left px-3 py-2 text-xs flex items-center justify-between" style={{ color: isPremium ? inputColor : '#3a3228', letterSpacing: '0.04em', background: 'transparent' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#241e18' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                    Export Word
                    {!isPremium && <span style={{ fontSize: '0.55rem', color: '#5a5048', marginLeft: 6 }}>Premium</span>}
                  </button>
                </div>
              )}
            </div>
            {/* Worldbuilding */}
            <button onClick={() => setSidebarOpen(v => !v)} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded border flex-shrink-0"
              style={{ borderColor: sidebarOpen ? '#6b2737' : '#2a2218', color: sidebarOpen ? '#a06878' : dimText, background: sidebarOpen ? '#2d1520' : 'transparent' }}>
              <BookOpen size={11} />
              <span className="hidden sm:inline" style={{ letterSpacing: '0.04em' }}>World</span>
            </button>
            <SaveIndicator status={saveStatus} parchment />
          </div>
        )}
        {/* Toolbar */}
        <div className="border-t" style={{ borderColor: C.toolbarBorder }}>
          <div className="max-w-5xl mx-auto px-4">
            <div style={{ position: 'relative' }} ref={settingsBtnRef}>
              <EditorToolbar
                editor={editor}
                isFullscreen={isFullscreen}
                onToggleFullscreen={toggleFullscreen}
                darkMode={darkMode}
                onToggleDarkMode={toggleDarkMode}
                onReadingMode={() => setReadingMode(true)}
                onShare={() => setShareOpen(true)}
                onSettings={() => setSettingsOpen(v => !v)}
              />
              {settingsOpen && (
                <SettingsPanel
                  settings={settings}
                  onChange={setSettings}
                  onClose={() => setSettingsOpen(false)}
                />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="flex flex-1 overflow-hidden">
        <main ref={mainRef} className="flex-1 overflow-y-auto" style={{ background: C.surroundBg }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '3.5rem 2rem 6rem' }}>
            {/* Page + stack row */}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
              {/* A4 Parchment page */}
              <div
                ref={parchmentRef}
                style={{
                  width: 794,
                  minHeight: A4_HEIGHT,
                  background: C.parchmentBg,
                  border: `1px solid ${C.parchmentBorder}`,
                  boxShadow: C.parchmentShadow,
                  borderRadius: 2,
                  padding: '4rem 3.5rem',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                {/* Page break lines */}
                {Array.from({ length: pageCount - 1 }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: 0, right: 0,
                      top: (i + 1) * A4_HEIGHT,
                      borderTop: `1px dashed ${C.breakLine}`,
                      pointerEvents: 'none',
                    }}
                  />
                ))}
                {/* Candlelight */}
                <div
                  className={darkMode ? 'candle-flicker' : ''}
                  style={{
                    position: 'absolute', inset: 0, borderRadius: 2, pointerEvents: 'none',
                    background: darkMode
                      ? 'radial-gradient(ellipse at 50% 0%, rgba(200,130,20,0.14) 0%, transparent 55%)'
                      : 'radial-gradient(ellipse at 50% 0%, rgba(200,150,50,0.06) 0%, transparent 50%)',
                  }}
                />
                <TipTapEditor editor={editor} />
              </div>

              {/* Page stack — sticky so it stays visible while scrolling */}
              {!isFullscreen && (
                <div style={{ position: 'sticky', top: '3.5rem', alignSelf: 'flex-start' }}>
                  <PageStack
                    pageCount={pageCount}
                    pagePreviews={pagePreviews}
                    settings={settings}
                    darkMode={darkMode}
                    onPageClick={scrollToPage}
                  />
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Worldbuilding sidebar */}
        {sidebarOpen && !isFullscreen && (
          <aside className="w-72 border-l overflow-y-auto flex-shrink-0 hidden md:block" style={{ background: sidebarBg, borderColor: sidebarBdr }}>
            <WorldbuildingSidebar folderId={folder.id} userId={userId} initialEntries={worldbuilding} onChange={setWorldbuilding} />
          </aside>
        )}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && !isFullscreen && (
        <div className="fixed inset-0 z-40 md:hidden" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setSidebarOpen(false)}>
          <aside className="absolute right-0 top-0 bottom-0 w-72 border-l overflow-y-auto" style={{ background: sidebarBg, borderColor: sidebarBdr }} onClick={e => e.stopPropagation()}>
            <WorldbuildingSidebar folderId={folder.id} userId={userId} initialEntries={worldbuilding} onChange={setWorldbuilding} />
          </aside>
        </div>
      )}
    </div>
  )
}
