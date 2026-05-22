import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { t } from '../i18n'
import type { ShortTermGoal, LongTermGoal } from '../types'
import { differenceInDays, format } from 'date-fns'

// ─── Goal Progress Slider ──────────────────────────────────────────────────────
// A single <input type="range"> that IS both the visual bar and the interactive slider.
// The gradient background updates live while dragging.

function GoalProgressSlider({
  initialValue,
  isDone,
  darkMode,
  lang,
  showMilestones = false,
  onSave,
}: {
  initialValue: number
  isDone: boolean
  darkMode: boolean
  lang: 'no' | 'en'
  showMilestones?: boolean
  onSave: (value: number) => Promise<void>
}) {
  const [value, setValue] = useState(initialValue)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  // Sync when external value changes (e.g. "mark complete" button)
  useEffect(() => {
    setValue(initialValue)
    setDirty(false)
  }, [initialValue])

  const trackColor = darkMode ? '#1a1a2e' : '#f0ede8'
  const sliderBg = isDone
    ? `linear-gradient(to right, var(--success) 100%, ${trackColor} 100%)`
    : `linear-gradient(to right, #6c63ff 0%, #a855f7 ${value}%, ${trackColor} ${value}%, ${trackColor} 100%)`

  async function handleSave() {
    setSaving(true)
    await onSave(value)
    setDirty(false)
    setSaving(false)
  }

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Line 1: label + live % + Lagre button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showMilestones ? 6 : 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {t(lang, 'progress')}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700,
            color: isDone ? 'var(--success)' : '#6c63ff',
          }}>
            {isDone ? '✓ 100%' : `${value}%`}
          </span>
          {dirty && !isDone && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: '#6c63ff', color: '#fff',
                border: 'none', borderRadius: 8,
                padding: '4px 12px', fontSize: 12, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                fontFamily: 'DM Sans, sans-serif',
                transition: 'opacity 0.15s',
              }}
            >
              {saving ? '…' : (lang === 'no' ? 'Lagre' : 'Save')}
            </button>
          )}
        </div>
      </div>

      {/* Milestone dots for long-term goals — above the slider */}
      {showMilestones && (
        <div style={{ position: 'relative', height: 20, marginBottom: 6 }}>
          {[25, 50, 75, 100].map(pct => (
            <div key={pct} style={{
              position: 'absolute',
              left: `${pct}%`,
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: value >= pct ? '#6c63ff' : (darkMode ? '#2a2a3a' : '#d5d0ca'),
                border: `1.5px solid ${value >= pct ? '#a855f7' : 'transparent'}`,
                transition: 'background 0.2s, border-color 0.2s',
              }} />
              <span style={{
                fontSize: 8,
                color: 'var(--text-secondary)',
                marginTop: 2,
                fontFamily: 'Space Mono, monospace',
              }}>
                {pct}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Line 2: the slider IS the progress bar */}
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={isDone}
        onChange={e => {
          setValue(Number(e.target.value))
          setDirty(true)
        }}
        className="goal-slider"
        style={{ background: sliderBg }}
      />
    </div>
  )
}

// ─── Short Goal Card ───────────────────────────────────────────────────────────

function ShortGoalCard({ goal, onEdit, onDelete, onComplete, onSave, lang, darkMode }: {
  goal: ShortTermGoal
  onEdit: () => void
  onDelete: () => void
  onComplete: () => void
  onSave: (value: number) => Promise<void>
  lang: ReturnType<typeof useApp>['lang']
  darkMode: boolean
}) {
  const daysLeft = differenceInDays(new Date(goal.deadline), new Date())
  const isUrgent = daysLeft <= 3 && daysLeft >= 0
  const isOverdue = daysLeft < 0
  const isDone = goal.progress_percent === 100

  return (
    <motion.div
      layout
      className="card"
      style={{
        padding: 18,
        marginBottom: 12,
        opacity: isDone ? 0.75 : 1,
        // Amber border when deadline is within 3 days
        border: isUrgent && !isDone ? '1px solid #f59e0b' : undefined,
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isDone ? 0.75 : 1, y: 0 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <h4 style={{
            fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 4,
            textDecoration: isDone ? 'line-through' : 'none',
            color: isDone ? 'var(--text-secondary)' : 'var(--text-primary)',
          }}>
            {goal.title}
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'Space Mono, monospace' }}>
              {format(new Date(goal.deadline), 'd MMM yyyy')}
            </span>
            {(isUrgent || isOverdue) && !isDone && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--warning)', fontWeight: 600 }}>
                <AlertTriangle size={12} />
                {isOverdue
                  ? (lang === 'no' ? 'Forfalt!' : 'Overdue!')
                  : `${daysLeft} ${t(lang, 'days')}`}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {!isDone && (
            <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 6 }}>
              <Edit2 size={14} />
            </button>
          )}
          <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 6 }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Combined progress bar + slider */}
      <GoalProgressSlider
        initialValue={goal.progress_percent}
        isDone={isDone}
        darkMode={darkMode}
        lang={lang}
        onSave={onSave}
      />

      {/* Complete / Done button */}
      {!isDone ? (
        <button
          onClick={onComplete}
          style={{
            width: '100%', padding: '10px', borderRadius: 12,
            border: '1.5px solid var(--success)',
            background: 'transparent', color: 'var(--success)',
            fontWeight: 600, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.15s',
          }}
          onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = '#dcfce7' }}
          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
        >
          <CheckCircle2 size={16} />
          {lang === 'no' ? 'Merk som fullført (+50 XP)' : 'Mark as complete (+50 XP)'}
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px', color: 'var(--success)', fontSize: 14, fontWeight: 600 }}>
          <CheckCircle2 size={16} /> {lang === 'no' ? 'Fullført!' : 'Completed!'}
        </div>
      )}
    </motion.div>
  )
}

