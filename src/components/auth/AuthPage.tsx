import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, Globe } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../context/AppContext'
import { t } from '../../i18n'

export default function AuthPage() {
  const { lang } = useApp()
  const [mode, setMode] = useState<'signin' | 'register'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="card" style={{ width: '100%', maxWidth: 400, padding: 32 }}>
        <h1 style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: 'var(--primary)', marginBottom: 8 }}>
          GrowthOS
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 28, fontSize: 14 }}>
          {lang === 'no' ? 'Din personlige veksthub' : 'Your personal growth hub'}
        </p>

        <button onClick={handleGoogle}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '12px 20px', borderRadius: 12, border: '1px solid var(--card-border)',
            background: 'var(--card)', color: 'var(--text-primary)', fontWeight: 600, fontSize: 14,
            cursor: 'pointer', marginBottom: 20, transition: 'background 0.15s',
          }}>
          <Globe size={18} />
          {t(lang, 'signInWithGoogle')}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--card-border)' }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
            {lang === 'no' ? 'eller' : 'or'}
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--card-border)' }} />
        </div>

        <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input type="email" placeholder={t(lang, 'email')} value={email} onChange={e => setEmail(e.target.value)} required
              style={{
                width: '100%', padding: '12px 14px 12px 40px', borderRadius: 12,
                border: '1px solid var(--card-border)', background: 'var(--bg)',
                color: 'var(--text-primary)', fontSize: 14, outline: 'none',
              }} />
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input type="password" placeholder={t(lang, 'password')} value={password} onChange={e => setPassword(e.target.value)} required
              style={{
                width: '100%', padding: '12px 14px 12px 40px', borderRadius: 12,
                border: '1px solid var(--card-border)', background: 'var(--bg)',
                color: 'var(--text-primary)', fontSize: 14, outline: 'none',
              }} />
          </div>

          {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}

          <button type="submit" disabled={loading}
            style={{
              background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12,
              padding: '12px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              opacity: loading ? 0.7 : 1,
            }}>
            {loading ? t(lang, 'loading') : mode === 'signin' ? t(lang, 'signIn') : t(lang, 'register')}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--text-secondary)' }}>
          {t(lang, 'noAccount')}{' '}
          <button onClick={() => setMode(mode === 'signin' ? 'register' : 'signin')}
            style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            {mode === 'signin' ? t(lang, 'register') : t(lang, 'signIn')}
          </button>
        </p>
      </motion.div>
    </div>
  )
}
