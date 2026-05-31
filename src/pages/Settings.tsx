import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Moon, Sun, Globe, Key, LogOut, Save, Check, Plus, Trash2, RefreshCw, User } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { t } from '../i18n'
import { supabase } from '../lib/supabase'
import type { Priority } from '../types'

const PRIORITY_COLORS: Record<Priority, string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#22c55e',
}
const PRIORITY_BG: Record<Priority, string> = {
  high: '#fee2e2', medium: '#fef3c7', low: '#dcfce7',
}

export default function Settings() {
  const { profile, lang, setLang, darkMode, setDarkMode, user, habits, addHabit, deleteHabit, updateDisplayName } = useApp()
  const [apiKey, setApiKey] = useState('')
  const [apiKeySaved, setApiKeySaved] = useState(false)
  const [newHabit, setNewHabit] = useState('')
  const [newHabitPriority, setNewHabitPriority] = useState<Priority>('medium')
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [displayNameSaved, setDisplayNameSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('growthos_apikey')
    if (stored) setApiKey(stored)
  }, [])

  async function saveDisplayName() {
    await updateDisplayName(displayName.trim())
    setDisplayNameSaved(true)
    setTimeout(() => setDisplayNameSaved(false), 2000)
  }

  function saveApiKey() {
    localStorage.setItem('growthos_apikey', apiKey)
    setApiKeySaved(true)
    setTimeout(() => setApiKeySaved(false), 2000)
  }

  async function handleAddHabit() {
    if (!newHabit.trim()) return
    await addHabit(newHabit.trim(), newHabitPriority)
    setNewHabit('')
  }

  const Row = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--card-border)' }}>
      {children}
    </div>
  )

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button onClick={onChange}
      style={{ width: 48, height: 26, borderRadius: 99, border: 'none', cursor: 'pointer', background: value ? 'var(--primary)' : 'var(--card-border)', position: 'relative', transition: 'background 0.2s' }}>
      <motion.div animate={{ x: value ? 22 : 2 }}
        style={{ position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
    </button>
  )

  const inputStyle = {
    padding: '10px 12px', borderRadius: 10,
    border: '1px solid var(--card-border)', background: 'var(--bg)',
    color: 'var(--text-primary)', fontSize: 14, outline: 'none',
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px 40px' }}>
      <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 24, marginBottom: 24 }}>{t(lang, 'settingsTitle')}</h1>

      {/* Profile / Display Name */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <User size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: 700, fontSize: 15, fontFamily: 'Syne, sans-serif' }}>
            {lang === 'no' ? 'Profil' : 'Profile'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            placeholder={t(lang, 'displayNamePlaceholder')}
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            onBlur={saveDisplayName}
            onKeyDown={e => { if (e.key === 'Enter') saveDisplayName() }}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={saveDisplayName}
            style={{
              padding: '10px 16px', borderRadius: 10, border: 'none',
              background: displayNameSaved ? 'var(--success)' : 'var(--primary)',
              color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.2s', whiteSpace: 'nowrap',
            }}>
            {displayNameSaved ? <Check size={16} /> : <Save size={16} />}
            {displayNameSaved ? (lang === 'no' ? 'Lagret!' : 'Saved!') : t(lang, 'save')}
          </button>
        </div>
      </div>

      {/* Appearance */}
      <div className="card" style={{ padding: '4px 20px', marginBottom: 16 }}>
        <Row>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {darkMode ? <Moon size={18} style={{ color: 'var(--primary)' }} /> : <Sun size={18} style={{ color: 'var(--warning)' }} />}
            <span style={{ fontWeight: 500 }}>{t(lang, 'darkMode')}</span>
          </div>
          <Toggle value={darkMode} onChange={() => setDarkMode(!darkMode)} />
        </Row>
        <Row>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Globe size={18} style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: 500 }}>{t(lang, 'language')}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['no', 'en'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)}
                style={{
                  padding: '5px 14px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  background: lang === l ? 'var(--primary)' : 'var(--card-border)',
                  color: lang === l ? '#fff' : 'var(--text-secondary)',
                }}>
                {l === 'no' ? '🇳🇴 NO' : '🇬🇧 EN'}
              </button>
            ))}
          </div>
        </Row>
      </div>

      {/* Daily Habits */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <RefreshCw size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: 700, fontSize: 15, fontFamily: 'Syne, sans-serif' }}>
            {lang === 'no' ? 'Daglige vaner' : 'Daily Habits'}
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
          {lang === 'no'
            ? 'Legges automatisk til i oppgavelisten hver dag.'
            : 'Automatically added to your task list every day.'}
        </p>

        {/* Add habit form */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            placeholder={lang === 'no' ? 'F.eks. Lese 30 min' : 'E.g. Read 30 min'}
            value={newHabit}
            onChange={e => setNewHabit(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddHabit() }}
            style={{ ...inputStyle, flex: 1 }} />
          <select value={newHabitPriority} onChange={e => setNewHabitPriority(e.target.value as Priority)}
            style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="high">{t(lang, 'high')}</option>
            <option value="medium">{t(lang, 'medium')}</option>
            <option value="low">{t(lang, 'low')}</option>
          </select>
          <button onClick={handleAddHabit} disabled={!newHabit.trim()}
            style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: newHabit.trim() ? 1 : 0.5 }}>
            <Plus size={16} />
          </button>
        </div>

        {habits.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            {lang === 'no' ? 'Ingen vaner ennå.' : 'No habits yet.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {habits.map(h => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--card-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 700,
                    fontFamily: 'Space Mono, monospace', textTransform: 'uppercase',
                    background: PRIORITY_BG[h.priority], color: PRIORITY_COLORS[h.priority],
                  }}>
                    {t(lang, h.priority)}
                  </span>
                  <span style={{ fontSize: 14 }}>{h.title}</span>
                </div>
                <button onClick={() => deleteHabit(h.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API Key */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Key size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: 700, fontSize: 15, fontFamily: 'Syne, sans-serif' }}>{t(lang, 'apiKey')}</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          {lang === 'no'
            ? 'Lagres kun lokalt i nettleseren. Hent nøkkel på console.anthropic.com'
            : 'Stored locally in browser only. Get key at console.anthropic.com'}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input type="password" placeholder={t(lang, 'apiKeyPlaceholder')} value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            style={{ ...inputStyle, flex: 1 }} />
          <button onClick={saveApiKey}
            style={{
              padding: '10px 16px', borderRadius: 10, border: 'none',
              background: apiKeySaved ? 'var(--success)' : 'var(--primary)',
              color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.2s', whiteSpace: 'nowrap',
            }}>
            {apiKeySaved ? <Check size={16} /> : <Save size={16} />}
            {apiKeySaved ? (lang === 'no' ? 'Lagret!' : 'Saved!') : t(lang, 'saveApiKey')}
          </button>
        </div>
      </div>

      {/* Account */}
      <div className="card" style={{ padding: '4px 20px' }}>
        <Row>
          <div>
            <p style={{ fontWeight: 600, marginBottom: 2 }}>{t(lang, 'account')}</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user?.email ?? ''}</p>
          </div>
          <button onClick={() => supabase.auth.signOut()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid #fca5a5', background: '#fff0f0', color: '#ef4444', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            <LogOut size={14} /> {t(lang, 'signOut')}
          </button>
        </Row>
      </div>

      <p style={{ textAlign: 'center', marginTop: 32, fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'Space Mono, monospace' }}>
        GrowthOS v1.0.0
      </p>
    </div>
  )
}
