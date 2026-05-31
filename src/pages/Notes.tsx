import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pin, Trash2, MoreVertical } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { t } from '../i18n'
import type { Note } from '../types'
import { format } from 'date-fns'

// ── Color config ────────────────────────────────────────────────────────────
export const NOTE_COLORS: Record<string, { light: string; dark: string; border: string }> = {
  default: { light: '#ffffff', dark: '#1a1a2e', border: '#6c63ff' },
  yellow:  { light: '#fffbeb', dark: '#1f1900', border: '#f59e0b' },
  green:   { light: '#f0fdf4', dark: '#021a08', border: '#22c55e' },
  purple:  { light: '#faf5ff', dark: '#13002a', border: '#a855f7' },
  pink:    { light: '#fdf2f8', dark: '#200015', border: '#ec4899' },
  blue:    { light: '#eff6ff', dark: '#001228', border: '#3b82f6' },
}

function noteCardBg(color: string, darkMode: boolean) {
  const c = NOTE_COLORS[color] ?? NOTE_COLORS.default
  return darkMode ? c.dark : c.light
}
function noteBorderColor(color: string) {
  return (NOTE_COLORS[color] ?? NOTE_COLORS.default).border
}

// ── Note card ────────────────────────────────────────────────────────────────
function NoteCard({ note, darkMode, lang, onPin, onDelete, onClick }: {
  note: Note
  darkMode: boolean
  lang: 'no' | 'en'
  onPin: () => void
  onDelete: () => void
  onClick: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const cardBg = noteCardBg(note.color, darkMode)
  const borderColor = noteBorderColor(note.color)
  const cardBorder = darkMode ? '#2a2a3a' : '#ede9e2'
  const textPrimary = darkMode ? '#e0e0e0' : '#111111'
  const textMuted = darkMode ? '#555580' : '#aaaaaa'

  // Close menu on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Strip HTML tags for preview
  const plainContent = note.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: 14,
        padding: '14px 14px 14px 16px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'box-shadow 0.15s',
      }}
      onClick={onClick}
      whileHover={{ boxShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)' }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <h3 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15,
          color: textPrimary, flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginRight: 8,
        }}>
          {note.title || t(lang, 'untitled')}
        </h3>
        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted, padding: 2, lineHeight: 0 }}
          >
            <MoreVertical size={16} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{
                  position: 'absolute', right: 0, top: '100%', zIndex: 50,
                  background: darkMode ? '#1a1a2e' : '#ffffff',
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 12, padding: 6, minWidth: 140,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                }}
              >
                <button onClick={() => { onPin(); setMenuOpen(false) }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: 'none', background: 'none', color: textPrimary, fontSize: 13, fontWeight: 500, cursor: 'pointer', borderRadius: 8, textAlign: 'left' }}>
                  <Pin size={14} style={{ color: '#6c63ff' }} />
                  {note.is_pinned
                    ? (lang === 'no' ? 'Løsne' : 'Unpin')
                    : (lang === 'no' ? 'Fest' : 'Pin')}
                </button>
                <button onClick={() => { onDelete(); setMenuOpen(false) }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: 'none', background: 'none', color: '#ef4444', fontSize: 13, fontWeight: 500, cursor: 'pointer', borderRadius: 8, textAlign: 'left' }}>
                  <Trash2 size={14} />
                  {lang === 'no' ? 'Slett' : 'Delete'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content preview */}
      {plainContent && (
        <p style={{ fontSize: 13, color: textMuted, lineHeight: 1.5, marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {plainContent}
        </p>
      )}

      {/* Date */}
      <p style={{ fontSize: 10, color: textMuted, fontFamily: 'Space Mono, monospace' }}>
        {format(new Date(note.updated_at), 'd MMM yyyy · HH:mm')}
        {note.is_pinned && <span style={{ marginLeft: 8, color: '#6c63ff' }}>📌</span>}
      </p>
    </motion.div>
  )
}

// ── Main Notes list ──────────────────────────────────────────────────────────
export default function Notes() {
  const { user, lang, darkMode } = useApp()
  const navigate = useNavigate()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  const textPrimary = darkMode ? '#e0e0e0' : '#111111'
  const textMuted   = darkMode ? '#555580' : '#aaaaaa'

  async function loadNotes() {
    if (!user) return
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false })
    if (data) setNotes(data as Note[])
    setLoading(false)
  }

  useEffect(() => { loadNotes() }, [user])

  async function handlePin(note: Note) {
    await supabase.from('notes').update({ is_pinned: !note.is_pinned }).eq('id', note.id)
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, is_pinned: !n.is_pinned } : n)
      .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()))
  }

  async function handleDelete(id: string) {
    await supabase.from('notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const pinned = notes.filter(n => n.is_pinned)
  const unpinned = notes.filter(n => !n.is_pinned)

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 80px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 24, color: textPrimary }}>
          📝 {t(lang, 'notater')}
        </h1>
        <button
          onClick={() => navigate('/notes/new')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#6c63ff', color: '#fff', border: 'none',
            borderRadius: 12, padding: '10px 16px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}
        >
          <Plus size={16} /> {t(lang, 'newNote')}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: textMuted }}>
          <p style={{ fontSize: 14 }}>{t(lang, 'loading')}</p>
        </div>
      ) : notes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📝</p>
          <p style={{ color: textMuted, fontSize: 15 }}>{t(lang, 'noNotes')}</p>
          <button
            onClick={() => navigate('/notes/new')}
            style={{ marginTop: 16, background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}
          >
            {t(lang, 'newNote')}
          </button>
        </div>
      ) : (
        <>
          {/* Pinned section */}
          {pinned.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
                📌 {t(lang, 'pinned')}
              </p>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                {pinned.map(note => (
                  <div key={note.id} style={{ minWidth: 220, maxWidth: 260, flexShrink: 0 }}>
                    <NoteCard
                      note={note} darkMode={darkMode} lang={lang}
                      onPin={() => handlePin(note)}
                      onDelete={() => handleDelete(note.id)}
                      onClick={() => navigate(`/notes/${note.id}`)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All notes */}
          {unpinned.length > 0 && (
            <div>
              <p style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
                {t(lang, 'allNotes')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <AnimatePresence>
                  {unpinned.map(note => (
                    <NoteCard
                      key={note.id} note={note} darkMode={darkMode} lang={lang}
                      onPin={() => handlePin(note)}
                      onDelete={() => handleDelete(note.id)}
                      onClick={() => navigate(`/notes/${note.id}`)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
