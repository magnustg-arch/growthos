import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import Layout from './components/layout/Layout'
import AuthPage from './components/auth/AuthPage'
import Dashboard from './pages/Dashboard'
import Todos from './pages/Todos'
import Goals from './pages/Goals'
import Chat from './pages/Chat'
import Settings from './pages/Settings'

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
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  )
}
