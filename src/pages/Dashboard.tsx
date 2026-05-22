import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, Plus, Trash2, Zap, History, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { t } from '../i18n'
import { xpInCurrentLevel, xpProgressPercent, XP_PER_LEVEL } from '../lib/gamification'
import { generateMorningBrief, generateEveningReview } from '../lib/claude'
import { format, subDays } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import type { Priority, Todo, DailyBrief } from '../types'

// ─── helpers ────────────────────────────────────────────────────────────────

function pillEmoji(title: string): string {
  const s = title.toLowerCase()
  if (/les|bok|journal|skriv/.test(s)) return '📓'
  if (/trening|gym|løp|sport|yoga|jogge/.test(s)) return '🏋️'
  if (/mat|spis|drikk|vann/.test(s)) return '🍎'
  if (/møte|kall|samtale|snakk/.test(s)) return '📞'
  if (/kode|program|dev|bygge/.test(s)) return '💻'
  if (/lekse|studer|skole|lær/.test(s)) return '📚'
  return '🎯'
}

function motivationalStatus(pct: number, lang: 'no' | 'en'): string {
  if (lang === 'en') {
    if (pct >= 75) return 'Crushing it today 💪'
    if (pct >= 50) return 'Past halfway — keep going! 🚀'
    if (pct > 0)  return 'You\'re rolling ⚡'
    return 'Ready for a productive day? 🌟'
  }
  if (pct >= 75) return 'Du knuser det i dag 💪'
  if (pct >= 50) return 'Over halvveis — fortsett! 🚀'
  if (pct > 0)  return 'Du er i gang ⚡'
  return 'Klar for en produktiv dag? 🌟'
}

const PRIORITY_DOT: Record<Priority, string> = {
  high: '#6c63ff', medium: '#d97706', low: '#22c55e',
}
const PRIORITY_BORDER: Record<Priority, string> = {
  high: '#a5a0ff', medium: '#fbbf24', low: '#4ade80',
}
const PRIORITY_LABEL_BG: Record<Priority, string> = {
  high: 'rgba(108,99,255,0.12)', medium: 'rgba(217,119,6,0.12)', low: 'rgba(34,197,94,0.12)',
}
const PRIORITY_LABEL_COLOR: Record<Priority, string> = {
  high: '#8b85ff', medium: '#d97706', low: '#16a34a',
}

// ─── sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ dot, label, count }: { dot: string; label: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '18px 0 8px' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0 }} />
      <span style={{
        fontFamily: 'Space Mono, monospace', fontSize: 10, fontWeight: 700,
        color: 'var(--text-secondary)', letterSpacing: 1.2, textTransform: 'uppercase',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: 'Space Mono, monospace', fontSize: 10, color: 'var(--text-secondary)',
        marginLeft: 2,
      }}>({count})</span>
    </div>
  )
}

function TodoRow({
  todo, onComplete, onDelete, darkMode, lang,
}: {
  todo: Todo
  onComplete: () => void
  onDelete: () => void
  darkMode: boolean
  lang: 'no' | 'en'
}) {
  const isDone = todo.completed
  const cardBg = darkMode ? '#0f0f1c' : '#ffffff'
  const cardBorder = darkMode ? '#1a1a2e' : '#ede9e2'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 10,
        background: cardBg, border: `1px solid ${cardBorder}`,
        marginBottom: 6,
      }}
    >
      {/* Checkbox */}
      <button
        onClick={onComplete}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, lineHeight: 0 }}
      >
        {isDone ? (
          <CheckCircle2 size={18} style={{ color: '#4ade80' }} />
        ) : (
          <Circle size={18} style={{ color: PRIORITY_BORDER[todo.priority] }} />
        )}
      </button>

      {/* Title */}
      <span style={{
        flex: 1, fontSize: 13, fontWeight: 500, minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        color: isDone ? 'var(--text-secondary)' : 'var(--text-primary)',
        textDecoration: isDone ? 'line-through' : 'none',
      }}>
        {todo.title}
      </span>

      {/* Badge */}
      {isDone ? (
        <span style={{
          fontFamily: 'Space Mono, monospace', fontSize: 10, fontWeight: 700,
          background: 'rgba(74,222,128,0.12)', color: '#4ade80',
          padding: '2px 7px', borderRadius: 99, flexShrink: 0,
        }}>
          +10 XP
        </span>
      ) : (
        <span style={{
          fontFamily: 'Space Mono, monospace', fontSize: 10, fontWeight: 700,
          background: PRIORITY_LABEL_BG[todo.priority], color: PRIORITY_LABEL_COLOR[todo.priority],
          padding: '2px 7px', borderRadius: 99, flexShrink: 0, textTransform: 'uppercase',
        }}>
          {t(lang, todo.priority)}
        </span>
      )}

      {/* Delete */}
      <button
        onClick={onDelete}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-secondary)', opacity: 0.5, lineHeight: 0 }}
      >
        <Trash2 size={13} />
      </button>
    </motion.div>
  )
}

