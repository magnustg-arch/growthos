import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Pin, Bold, Italic, Underline, Strikethrough, List, ListOrdered, Highlighter, Heading1, Heading2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { t } from '../i18n'
import type { Note } from '../types'
import { NOTE_COLORS } from './Notes'
import { format } from 'date-fns'

// ── Color picker ─────────────────────────────────────────────────────────────
const COLOR_ORDER = ['default', 'yellow', 'green', 'purple', 'pink', 'blue']
const COLOR_DISPLAY: Record<string, string> = {
  default: '#6c63ff', yellow: '#f59e0b', green: '#22c55e',
  purple: '#a855f7', pink: '#ec4899', blue: '#3b82f6',
}

// ── Format toolbar button ─────────────────────────────────────────────────────
function FmtBtn({ title, active, onClick, children }: {
  title: string; active?: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      style={{
        background: active ? 'rgba(108,99,255,0.18)' : 'transparent',
        border: 'none', borderRadius: 6,
        padding: '5px 8px', cursor: 'pointer',
        color: active ? '#6c63ff' : 'var(--text-secondary)',
        fontWeight: 700, fontSize: 13, lineHeight: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 30, transition: 'background 0.1s',
      }}
    >
      {children}
    </button>
  )
}

// ── Main editor ───────────────────────────────────────────────────────────────
export default function NoteEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, lang, darkMode } = useApp()

  const isNew = id === 'new'
  const editorRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const noteIdRef = useRef<string | null>(null)

  const [title, setTitle] = useState('')
  const [color, setColor] = useState('default')
  const [isPinned, setIsPinned] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string>(new Date().toISOString())
  const [saving, setSaving] = useState(false)
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set())

  // ── Color tokens ──────────────────────────────────────────────────────────
  const cardBg    = darkMode
    ? (NOTE_COLORS[color]?.dark ?? '#1a1a2e')
    : (NOTE_COLORS[color]?.light ?? '#ffffff')
  const textPrimary = darkMode ? '#e0e0e0' : '#111111'
  const textMuted   = darkMode ? '#555580' : '#aaaaaa'
  const toolbarBg   = darkMode ? '#0f0f1c' : '#ffffff'
  const toolbarBorder = darkMode ? '#1a1a2e' : '#ede9e2'

  // ── Load existing note ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || isNew) return
    supabase.from('notes').select('*').eq('id', id).eq('user_id', user.id).single()
      .then(({ data }) => {
        if (!data) { navigate('/notes'); return }
        const note = data as Note
        noteIdRef.current = note.id
        setTitle(note.title)
        setColor(note.color)
        setIsPinned(note.is_pinned)
        setUpdatedAt(note.updated_at)
        if (editorRef.current) editorRef.current.innerHTML = note.content
      })
  }, [id, user])

  // ── Debounced auto-save ───────────────────────────────────────────────────
  const autoSave = useCallback(async (overrideTitle?: string, overrideContent?: string, overrideColor?: string, overridePinned?: boolean) => {
    if (!user) return
    const content = overrideContent ?? editorRef.current?.innerHTML ?? ''
    const t_val = overrideTitle ?? title
    const c_val = overrideColor ?? color
    const p_val = overridePinned ?? isPinned
    const now = new Date().toISOString()

    setSaving(true)
    try {
      if (noteIdRef.current) {
        await supabase.from('notes').update({ title: t_val, content, color: c_val, is_pinned: p_val, updated_at: now })
          .eq('id', noteIdRef.current)
        setUpdatedAt(now)
      } else {
        // Create new note
        const { data } = await supabase.from('notes')
          .insert({ user_id: user.id, title: t_val, content, color: c_val, is_pinned: p_val })
          .select().single()
        if (data) {
          noteIdRef.current = (data as Note).id
          setUpdatedAt((data as Note).updated_at)
          // Update URL without re-rendering
          window.history.replaceState(null, '', `/notes/${(data as Note).id}`)
        }
      }
    } finally {
      setSaving(false)
    }
  }, [user, title, color, isPinned])

  function scheduleAutoSave(overrides?: { title?: string; content?: string; color?: string; pinned?: boolean }) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      autoSave(overrides?.title, overrides?.content, overrides?.color, overrides?.pinned)
    }, 1000)
  }

  // ── Format commands ───────────────────────────────────────────────────────
  function exec(cmd: string, value?: string) {
    document.execCommand(cmd, false, value)
    editorRef.current?.focus()
    updateActiveFormats()
    scheduleAutoSave()
  }

  function updateActiveFormats() {
    const fmts = new Set<string>()
    const cmds = ['bold', 'italic', 'underline', 'strikeThrough']
    cmds.forEach(c => { if (document.queryCommandState(c)) fmts.add(c) })
    setActiveFormats(fmts)
  }

  // ── Back — save and navigate ──────────────────────────────────────────────
  async function handleBack() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    const content = editorRef.current?.innerHTML ?? ''
    // Only save if there's something to save
    if (title.trim() || content.replace(/<[^>]*>/g, '').trim()) {
      await autoSave()
    }
    navigate('/notes')
  }

  // ── Pin toggle ────────────────────────────────────────────────────────────
  function handlePin() {
    const newPinned = !isPinned
    setIsPinned(newPinned)
    scheduleAutoSave({ pinned: newPinned })
  }

  // ── Color change ──────────────────────────────────────────────────────────
  function handleColor(c: string) {
    setColor(c)
    scheduleAutoSave({ color: c })
  }

  return (
    <div style={{ minHeight: '100vh', background: cardBg, display: 'flex', flexDirection: 'column', transition: 'background 0.2s' }}>

      {/* Top toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderBottom: `1px solid ${toolbarBorder}`,
        background: toolbarBg, flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {/* Back */}
        <button onClick={handleBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c63ff', lineHeight: 0, padding: 4 }}>
          <ArrowLeft size={20} />
        </button>

        <div style={{ flex: 1 }} />

        {/* Saving indicator */}
        {saving && (
          <span style={{ fontSize: 11, color: textMuted, fontFamily: 'Space Mono, monospace' }}>
            {lang === 'no' ? 'Lagrer…' : 'Saving…'}
          </span>
        )}

        {/* Color picker */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {COLOR_ORDER.map(c => (
            <button key={c} onClick={() => handleColor(c)}
              style={{
                width: 20, height: 20, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: COLOR_DISPLAY[c],
                outline: color === c ? `2px solid ${COLOR_DISPLAY[c]}` : '2px solid transparent',
                outlineOffset: 2,
                boxShadow: color === c ? `0 0 0 1px ${toolbarBg}` : 'none',
                transition: 'outline 0.1s',
              }}
            />
          ))}
        </div>

        {/* Pin */}
        <button onClick={handlePin}
          style={{
            background: isPinned ? 'rgba(108,99,255,0.15)' : 'transparent',
            border: 'none', cursor: 'pointer', padding: '5px 8px', borderRadius: 8,
            color: isPinned ? '#6c63ff' : textMuted, lineHeight: 0,
          }}>
          <Pin size={18} />
        </button>
      </div>

      {/* Title + date + content */}
      <div style={{ flex: 1, padding: '20px 20px 160px', maxWidth: 720, width: '100%', margin: '0 auto', overflowY: 'auto' }}>
        <input
          value={title}
          onChange={e => { setTitle(e.target.value); scheduleAutoSave({ title: e.target.value }) }}
          placeholder={t(lang, 'noteTitle')}
          style={{
            width: '100%', border: 'none', outline: 'none', background: 'transparent',
            fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26,
            color: textPrimary, marginBottom: 6,
          }}
        />

        <p style={{ fontSize: 11, color: textMuted, fontFamily: 'Space Mono, monospace', marginBottom: 20 }}>
          {format(new Date(updatedAt), 'd MMM yyyy · HH:mm')}
        </p>

        {/* Rich text editor */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={() => scheduleAutoSave()}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onSelect={updateActiveFormats}
          style={{
            minHeight: 300,
            outline: 'none',
            fontSize: 15,
            lineHeight: 1.8,
            color: textPrimary,
            fontFamily: 'DM Sans, sans-serif',
            wordBreak: 'break-word',
          }}
          data-placeholder={lang === 'no' ? 'Begynn å skrive…' : 'Start writing…'}
        />
      </div>

      {/* Formatting toolbar — sticky at bottom */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
        background: toolbarBg, borderTop: `1px solid ${toolbarBorder}`,
        padding: '8px 12px 8px',
        display: 'flex', alignItems: 'center', gap: 2,
        flexWrap: 'wrap',
      }}>
        <FmtBtn title="Bold" active={activeFormats.has('bold')} onClick={() => exec('bold')}>
          <Bold size={14} />
        </FmtBtn>
        <FmtBtn title="Italic" active={activeFormats.has('italic')} onClick={() => exec('italic')}>
          <Italic size={14} />
        </FmtBtn>
        <FmtBtn title="Underline" active={activeFormats.has('underline')} onClick={() => exec('underline')}>
          <Underline size={14} />
        </FmtBtn>
        <FmtBtn title="Strikethrough" active={activeFormats.has('strikeThrough')} onClick={() => exec('strikeThrough')}>
          <Strikethrough size={14} />
        </FmtBtn>

        <div style={{ width: 1, height: 20, background: toolbarBorder, margin: '0 4px' }} />

        <FmtBtn title="H1" onClick={() => exec('formatBlock', '<h1>')}>
          <Heading1 size={14} />
        </FmtBtn>
        <FmtBtn title="H2" onClick={() => exec('formatBlock', '<h2>')}>
          <Heading2 size={14} />
        </FmtBtn>

        <div style={{ width: 1, height: 20, background: toolbarBorder, margin: '0 4px' }} />

        <FmtBtn title={lang === 'no' ? 'Punktliste' : 'Bullet list'} onClick={() => exec('insertUnorderedList')}>
          <List size={14} />
        </FmtBtn>
        <FmtBtn title={lang === 'no' ? 'Numrert liste' : 'Numbered list'} onClick={() => exec('insertOrderedList')}>
          <ListOrdered size={14} />
        </FmtBtn>

        <div style={{ width: 1, height: 20, background: toolbarBorder, margin: '0 4px' }} />

        <FmtBtn title={lang === 'no' ? 'Marker tekst' : 'Highlight'} onClick={() => exec('hiliteColor', '#fef08a')}>
          <Highlighter size={14} />
        </FmtBtn>
      </div>

      {/* Placeholder CSS */}
      <style>{`
        [data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: ${textMuted};
          pointer-events: none;
        }
        [contenteditable] h1 { font-family: Syne, sans-serif; font-size: 22px; font-weight: 800; margin: 12px 0 6px; }
        [contenteditable] h2 { font-family: Syne, sans-serif; font-size: 18px; font-weight: 700; margin: 10px 0 4px; }
        [contenteditable] ul { padding-left: 24px; margin: 4px 0; }
        [contenteditable] ol { padding-left: 24px; margin: 4px 0; }
        [contenteditable] li { margin: 2px 0; }
      `}</style>
    </div>
  )
}
