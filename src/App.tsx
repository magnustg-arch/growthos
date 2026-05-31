import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Component, type ReactNode } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import Layout from './components/layout/Layout'
import AuthPage from './components/auth/AuthPage'
import Dashboard from './pages/Dashboard'
import Todos from './pages/Todos'
import Goals from './pages/Goals'
import Chat from './pages/Chat'
import Settings from './pages/Settings'
import Notes from './pages/Notes'
import NoteEditor from './pages/NoteEditor'

// Global error boundary — shows a readable error instead of blank white screen
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090f', padding: 24 }}>
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color: '#6c63ff', marginBottom: 12 }}>GrowthOS</div>
            <div style={{ background: '#1a1a2e', border: '1px solid #2a2a48', borderRadius: 16, padding: 24 }}>
              <p style={{ color: '#ef4444', fontWeight: 700, marginBottom: 8, fontFamily: 'Space Mono, monospace', fontSize: 13 }}>Noe gikk galt</p>
              <p style={{ color: '#8080a8', fontSize: 12, fontFamily: 'Space Mono, monospace', marginBottom: 16, wordBreak: 'break-all' }}>{err.message}</p>
              <button onClick={() => window.location.reload()}
                style={{ background: '#6c63ff', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                Last inn på nytt
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function AppRoutes() {
  const { user, loading } = useApp()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 800, color: 'var(--primary)', marginBottom: 16 }}>GrowthOS</div>
          <div style={{ width: 32, height: 32, border: '3px solid var(--card-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!user) return <AuthPage />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/todos" element={<Todos />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/notes/:id" element={<NoteEditor />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