function AddTodoModal({ onSave, onClose, lang, darkMode }: {
  onSave: (title: string, priority: Priority) => void
  onClose: () => void
  lang: 'no' | 'en'
  darkMode: boolean
}) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const cardBg = darkMode ? '#0f0f1c' : '#ffffff'
  const cardBorder = darkMode ? '#1a1a2e' : '#ede9e2'

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 480, background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 24 }}
      >
        <h3 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 17, marginBottom: 14 }}>
          {lang === 'no' ? 'Ny oppgave' : 'New task'}
        </h3>
        <input
          autoFocus
          placeholder={lang === 'no' ? 'Hva skal gjøres?' : 'What needs to be done?'}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && title.trim()) onSave(title.trim(), priority) }}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 10,
            border: `1px solid ${cardBorder}`, background: 'var(--bg)',
            color: 'var(--text-primary)', fontSize: 14, outline: 'none', marginBottom: 12,
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['high', 'medium', 'low'] as Priority[]).map(p => (
            <button key={p} onClick={() => setPriority(p)}
              style={{
                flex: 1, padding: '8px 4px', borderRadius: 10,
                border: `2px solid ${priority === p ? PRIORITY_DOT[p] : cardBorder}`,
                background: priority === p ? PRIORITY_LABEL_BG[p] : 'transparent',
                color: priority === p ? PRIORITY_LABEL_COLOR[p] : 'var(--text-secondary)',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'Space Mono, monospace', textTransform: 'uppercase',
              }}>
              {t(lang, p)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: 12, borderRadius: 10, border: `1px solid ${cardBorder}`, background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}>
            {t(lang, 'cancel')}
          </button>
          <button onClick={() => { if (title.trim()) onSave(title.trim(), priority) }} disabled={!title.trim()}
            style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#6c63ff', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: title.trim() ? 1 : 0.5 }}>
            {t(lang, 'save')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ width: '100%', height: 6, background: 'rgba(128,128,160,0.12)', borderRadius: 99, overflow: 'hidden' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        style={{ height: '100%', background: color, borderRadius: 99 }}
      />
    </div>
  )
}

function BriefHistoryModal({ briefs, onClose, lang, darkMode }: {
  briefs: DailyBrief[]
  onClose: () => void
  lang: 'no' | 'en'
  darkMode: boolean
}) {
  const cardBg     = darkMode ? '#0f0f1c' : '#ffffff'
  const cardBorder = darkMode ? '#1a1a2e' : '#ede9e2'
  const textPrimary = darkMode ? '#ffffff' : '#111111'
  const textMuted   = darkMode ? '#555580' : '#aaaaaa'

  // Group briefs by date
  const grouped = briefs.reduce<Record<string, DailyBrief[]>>((acc, b) => {
    if (!acc[b.date]) acc[b.date] = []
    acc[b.date].push(b)
    return acc
  }, {})
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  function formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr + 'T12:00:00')
      return format(d, lang === 'no' ? 'EEEE d. MMMM yyyy' : 'EEEE, MMMM d, yyyy')
    } catch { return dateStr }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 580, maxHeight: '80vh',
          background: cardBg, border: `1px solid ${cardBorder}`,
          borderRadius: 20, display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 22px', borderBottom: `1px solid ${cardBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <History size={17} style={{ color: '#6c63ff' }} />
            <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 17, color: textPrimary }}>
              {lang === 'no' ? 'Briefhistorikk' : 'Brief History'}
            </h2>
            <span style={{
              fontFamily: 'Space Mono, monospace', fontSize: 10, fontWeight: 700,
              background: 'rgba(108,99,255,0.12)', color: '#8b85ff',
              padding: '2px 8px', borderRadius: 99,
            }}>
              {briefs.length}
            </span>
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted, lineHeight: 0, padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Scrollable list */}
        <div style={{ overflowY: 'auto', padding: '16px 22px 24px', flex: 1 }}>
          {sortedDates.length === 0 ? (
            <p style={{ fontSize: 14, color: textMuted, fontStyle: 'italic', textAlign: 'center', marginTop: 32 }}>
              {lang === 'no' ? 'Ingen briefs ennå — generer din første!' : 'No briefs yet — generate your first!'}
            </p>
          ) : sortedDates.map(date => (
            <div key={date} style={{ marginBottom: 24 }}>
              {/* Date header */}
              <p style={{
                fontFamily: 'Space Mono, monospace', fontSize: 10, fontWeight: 700,
                color: textMuted, textTransform: 'uppercase', letterSpacing: 1,
                marginBottom: 10,
              }}>
                {formatDate(date)}
              </p>

              {/* Briefs for this date */}
              {grouped[date].map(brief => (
                <div key={brief.id} style={{
                  background: brief.type === 'morning' ? '#1a1a2e' : (darkMode ? '#12121f' : '#f0f4ff'),
                  border: `1px solid ${brief.type === 'morning' ? '#2a2a48' : cardBorder}`,
                  borderRadius: 12, padding: '14px 16px', marginBottom: 10,
                  borderLeft: `3px solid ${brief.type === 'morning' ? '#6c63ff' : '#a78bfa'}`,
                }}>
                  {/* Type badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{
                      fontFamily: 'Space Mono, monospace', fontSize: 10, fontWeight: 700,
                      color: brief.type === 'morning' ? '#8b85ff' : '#a78bfa',
                      textTransform: 'uppercase', letterSpacing: 1,
                    }}>
                      {brief.type === 'morning'
                        ? (lang === 'no' ? '✦ Morgenbrief' : '✦ Morning Brief')
                        : (lang === 'no' ? '🌙 Kveldsgjennomgang' : '🌙 Evening Review')}
                    </span>
                    <span style={{ fontSize: 10, color: textMuted }}>
                      {brief.created_at
                        ? format(new Date(brief.created_at), 'HH:mm')
                        : ''}
                    </span>
                  </div>
                  {/* Content */}
                  <p style={{
                    fontSize: 13, lineHeight: 1.75,
                    color: brief.type === 'morning' ? '#c4c4e0' : textPrimary,
                  }}>
                    {brief.content}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const {
    profile, todos, shortGoals, longGoals, todayBrief, allBriefs,
    lang, darkMode, saveTodayBrief, completeTodo, addTodo, deleteTodo,
  } = useApp()

  const [showAdd, setShowAdd] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [briefExpanded, setBriefExpanded] = useState(false)
  const [briefLoading, setBriefLoading] = useState(false)
  const [eveningLoading, setEveningLoading] = useState(false)
  const [eveningContent, setEveningContent] = useState('')
  const [apiKey, setApiKey] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const k = localStorage.getItem('growthos_apikey')
    if (k) setApiKey(k)
  }, [])

  const today = new Date().toISOString().split('T')[0]
  const completedToday = todos.filter(t => t.completed_at?.startsWith(today))
  const activeHigh   = todos.filter(t => !t.completed && t.priority === 'high')
  const activeMed    = todos.filter(t => !t.completed && (t.priority === 'medium' || t.priority === 'low'))
  const allCompleted = todos.filter(t => t.completed)

  const todayTotal    = activeHigh.length + activeMed.length + completedToday.length
  const todayProgress = todayTotal > 0 ? Math.round((completedToday.length / todayTotal) * 100) : 0

  const avgShort = shortGoals.length ? Math.round(shortGoals.reduce((s, g) => s + g.progress_percent, 0) / shortGoals.length) : 0
  const avgLong  = longGoals.length  ? Math.round(longGoals.reduce((s, g) => s + g.progress_percent, 0) / longGoals.length)  : 0

  // Focus pills for brief
  const focusPills = todos
    .filter(t => !t.completed && (t.priority === 'high' || t.priority === 'medium'))
    .slice(0, 3)

  // 7-day activity squares
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i)
    const ds = format(d, 'yyyy-MM-dd')
    return {
      label: format(d, 'EEE').charAt(0),
      isToday: i === 6,
      active: todos.some(t => t.completed_at?.startsWith(ds)),
    }
  })

  async function handleGenerateBrief() {
    if (!profile || !apiKey) { navigate('/settings'); return }
    setBriefLoading(true)
    try {
      const content = await generateMorningBrief(apiKey, profile, todos, shortGoals, longGoals, lang)
      await saveTodayBrief(content, 'morning')
    } catch (e) { console.error(e) }
    finally { setBriefLoading(false) }
  }

  async function handleEveningReview() {
    if (!profile || !apiKey) return
    setEveningLoading(true)
    try {
      const content = await generateEveningReview(apiKey, profile, todos, shortGoals, longGoals, lang)
      setEveningContent(content)
      await saveTodayBrief(content, 'evening')
    } catch (e) { console.error(e) }
    finally { setEveningLoading(false) }
  }

  async function handleAddTodo(title: string, priority: Priority) {
    await addTodo({ title, priority, due_date: null, notes: null, goal_id: null })
    setShowAdd(false)
  }

  // ── color tokens (inline, so they react to darkMode toggle) ───────────────
  const pageBg      = darkMode ? '#09090f' : '#f8f7f3'
  const cardBg      = darkMode ? '#0f0f1c' : '#ffffff'
  const cardBorder  = darkMode ? '#1a1a2e' : '#ede9e2'
  const cardShadow  = darkMode ? 'none' : '0 1px 4px rgba(0,0,0,0.04)'
  const panelBg     = darkMode ? '#0d0d16' : '#f8f7f3'
  const panelBorder = darkMode ? '#1a1a2e' : '#ede9e2'
  const textPrimary = darkMode ? '#ffffff' : '#111111'
  const textMuted   = darkMode ? '#333355' : '#bbbbbb'
  const successColor = darkMode ? '#4ade80' : '#16a34a'
  const successBg    = darkMode ? 'rgba(74,222,128,0.1)' : '#dcfce7'

  const card = {
    background: cardBg, border: `1px solid ${cardBorder}`,
    boxShadow: cardShadow, borderRadius: 14,
  }

  return (
    <div style={{ minHeight: '100vh', background: pageBg, color: textPrimary, overflowX: 'hidden' }}>

      {/* ══════════════════════════════════════════════════════
          MOBILE LAYOUT  (hidden on desktop via CSS)
      ══════════════════════════════════════════════════════ */}
      <div className="mobile-dashboard">

        {/* ── Hero strip ── */}
        <div style={{ background: '#13131e', padding: '20px 16px 20px', flexShrink: 0 }}>
          {/* Row: greeting + ✦ Brief button */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
            <div>
              <h1 style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
                {profile?.email.split('@')[0]
                  ? (lang === 'no' ? `Hei, ${profile.email.split('@')[0]} 👋` : `Hey, ${profile.email.split('@')[0]} 👋`)
                  : (lang === 'no' ? 'Hei 👋' : 'Hey 👋')}
              </h1>
              <p style={{ fontSize: 12, color: '#5555a0', marginTop: 3, fontFamily: 'DM Sans, sans-serif' }}>
                {format(new Date(), lang === 'no' ? 'EEEE d. MMMM' : 'EEEE, MMMM d')}
              </p>
            </div>
            <button
              onClick={handleGenerateBrief}
              disabled={briefLoading}
              style={{
                background: 'rgba(108,99,255,0.2)', color: '#a0a0ff',
                border: '1px solid rgba(108,99,255,0.35)', borderRadius: 20,
                padding: '7px 14px', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                fontFamily: 'DM Sans, sans-serif', opacity: briefLoading ? 0.7 : 1,
              }}
            >
              {briefLoading ? '…' : '✦ Brief'}
            </button>
          </div>

          {/* Stats pills */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {[
              { icon: '🔥', label: `${profile?.streak ?? 0}d` },
              { icon: '⚡', label: `Lv.${profile?.level ?? 1}` },
              { icon: '✅', label: `${completedToday.length}/${todayTotal}${lang === 'no' ? ' i dag' : ' today'}` },
            ].map(({ icon, label }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 20, padding: '5px 12px',
                fontSize: 12, fontWeight: 600, color: '#c4c4e0',
              }}>
                <span>{icon}</span><span>{label}</span>
              </div>
            ))}
          </div>

          {/* XP strip */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: '#5555a0', fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                ⚡ {lang === 'no' ? 'Nivå' : 'Level'} {profile?.level ?? 1}
              </span>
              <span style={{ fontSize: 11, color: '#5555a0', fontFamily: 'Space Mono, monospace' }}>
                {xpInCurrentLevel(profile?.xp ?? 0)}/{XP_PER_LEVEL}
              </span>
            </div>
            <div style={{ height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xpProgressPercent(profile?.xp ?? 0)}%` }}
                transition={{ duration: 0.9 }}
                style={{ height: '100%', background: 'linear-gradient(90deg, #6c63ff, #a78bfa)', borderRadius: 99 }}
              />
            </div>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div style={{ flex: 1, padding: '14px 16px' }}>

          {/* Claude Brief card (collapsible) */}
          <div style={{
            background: '#1a1a2e', borderRadius: 14, marginBottom: 14,
            border: '1px solid #2a2a48', overflow: 'hidden',
          }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, #6c63ff, rgba(108,99,255,0.2))' }} />
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: '#5555a0', letterSpacing: 1.4, textTransform: 'uppercase' }}>
                  ✦ MORGENMØTE MED CLAUDE
                </span>
                <Zap size={12} style={{ color: '#6c63ff' }} />
              </div>
              {todayBrief ? (
                <>
                  <p style={{ color: '#c4c4e0', fontSize: 13, lineHeight: 1.65, marginBottom: 10 }}>
                    {briefExpanded
                      ? todayBrief.content
                      : (todayBrief.content.indexOf('.') > 20
                          ? todayBrief.content.slice(0, todayBrief.content.indexOf('.') + 1)
                          : todayBrief.content.slice(0, 90) + '…')}
                  </p>
                  {focusPills.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                      {focusPills.map(pill => (
                        <span key={pill.id} style={{
                          background: 'rgba(108,99,255,0.15)', color: '#a0a0ff',
                          border: '1px solid rgba(108,99,255,0.25)',
                          borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 500,
                        }}>
                          {pillEmoji(pill.title)} {pill.title.length > 16 ? pill.title.slice(0, 16) + '…' : pill.title}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setBriefExpanded(e => !e)}
                    style={{ background: 'none', border: 'none', color: '#6c63ff', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'DM Sans, sans-serif' }}
                  >
                    {briefExpanded
                      ? (lang === 'no' ? '↑ Vis mindre' : '↑ Show less')
                      : (lang === 'no' ? '↓ Les mer' : '↓ Read more')}
                  </button>
                </>
              ) : (
                <p style={{ color: '#4a4a7a', fontSize: 12, fontStyle: 'italic' }}>
                  {lang === 'no' ? 'Trykk "✦ Brief" for å starte dagen med Claude.' : 'Tap "✦ Brief" to start your day with Claude.'}
                </p>
              )}
            </div>
          </div>

          {/* 2×2 progress grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { label: lang === 'no' ? 'Kortsiktige mål' : 'Short-term', value: shortGoals.length > 0 ? `${avgShort}%` : '—', pct: avgShort, color: '#6c63ff', hasData: shortGoals.length > 0 },
              { label: lang === 'no' ? 'Langsiktige mål' : 'Long-term', value: longGoals.length > 0 ? `${avgLong}%` : '—', pct: avgLong, color: '#f59e0b', hasData: longGoals.length > 0 },
              { label: lang === 'no' ? 'Dagens oppgaver' : "Today's tasks", value: todayTotal > 0 ? `${completedToday.length}/${todayTotal}` : '—', pct: todayProgress, color: successColor, hasData: todayTotal > 0 },
              { label: lang === 'no' ? 'Streak' : 'Streak', value: `${profile?.streak ?? 0}d`, pct: Math.min((profile?.streak ?? 0) * 10, 100), color: '#fbbf24', hasData: true },
            ].map(({ label, value, pct, color, hasData }) => (
              <div key={label} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: '12px 14px' }}>
                <p style={{ fontSize: 10, color: textMuted, fontFamily: 'Space Mono, monospace', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
                  {label}
                </p>
                <p style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 20, color, marginBottom: 8, lineHeight: 1 }}>
                  {value}
                </p>
                <div style={{ height: 4, background: darkMode ? '#1a1a2e' : '#ece9e2', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: hasData ? `${pct}%` : '0%' }}
                    transition={{ duration: 0.7 }}
                    style={{ height: '100%', background: color, borderRadius: 99 }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Todo list */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h2 style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800, color: textPrimary }}>
                {lang === 'no' ? 'Oppgaver' : 'Tasks'}
              </h2>
              <button
                onClick={() => setShowAdd(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: '#6c63ff', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                <Plus size={13} /> {lang === 'no' ? 'Legg til' : 'Add'}
              </button>
            </div>

            {activeHigh.length > 0 && (
              <>
                <SectionLabel dot={PRIORITY_DOT.high} label={lang === 'no' ? 'Høy' : 'High'} count={activeHigh.length} />
                <AnimatePresence>
                  {activeHigh.map(todo => (
                    <TodoRow key={todo.id} todo={todo} darkMode={darkMode} lang={lang}
                      onComplete={() => completeTodo(todo.id)} onDelete={() => deleteTodo(todo.id)} />
                  ))}
                </AnimatePresence>
              </>
            )}

            {activeMed.length > 0 && (
              <>
                <SectionLabel dot={PRIORITY_DOT.medium} label={lang === 'no' ? 'Middels' : 'Medium'} count={activeMed.length} />
                <AnimatePresence>
                  {activeMed.map(todo => (
                    <TodoRow key={todo.id} todo={todo} darkMode={darkMode} lang={lang}
                      onComplete={() => completeTodo(todo.id)} onDelete={() => deleteTodo(todo.id)} />
                  ))}
                </AnimatePresence>
              </>
            )}

            {activeHigh.length === 0 && activeMed.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: textMuted }}>
                <p style={{ fontSize: 13 }}>{lang === 'no' ? 'Ingen aktive oppgaver!' : 'No active tasks!'}</p>
              </div>
            )}

            {allCompleted.length > 0 && (
              <>
                <SectionLabel dot={successColor} label={lang === 'no' ? 'Fullført' : 'Done'} count={allCompleted.length} />
                <AnimatePresence>
                  {allCompleted.slice(0, 8).map(todo => (
                    <TodoRow key={todo.id} todo={todo} darkMode={darkMode} lang={lang}
                      onComplete={() => {}} onDelete={() => deleteTodo(todo.id)} />
                  ))}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          DESKTOP LAYOUT  (hidden on mobile via CSS)
      ══════════════════════════════════════════════════════ */}
      <div className="desktop-dashboard" style={{ display: 'flex' }}>

      {/* ══════════════════════════════════════════
          COLUMN 2 — MAIN CONTENT
      ══════════════════════════════════════════ */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div style={{
          padding: '16px 24px', borderBottom: `1px solid ${cardBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'transparent', flexShrink: 0,
        }}>
          <div>
            <h1 style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, lineHeight: 1.2, color: textPrimary }}>
              {profile?.email.split('@')[0]
                ? (lang === 'no' ? `Hei, ${profile.email.split('@')[0]} 👋` : `Hey, ${profile.email.split('@')[0]} 👋`)
                : (lang === 'no' ? 'God morgen 👋' : 'Good morning 👋')}
            </h1>
            <p style={{ fontSize: 12, color: textMuted, marginTop: 3, fontFamily: 'DM Sans, sans-serif' }}>
              {format(new Date(), lang === 'no' ? 'EEEE d. MMMM' : 'EEEE, MMMM d')}
              {' · '}
              {motivationalStatus(todayProgress, lang)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* History button */}
            <button
              onClick={() => setShowHistory(true)}
              title={lang === 'no' ? 'Historikk' : 'History'}
              style={{
                background: 'transparent', color: '#6c63ff',
                border: '1px solid #2a2a48', borderRadius: 10,
                padding: '8px 12px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap',
              }}
            >
              <History size={14} />
              {allBriefs.length > 0 && (
                <span style={{
                  background: '#6c63ff', color: '#fff',
                  borderRadius: 99, fontSize: 10, fontWeight: 700,
                  padding: '1px 6px', fontFamily: 'Space Mono, monospace',
                }}>
                  {allBriefs.length}
                </span>
              )}
            </button>
            {/* Generate brief button */}
            <button
              onClick={handleGenerateBrief}
              disabled={briefLoading}
              style={{
                background: '#1a1a2e', color: '#8b85ff',
                border: '1px solid #2a2a48', borderRadius: 10,
                padding: '8px 16px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', opacity: briefLoading ? 0.7 : 1,
                fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap',
              }}
            >
              {briefLoading
                ? (lang === 'no' ? 'Genererer…' : 'Generating…')
                : (lang === 'no' ? '✦ Generer morgenbrief' : '✦ Generate brief')}
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 40px' }}>

          {/* Claude Brief card */}
          <div style={{
            background: '#1a1a2e', borderRadius: 16, marginBottom: 24,
            border: '1px solid #2a2a48', overflow: 'hidden',
          }}>
            {/* Top gradient line */}
            <div style={{ height: 3, background: 'linear-gradient(90deg, #6c63ff 0%, rgba(108,99,255,0.2) 100%)' }} />
            <div style={{ padding: '18px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: '#5555a0', letterSpacing: 1.4, textTransform: 'uppercase' }}>
                  ✦ MORGENMØTE MED CLAUDE
                </span>
                <Zap size={13} style={{ color: '#6c63ff' }} />
              </div>

              {todayBrief ? (
                <>
                  <p style={{ color: '#c4c4e0', fontSize: 14, lineHeight: 1.75, marginBottom: 14 }}>
                    {todayBrief.content}
                  </p>
                  {focusPills.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {focusPills.map(pill => (
                        <span key={pill.id} style={{
                          background: 'rgba(108,99,255,0.15)', color: '#a0a0ff',
                          border: '1px solid rgba(108,99,255,0.25)',
                          borderRadius: 99, padding: '4px 12px', fontSize: 12, fontWeight: 500,
                        }}>
                          {pillEmoji(pill.title)} {pill.title.length > 18 ? pill.title.slice(0, 18) + '…' : pill.title}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p style={{ color: '#4a4a7a', fontSize: 13, fontStyle: 'italic' }}>
                  {lang === 'no'
                    ? 'Trykk "Generer morgenbrief" for å starte dagen med Claude.'
                    : 'Click "Generate brief" to start your day with Claude.'}
                </p>
              )}
            </div>
          </div>

          {/* Todo list */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h2 style={{ fontFamily: 'Syne', fontSize: 17, fontWeight: 800, color: textPrimary }}>
                {lang === 'no' ? 'Oppgaver' : 'Tasks'}
              </h2>
              <button
                onClick={() => setShowAdd(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#6c63ff', color: '#fff', border: 'none',
                  borderRadius: 10, padding: '7px 14px', fontSize: 13,
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                <Plus size={14} /> {lang === 'no' ? 'Legg til' : 'Add task'}
              </button>
            </div>

            {/* Section: HIGH */}
            {activeHigh.length > 0 && (
              <>
                <SectionLabel dot={PRIORITY_DOT.high} label={lang === 'no' ? 'Høy prioritet' : 'High priority'} count={activeHigh.length} />
                <AnimatePresence>
                  {activeHigh.map(todo => (
                    <TodoRow key={todo.id} todo={todo} darkMode={darkMode} lang={lang}
                      onComplete={() => completeTodo(todo.id)}
                      onDelete={() => deleteTodo(todo.id)} />
                  ))}
                </AnimatePresence>
              </>
            )}

            {/* Section: MEDIUM/LOW */}
            {activeMed.length > 0 && (
              <>
                <SectionLabel dot={PRIORITY_DOT.medium} label={lang === 'no' ? 'Middels prioritet' : 'Medium priority'} count={activeMed.length} />
                <AnimatePresence>
                  {activeMed.map(todo => (
                    <TodoRow key={todo.id} todo={todo} darkMode={darkMode} lang={lang}
                      onComplete={() => completeTodo(todo.id)}
                      onDelete={() => deleteTodo(todo.id)} />
                  ))}
                </AnimatePresence>
              </>
            )}

            {/* Empty state */}
            {activeHigh.length === 0 && activeMed.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: textMuted }}>
                <p style={{ fontSize: 14 }}>{lang === 'no' ? 'Ingen aktive oppgaver! Legg til en.' : 'No active tasks! Add one.'}</p>
              </div>
            )}

            {/* Section: FULLFØRT */}
            {allCompleted.length > 0 && (
              <>
                <SectionLabel dot={successColor} label={lang === 'no' ? 'Fullført' : 'Completed'} count={allCompleted.length} />
                <AnimatePresence>
                  {allCompleted.slice(0, 10).map(todo => (
                    <TodoRow key={todo.id} todo={todo} darkMode={darkMode} lang={lang}
                      onComplete={() => {}} // already done
                      onDelete={() => deleteTodo(todo.id)} />
                  ))}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          COLUMN 3 — STATS PANEL
      ══════════════════════════════════════════ */}
      <div style={{
        width: 300, flexShrink: 0,
        background: panelBg, borderLeft: `1px solid ${panelBorder}`,
        position: 'sticky', top: 0, height: '100vh',
        overflowY: 'auto', padding: '20px 16px 40px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}
        className="stats-panel-hide"
      >

        {/* 2×2 stat grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { emoji: '🔥', label: lang === 'no' ? 'Streak' : 'Streak', value: `${profile?.streak ?? 0}d`, color: '#fbbf24' },
            { emoji: '⚡', label: `Lv. ${profile?.level ?? 1}`, value: `${profile?.xp ?? 0} XP`, color: '#6c63ff' },
            { emoji: '✅', label: lang === 'no' ? 'I dag' : 'Today', value: `${completedToday.length}/${todayTotal}`, color: successColor },
            {
              emoji: '🎯',
              label: lang === 'no' ? 'Mål' : 'Goals',
              value: shortGoals.length > 0 ? `${avgShort}%` : '—',
              color: '#a78bfa',
            },
          ].map(({ emoji, label, value, color }) => (
            <div key={label} style={{ ...card, padding: '12px 14px', borderRadius: 12 }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{emoji}</div>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: textMuted, marginTop: 3, fontFamily: 'Space Mono, monospace' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* XP card */}
        <div style={{ ...card, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: textPrimary }}>
              ⚡ {lang === 'no' ? 'Nivå' : 'Level'} {profile?.level ?? 1}
            </span>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10, color: textMuted }}>
              {xpInCurrentLevel(profile?.xp ?? 0)}/{XP_PER_LEVEL}
            </span>
          </div>
          <div style={{ width: '100%', height: 7, background: darkMode ? '#1a1a2e' : '#ece9e2', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpProgressPercent(profile?.xp ?? 0)}%` }}
              transition={{ duration: 0.9 }}
              style={{ height: '100%', background: 'linear-gradient(90deg, #6c63ff, #a78bfa)', borderRadius: 99 }}
            />
          </div>
          <p style={{ fontSize: 11, color: textMuted, fontFamily: 'Space Mono, monospace' }}>
            {XP_PER_LEVEL - xpInCurrentLevel(profile?.xp ?? 0)} XP {lang === 'no' ? 'til Nivå' : 'to Level'} {(profile?.level ?? 1) + 1}
          </p>
        </div>

        {/* Progress card */}
        <div style={{ ...card, padding: '14px 16px' }}>
          <h4 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, marginBottom: 14, color: textPrimary }}>
            📊 {lang === 'no' ? 'Fremgang' : 'Progress'}
          </h4>
          {[
            { label: lang === 'no' ? 'Kortsiktige mål' : 'Short-term goals', value: avgShort, color: '#6c63ff', count: shortGoals.length },
            { label: lang === 'no' ? 'Langsiktige mål' : 'Long-term goals', value: avgLong, color: '#f59e0b', count: longGoals.length },
            { label: lang === 'no' ? 'Dagens oppgaver' : "Today's tasks", value: todayProgress, color: successColor, count: todayTotal },
          ].map(({ label, value, color, count }) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: textPrimary }}>{label}</span>
                <span style={{ fontSize: 11, fontFamily: 'Space Mono, monospace', color: count > 0 ? color : textMuted }}>
                  {count > 0 ? `${value}%` : '—'}
                </span>
              </div>
              <ProgressBar value={count > 0 ? value : 0} color={color} />
            </div>
          ))}
        </div>

        {/* Done today card */}
        <div style={{ ...card, padding: '14px 16px' }}>
          <h4 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, marginBottom: 12, color: textPrimary }}>
            ✦ {lang === 'no' ? 'Fullført i dag' : 'Done Today'}
          </h4>

          {completedToday.length === 0 ? (
            <p style={{ fontSize: 12, color: textMuted, fontStyle: 'italic', marginBottom: 12 }}>
              {lang === 'no' ? 'Ingen fullført ennå — kom i gang! 🚀' : 'Nothing done yet — get started! 🚀'}
            </p>
          ) : (
            <div style={{ marginBottom: 12 }}>
              {completedToday.slice(0, 5).map(todo => (
                <div key={todo.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${cardBorder}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                    <CheckCircle2 size={12} style={{ color: successColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, textDecoration: 'line-through', color: textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {todo.title}
                    </span>
                  </div>
                  <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 9, color: successColor, background: successBg, padding: '1px 6px', borderRadius: 99, flexShrink: 0, marginLeft: 4 }}>
                    +10
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 7-day activity squares */}
          <div style={{ marginTop: 4 }}>
            <p style={{ fontSize: 10, color: textMuted, fontFamily: 'Space Mono, monospace', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {lang === 'no' ? 'Siste 7 dager' : 'Last 7 days'}
            </p>
            <div style={{ display: 'flex', gap: 5 }}>
              {last7.map(({ label, isToday, active }, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    width: '100%', aspectRatio: '1', borderRadius: 5,
                    background: isToday
                      ? '#6c63ff'
                      : active
                        ? (darkMode ? 'rgba(74,222,128,0.35)' : '#bbf7d0')
                        : (darkMode ? '#1a1a2e' : '#e5e5e5'),
                    border: isToday ? '2px solid rgba(108,99,255,0.5)' : '1px solid transparent',
                  }} />
                  <span style={{ fontSize: 9, color: textMuted, fontFamily: 'Space Mono, monospace' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Evening review */}
        <div>
          {eveningContent ? (
            <div style={{ ...card, padding: '14px 16px' }}>
              <h4 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, marginBottom: 10, color: textPrimary }}>
                🌙 {lang === 'no' ? 'Kveldsgjennomgang' : 'Evening Review'}
              </h4>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: textPrimary }}>{eveningContent}</p>
            </div>
          ) : (
            <button
              onClick={handleEveningReview}
              disabled={eveningLoading || !apiKey}
              style={{
                width: '100%', padding: '12px', borderRadius: 12,
                border: '1.5px solid #6c63ff', background: 'transparent',
                color: '#8b85ff', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', opacity: (eveningLoading || !apiKey) ? 0.5 : 1,
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              {eveningLoading
                ? (lang === 'no' ? 'Genererer…' : 'Generating…')
                : `🌙 ${lang === 'no' ? 'Kveldsgjennomgang' : 'Evening review'}`}
            </button>
          )}
        </div>

      </div>

      </div>{/* end desktop-dashboard */}

      {/* ══ Shared modals (mobile + desktop) ══ */}
      <AnimatePresence>
        {showAdd && (
          <AddTodoModal
            lang={lang} darkMode={darkMode}
            onSave={handleAddTodo}
            onClose={() => setShowAdd(false)}
          />
        )}
      </AnimatePresence>

      {/* Brief History modal */}
      <AnimatePresence>
        {showHistory && (
          <BriefHistoryModal
            briefs={allBriefs}
            lang={lang}
            darkMode={darkMode}
            onClose={() => setShowHistory(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