// ─── Long Goal Card ────────────────────────────────────────────────────────────

function LongGoalCard({ goal, onEdit, onDelete, onComplete, onSave, lang, darkMode }: {
  goal: LongTermGoal
  onEdit: () => void
  onDelete: () => void
  onComplete: () => void
  onSave: (value: number) => Promise<void>
  lang: ReturnType<typeof useApp>['lang']
  darkMode: boolean
}) {
  const isDone = goal.progress_percent === 100

  return (
    <motion.div
      layout
      className="card"
      style={{ padding: 18, marginBottom: 12, opacity: isDone ? 0.75 : 1 }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isDone ? 0.75 : 1, y: 0 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <h4 style={{
            fontFamily: 'Syne', fontWeight: 700, fontSize: 15, marginBottom: 6,
            textDecoration: isDone ? 'line-through' : 'none',
            color: isDone ? 'var(--text-secondary)' : 'var(--text-primary)',
          }}>
            {goal.title}
          </h4>
          {goal.milestones.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {goal.milestones.map((m, i) => (
                <span key={i} style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 99,
                  background: m.reached ? '#dcfce7' : 'var(--card-border)',
                  color: m.reached ? 'var(--success)' : 'var(--text-secondary)',
                  fontFamily: 'Space Mono, monospace',
                }}>
                  {m.reached ? '✓ ' : ''}{m.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {!isDone && (
            <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 6 }}>
              <Edit2 size={14} />
            </button>
          )}
          <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 6 }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Combined progress bar + slider with milestone dots */}
      <GoalProgressSlider
        initialValue={goal.progress_percent}
        isDone={isDone}
        darkMode={darkMode}
        lang={lang}
        showMilestones
        onSave={onSave}
      />

      {goal.notes && (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, fontStyle: 'italic' }}>
          {goal.notes}
        </p>
      )}

      {/* Complete / Done button */}
      {!isDone ? (
        <button
          onClick={onComplete}
          style={{
            width: '100%', padding: '10px', borderRadius: 12,
            border: '1.5px solid #f59e0b',
            background: 'transparent', color: '#f59e0b',
            fontWeight: 600, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.15s',
          }}
          onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fef3c7' }}
          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
        >
          <CheckCircle2 size={16} />
          {lang === 'no' ? 'Merk som fullført (+200 XP)' : 'Mark as complete (+200 XP)'}
        </button>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px', color: 'var(--success)', fontSize: 14, fontWeight: 600 }}>
          <CheckCircle2 size={16} /> {lang === 'no' ? 'Fullført!' : 'Completed!'}
        </div>
      )}
    </motion.div>
  )
}

// ─── Goal Modal ────────────────────────────────────────────────────────────────

