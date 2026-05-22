import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, CheckSquare, Target, MessageCircle, Settings, LogOut } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { t } from '../../i18n'
import LevelUpOverlay from '../gamification/LevelUpOverlay'
import { supabase } from '../../lib/supabase'

function UserAvatar({ size = 34 }: { size?: number }) {
  const { user, profile, lang, darkMode } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const initials = (user?.email ?? '?').charAt(0).toUpperCase()

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          width: size, height: size, borderRadius: '50%',
          background: 'var(--primary)', color: '#fff',
          fontWeight: 700, fontSize: size * 0.4,
          border: '2px solid rgba(108,99,255,0.3)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne, sans-serif', flexShrink: 0,
        }}>
        {initials}
      </button>
      {open && (
        <div style={{
          position: 'absolute', left: size + 8, bottom: 0,
          background: 'var(--card)', border: '1px solid var(--card-border)',
          borderRadius: 14, padding: 8, minWidth: 200,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)', zIndex: 200,
        }}>
          <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid var(--card-border)', marginBottom: 4 }}>
            <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'Syne, sans-serif', color: 'var(--text-primary)' }}>
              {user?.email?.split('@')[0]}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {t(lang, 'level')} {profile?.level ?? 1} · {profile?.xp ?? 0} XP
            </div>
          </div>
          <button onClick={() => supabase.auth.signOut()}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 10, border: 'none',
              background: 'transparent', color: '#ef4444',
              fontSize: 14, fontWeight: 500, cursor: 'pointer', textAlign: 'left',
            }}>
            <LogOut size={15} /> {t(lang, 'signOut')}
          </button>
        </div>
      )}
    </div>
  )
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { lang, levelUpAlert, dismissLevelUp, darkMode } = useApp()

  const navItems = [
    { to: '/', icon: Home, label: t(lang, 'home') },
    { to: '/todos', icon: CheckSquare, label: t(lang, 'todos') },
    { to: '/goals', icon: Target, label: t(lang, 'goals') },
    { to: '/chat', icon: MessageCircle, label: t(lang, 'chat') },
  ]

  const sidebarBg = darkMode ? '#0c0c16' : '#ffffff'
  const sidebarBorder = darkMode ? '#1a1a2e' : '#ece9e2'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Desktop icon sidebar */}
      <aside style={{
        display: 'none',
        width: 72, minHeight: '100vh',
        background: sidebarBg,
        borderRight: `1px solid ${sidebarBorder}`,
        flexDirection: 'column', alignItems: 'center',
        padding: '20px 0', position: 'sticky', top: 0, height: '100vh',
        flexShrink: 0,
      }}
        className="md-sidebar">
        {/* Logo dot */}
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'var(--primary)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', marginBottom: 28,
        }}>
          <span style={{ color: '#fff', fontFamily: 'Syne', fontWeight: 800, fontSize: 14 }}>G</span>
        </div>

        {/* Nav icons */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              title={label}
              style={({ isActive }) => ({
                width: 44, height: 44, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? '#fff' : (darkMode ? '#555580' : '#aaaaaa'),
                textDecoration: 'none', transition: 'all 0.15s',
              })}>
              <Icon size={20} />
            </NavLink>
          ))}
        </nav>

        {/* Bottom: Settings + Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <NavLink to="/settings" title={t(lang, 'settings')}
            style={({ isActive }) => ({
              width: 44, height: 44, borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isActive ? 'var(--primary)' : 'transparent',
              color: isActive ? '#fff' : (darkMode ? '#555580' : '#aaaaaa'),
              textDecoration: 'none', transition: 'all 0.15s',
            })}>
            <Settings size={20} />
          </NavLink>
          <UserAvatar size={34} />
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minHeight: '100vh', overflow: 'auto', paddingBottom: 72 }}
        className="main-content">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', borderTop: '1px solid var(--card-border)',
        background: 'var(--card)', zIndex: 40,
      }} className="mobile-nav">
        {[...navItems, { to: '/settings', icon: Settings, label: t(lang, 'settings') }].map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 0 8px', textDecoration: 'none' }}>
            {({ isActive }) => (
              <>
                <Icon size={20} style={{ color: isActive ? 'var(--primary)' : 'var(--text-secondary)' }} />
                <span style={{ fontSize: 10, fontWeight: 500, marginTop: 2, color: isActive ? 'var(--primary)' : 'var(--text-secondary)' }}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {levelUpAlert && <LevelUpOverlay level={levelUpAlert} onClose={dismissLevelUp} />}
    </div>
  )
}
