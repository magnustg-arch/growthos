import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit2, CheckCircle, Circle, GripVertical } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { t } from '../i18n'
import type { Todo, Priority } from '../types'
import { format } from 'date-fns'

const PRIORITY_COLORS: Record<Priority, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
}

const PRIORITY_BG: Record<Priority, string> = {
  high: '#fee2e2',
  medium: '#fef3c7',
  low: '#dcfce7',
}

function PriorityBadge({ priority, lang }: { priority: Priority; lang: ReturnType<typeof useApp>['lang'] }) {
  return (
    <span style={{
      background: PRIORITY_BG[priority], color: PRIORITY_COLORS[priority],
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      fontFamily: 'Space Mono, monospace', textTransform: 'uppercase',
    }}>
      {t(lang, priority as 'high' | 'medium' | 'low')}
    </span>
  )
}

function TodoModal({ todo, onSave, onClose, lang }: {
  todo?: Todo | null
  onSave: (data: Partial<Todo>) => void
  onClose: () => void
  lang: ReturnType<typeof useApp>['lang']
}) {
  const [title, setTitle] = useState(todo?.title ?? '')
  const [priority, setPriority] = useState<Priority>(todo?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(todo?.due_date ?? '')
  const [notes, setNotes] = useState(todo?.notes ?? '')

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
          {todo ? t(lang, 'edit') : t(lang, 'addTodo')}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input placeholder={t(lang, 'title')} value={title} onChange={e => setTitle(e.target.value)}
            style={inputStyle} autoFocus />
          <div style={{ display: 'flex', gap: 8 }}>
            {(['high', 'medium', 'low'] as Priority[]).map(p => (
              <button key={p} onClick={() => setPriority(p)}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 10, border: `2px solid ${priority === p ? PRIORITY_COLORS[p] : 'var(--card-border)'}`,
                  background: priority === p ? PRIORITY_BG[p] : 'transparent',
                  color: priority === p ? PRIORITY_COLORS[p] : 'var(--text-secondary)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Space Mono, monospace', textTransform: 'uppercase',
                }}>
                {t(lang, p as 'high' | 'medium' | 'low')}
              </button>
            ))}
          </div>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} />
          <textarea placeholder={t(lang, 'notes')} value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            style={{ ...inputStyle, resize: 'none' }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose}
              style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--card-border)', background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}>
              {t(lang, 'cancel')}
            </button>
            <button onClick={() => { if (title.trim()) onSave({ title, priority, due_date: dueDate || null, notes: notes || null }) }}
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

function TodoItem({ todo, onComplete, onDelete, onEdit, lang }: {
  todo: Todo
  onComplete: () => void
  onDelete: () => void
  onEdit: () => void
  lang: ReturnType<typeof useApp>['lang']
}) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
        borderBottom: '1px solid var(--card-border)',
      }}>
      <GripVertical size={16} style={{ color: 'var(--card-border)', flexShrink: 0, cursor: 'grab' }} />
      <button onClick={onComplete} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
        {todo.completed
          ? <CheckCircle size={22} style={{ color: 'var(--success)' }} />
          : <Circle size={22} style={{ color: 'var(--text-secondary)' }} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14, fontWeight: 500,
          color: todo.completed ? 'var(--text-secondary)' : 'var(--text-primary)',
          textDecoration: todo.completed ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        } as React.CSSProperties}>
          {todo.title}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          <PriorityBadge priority={todo.priority} lang={lang} />
          {todo.due_date && (
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'Space Mono, monospace' }}>
              {format(new Date(todo.due_date), 'd MMM')}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}>
          <Edit2 size={15} />
        </button>
        <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}>
          <Trash2 size={15} />
        </button>
      </div>
    </motion.div>
  )
}

export default function Todos() {
  const { todos, completeTodo, deleteTodo, addTodo, updateTodo, lang } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [editTodo, setEditTodo] = useState<Todo | null>(null)

  const active = todos.filter(t => !t.completed)
  const groups: Record<Priority, Todo[]> = {
    high: active.filter(t => t.priority === 'high'),
    medium: active.filter(t => t.priority === 'medium'),
    low: active.filter(t => t.priority === 'low'),
  }

  async function handleSave(data: Partial<Todo>) {
    if (editTodo) {
      await updateTodo(editTodo.id, data)
    } else {
      await addTodo(data as Omit<Todo, 'id' | 'user_id' | 'created_at' | 'completed' | 'completed_at'>)
    }
    setShowModal(false)
    setEditTodo(null)
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 24 }}>{t(lang, 'todos')}</h1>
        <button onClick={() => { setEditTodo(null); setShowModal(true) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12,
            padding: '10px 16px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}>
          <Plus size={16} /> {t(lang, 'addTodo')}
        </button>
      </div>

      {active.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>{t(lang, 'noTodos')}</p>
        </div>
      ) : (
        (['high', 'medium', 'low'] as Priority[]).map(priority => (
          groups[priority].length > 0 && (
            <div key={priority} className="card" style={{ marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid var(--card-border)' }}>
                <PriorityBadge priority={priority} lang={lang} />
              </div>
              <AnimatePresence>
                {groups[priority].map(todo => (
                  <TodoItem key={todo.id} todo={todo} lang={lang}
                    onComplete={() => completeTodo(todo.id)}
                    onDelete={() => deleteTodo(todo.id)}
                    onEdit={() => { setEditTodo(todo); setShowModal(true) }} />
                ))}
              </AnimatePresence>
            </div>
          )
        ))
      )}

      <AnimatePresence>
        {(showModal || editTodo) && (
          <TodoModal todo={editTodo} lang={lang}
            onSave={handleSave}
            onClose={() => { setShowModal(false); setEditTodo(null) }} />
        )}
      </AnimatePresence>
    </div>
  )
}
