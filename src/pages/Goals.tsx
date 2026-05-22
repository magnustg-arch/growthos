import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { t } from '../i18n'
import type { ShortTermGoal, LongTermGoal } from '../types'
import { differenceInDays, format } from 'date-fns'

function ProgressBar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="progress-bar">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        style={{ height: '100%', background: color ?? 'var(--primary)', borderRadius: 99 }} />
    </div>
  )
}

function ShortGoalCard({ goal, onEdit, onDelete, onComplete, lang }: {
  goal: ShortTermGoal
  onEdit: () => void
  onDelete: () => void
  onComplete: () => void
  lang: ReturnType<typeof useApp>['lang']
}) {
  const daysLeft = differenceInDays(new Date(goal.deadline), new Date())
  const isUrgent = daysLeft <= 3 && daysLeft >= 0
  const isOverdue = daysLeft < 0
  const isDone = goal.progress_percent === 100

  return (
    <motion.div layout className="card" style={{ padding: 18, marginBottom: 12, opacity: isDone ? 0.75 : 1 }}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: isDone ? 0.75 : 1, y: 0 }}>
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
                {isOverdue ? (lang === 'no' ? 'Forfalt!' : 'Overdue!') : `${daysLeft} ${t(lang, 'days')}`}
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

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t(lang, 'progress')}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: isDone ? 'var(--success)' : 'var(--primary)' }}>
            {isDone ? '✓ 100%' : `${goal.progress_percent}%`}
          </span>
        </div>
        <ProgressBar value={goal.progress_percent} color={isDone ? 'var(--success)' : 'var(--primary)'} />
      </div>

      {!isDone && (
        <button onClick={onComplete}
          style={{
            width: '100%', padding: '10px', borderRadius: 12, border: '1.5px solid var(--success)',
            background: 'transparent', color: 'var(--success)', fontWeight: 600, fontSize: 14,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.15s',
          }}
          onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = '#dcfce7' }}
          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
          <CheckCircle2 size={16} />
          {lang === 'no' ? 'Merk som fullført (+50 XP)' : 'Mark as complete (+50 XP)'}
        </button>
      )}
      {isDone && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px', color: 'var(--success)', fontSize: 14, fontWeight: 600 }}>
          <CheckCircle2 size={16} /> {lang === 'no' ? 'Fullført!' : 'Completed!'}
        </div>
      )}
    </motion.div>
  )
}

function LongGoalCard({ goal, onEdit, onDelete, onComplete, lang }: {
  goal: LongTermGoal
  onEdit: () => void
  onDelete: () => void
  onComplete: () => void
  lang: ReturnType<typeof useApp>['lang']
}) {
  const isDone = goal.progress_percent === 100

  return (
    <motion.div layout className="card" style={{ padding: 18, marginBottom: 12, opacity: isDone ? 0.75 : 1 }}
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: isDone ? 0.75 : 1, y: 0 }}>
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

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t(lang, 'progress')}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: isDone ? 'var(--success)' : '#f59e0b' }}>
            {isDone ? '✓ 100%' : `${goal.progress_percent}%`}
          </span>
        </div>
        <ProgressBar value={goal.progress_percent} color={isDone ? 'var(--success)' : '#f59e0b'} />
      </div>

      {goal.notes && (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, fontStyle: 'italic' }}>{goal.notes}</p>
      )}

      {!isDone && (
        <button onClick={onComplete}
          style={{
            width: '100%', padding: '10px', borderRadius: 12, border: '1.5px solid #f59e0b',
            background: 'transparent', color: '#f59e0b', fontWeight: 600, fontSize: 14,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.15s',
          }}
          onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fef3c7' }}
          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
          <CheckCircle2 size={16} />
          {lang === 'no' ? 'Merk som fullført (+200 XP)' : 'Mark as complete (+200 XP)'}
        </button>
      )}
      {isDone && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px', color: 'var(--success)', fontSize: 14, fontWeight: 600 }}>
          <CheckCircle2 size={16} /> {lang === 'no' ? 'Fullført!' : 'Completed!'}
        </div>
      )}
    </motion.div>
  )
}

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="card" style={{ width: '100%', maxWidth: 480, padding: 24 }}>
        <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
          {goal ? t(lang, 'edit') : t(lang, 'addGoal')}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input placeholder={t(lang, 'title')} value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} autoFocus />
          {type === 'short' && (
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={inputStyle} />
          )}
          <textarea placeholder={t(lang, 'notes')} value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            style={{ ...inputStyle, resize: 'none' }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose}
              style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--card-border)', background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}>
              {t(lang, 'cancel')}
            </button>
            <button onClick={() => { if (title.trim()) onSave({ title, deadline: deadline || undefined, notes: notes || null } as Partial<ShortTermGoal & LongTermGoal>) }}
              disabled={!title.trim()}
              style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: title.trim() ? 1 : 0.5 }}>
              {t(lang, 'save')}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Goals() {
  const { shortGoals, longGoals, addShortGoal, updateShortGoal, deleteShortGoal, addLongGoal, updateLongGoal, deleteLongGoal, lang } = useApp()
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
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 24 }}>{t(lang, 'goals')}</h1>
        <button onClick={() => { setEditGoal(null); setShowModal(true) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12,
            padding: '10px 16px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}>
          <Plus size={16} /> {t(lang, 'addGoal')}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['short', 'long'] as const).map(tp => (
          <button key={tp} onClick={() => setTab(tp)}
            style={{
              padding: '8px 18px', borderRadius: 10, border: 'none', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              background: tab === tp ? 'var(--primary)' : 'var(--card)',
              color: tab === tp ? '#fff' : 'var(--text-secondary)',
              boxShadow: tab === tp ? 'none' : 'var(--card-shadow)',
            }}>
            {tp === 'short' ? t(lang, 'shortTerm') : t(lang, 'longTerm')}
          </button>
        ))}
      </div>

      {tab === 'short' && (
        shortGoals.length === 0
          ? <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)' }}>{t(lang, 'noGoals')}</p>
            </div>
          : shortGoals.map(g => (
              <ShortGoalCard key={g.id} goal={g} lang={lang}
                onEdit={() => { setEditGoal(g); setShowModal(true) }}
                onDelete={() => deleteShortGoal(g.id)}
                onComplete={() => updateShortGoal(g.id, { progress_percent: 100 })} />
            ))
      )}

      {tab === 'long' && (
        longGoals.length === 0
          ? <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)' }}>{t(lang, 'noGoals')}</p>
            </div>
          : longGoals.map(g => (
              <LongGoalCard key={g.id} goal={g} lang={lang}
                onEdit={() => { setEditGoal(g); setShowModal(true) }}
                onDelete={() => deleteLongGoal(g.id)}
                onComplete={() => updateLongGoal(g.id, { progress_percent: 100 })} />
            ))
      )}

      <AnimatePresence>
        {showModal && (
          <GoalModal type={tab} goal={editGoal} lang={lang} onSave={handleSave}
            onClose={() => { setShowModal(false); setEditGoal(null) }} />
        )}
      </AnimatePresence>
    </div>
  )
}
