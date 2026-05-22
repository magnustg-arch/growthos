import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Trash2, Bot, User } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { t } from '../i18n'
import { chatWithClaude, type ChatMessage } from '../lib/claude'
import { useNavigate } from 'react-router-dom'

export default function Chat() {
  const { profile, todos, shortGoals, longGoals, lang } = useApp()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKeyLocal] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const stored = localStorage.getItem('growthos_apikey')
    if (stored) setApiKeyLocal(stored)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim() || !profile || !apiKey || loading) return
    const userMsg: ChatMessage = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    try {
      const reply = await chatWithClaude(apiKey, profile, todos, shortGoals, longGoals, lang, newMessages)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ ' + (e instanceof Error ? e.message : String(e)) }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100vh', padding: '0' }}>
      {/* Header */}
      <div style={{
        padding: '20px 16px 16px', borderBottom: '1px solid var(--card-border)',
        background: 'var(--card)', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 20, marginBottom: 2 }}>{t(lang, 'chat')}</h1>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>claude-sonnet-4-6</p>
          </div>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])}
              style={{ background: 'none', border: '1px solid var(--card-border)', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <Trash2 size={14} /> {t(lang, 'clearChat')}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!apiKey && (
          <div className="card" style={{ padding: 20, textAlign: 'center' }}>
            <Bot size={32} style={{ color: 'var(--primary)', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: 14 }}>
              {lang === 'no' ? 'Du trenger en Anthropic API-nøkkel for å chatte med Claude.' : 'You need an Anthropic API key to chat with Claude.'}
            </p>
            <button onClick={() => navigate('/settings')}
              style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}>
              {lang === 'no' ? 'Gå til innstillinger' : 'Go to settings'}
            </button>
          </div>
        )}

        {messages.length === 0 && apiKey && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Bot size={40} style={{ color: 'var(--primary)', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              {lang === 'no' ? 'Hva vil du snakke om?' : 'What would you like to talk about?'}
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{
                display: 'flex', gap: 10, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
              }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: msg.role === 'user' ? 'var(--primary)' : 'var(--navy)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {msg.role === 'user'
                  ? <User size={16} color="#fff" />
                  : <Bot size={16} color="#a0a0c0" />}
              </div>
              <div style={{
                maxWidth: '78%', padding: '12px 14px', borderRadius: 14,
                background: msg.role === 'user' ? 'var(--primary)' : 'var(--card)',
                color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                fontSize: 14, lineHeight: 1.65,
                border: msg.role === 'assistant' ? '1px solid var(--card-border)' : 'none',
              }}>
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={16} color="#a0a0c0" />
            </div>
            <div style={{ padding: '12px 16px', borderRadius: 14, background: 'var(--card)', border: '1px solid var(--card-border)' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-secondary)' }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px', borderTop: '1px solid var(--card-border)',
        background: 'var(--card)', position: 'sticky', bottom: 0,
      }}>
        <div style={{ display: 'flex', gap: 10, maxWidth: 680, margin: '0 auto' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={t(lang, 'chatPlaceholder')}
            disabled={!apiKey || loading}
            style={{
              flex: 1, padding: '12px 14px', borderRadius: 12,
              border: '1px solid var(--card-border)', background: 'var(--bg)',
              color: 'var(--text-primary)', fontSize: 14, outline: 'none',
            }} />
          <button onClick={send} disabled={!input.trim() || !apiKey || loading}
            style={{
              width: 44, height: 44, borderRadius: 12, border: 'none',
              background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', opacity: (!input.trim() || !apiKey || loading) ? 0.5 : 1, flexShrink: 0,
            }}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