function GoalModal({ type, goal, onSave, onClose, lang }: {
  type: 'short' | 'long'
  goal?: ShortTermGoal | LongTermGoal | null
  onSave: (data: Partial<ShortTermGoal & LongTermGoal>) => void
  onClose: () => void
  lang: ReturnType<typeof useApp>['lang']
}) {
  const [title, setTitle] = useState(goal?.title ?? '')
  const [deadline, setDeadline] = useState((goal as ShortTermGoal)?.deadline ?? '')
  const [notes, setNotes] = useState(goal?.notes ?? '')

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '1px solid var(--card-border)', background: 'var(--bg)',
    color: 'var(--text-primary)', fontSize: 14, outline: 'none',
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50, padding: 16 }}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="card"
        style={{ width: '100%', maxWidth: 480, padding: 24 }}
      >
        <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
          {goal ? t(lang, 'edit') : t(lang, 'addGoal')}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            placeholder={t(lang, 'title')}
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={inputStyle}
            autoFocus
          />
          {type === 'short' && (
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={inputStyle} />
          )}
          <textarea
            placeholder={t(lang, 'notes')}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            style={{ ...inputStyle, resize: 'none' }}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onClose}
              style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--card-border)', background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
            >
              {t(lang, 'cancel')}
            </button>
            <button
              onClick={() => {
                if (title.trim()) onSave({ title, deadline: deadline || undefined, notes: notes || null } as Partial<ShortTermGoal & LongTermGoal>)
              }}
              disabled={!title.trim()}
              style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: title.trim() ? 1 : 0.5 }}
            >
              {t(lang, 'save')}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Goals() {
  const {
    shortGoals, longGoals,
    addShortGoal, updateShortGoal, deleteShortGoal,
    addLongGoal, updateLongGoal, deleteLongGoal,
    lang, darkMode,
  } = useApp()

  const [tab, setTab] = useState<'short' | 'long'>('short')
  const [showModal, setShowModal] = useState(false)
  const [editGoal, setEditGoal] = useState<ShortTermGoal | LongTermGoal | null>(null)

  async function handleSave(data: Partial<ShortTermGoal & LongTermGoal>) {
    if (tab === 'short') {
      if (editGoal) await updateShortGoal(editGoal.id, data)
      else await addShortGoal(data as Omit<ShortTermGoal, 'id' | 'user_id' | 'created_at'>)
    } else {
      if (editGoal) await updateLongGoal(editGoal.id, data)
      else await addLongGoal({ ...data, milestones: [] } as Omit<LongTermGoal, 'id' | 'user_id' | 'created_at'>)
    }
    setShowModal(false)
    setEditGoal(null)
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 40px', overflowX: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 24 }}>{t(lang, 'goals')}</h1>
        <button
          onClick={() => { setEditGoal(null); setShowModal(true) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12,
            padding: '10px 16px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}
        >
          <Plus size={16} /> {t(lang, 'addGoal')}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['short', 'long'] as const).map(tp => (
          <button key={tp} onClick={() => setTab(tp)}
            style={{
              padding: '8px 18px', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              background: tab === tp ? 'var(--primary)' : 'var(--card)',
              color: tab === tp ? '#fff' : 'var(--text-secondary)',
              boxShadow: tab === tp ? 'none' : 'var(--card-shadow)',
            }}
          >
            {tp === 'short' ? t(lang, 'shortTerm') : t(lang, 'longTerm')}
          </button>
        ))}
      </div>

      {/* Short-term goals */}
      {tab === 'short' && (
        shortGoals.length === 0
          ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)' }}>{t(lang, 'noGoals')}</p>
            </div>
          )
          : shortGoals.map(g => (
            <ShortGoalCard
              key={g.id}
              goal={g}
              lang={lang}
              darkMode={darkMode}
              onEdit={() => { setEditGoal(g); setShowModal(true) }}
              onDelete={() => deleteShortGoal(g.id)}
              onComplete={() => updateShortGoal(g.id, { progress_percent: 100 })}
              onSave={async (v) => updateShortGoal(g.id, { progress_percent: v })}
            />
          ))
      )}

      {/* Long-term goals */}
      {tab === 'long' && (
        longGoals.length === 0
          ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)' }}>{t(lang, 'noGoals')}</p>
            </div>
          )
          : longGoals.map(g => (
            <LongGoalCard
              key={g.id}
              goal={g}
              lang={lang}
              darkMode={darkMode}
              onEdit={() => { setEditGoal(g); setShowModal(true) }}
              onDelete={() => deleteLongGoal(g.id)}
              onComplete={() => updateLongGoal(g.id, { progress_percent: 100 })}
              onSave={async (v) => updateLongGoal(g.id, { progress_percent: v })}
            />
          ))
      )}

      <AnimatePresence>
        {showModal && (
          <GoalModal
            type={tab}
            goal={editGoal}
            lang={lang}
            onSave={handleSave}
            onClose={() => { setShowModal(false); setEditGoal(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
