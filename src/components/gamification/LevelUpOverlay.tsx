import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../context/AppContext'
import { t } from '../../i18n'

export default function LevelUpOverlay({ level, onClose }: { level: number; onClose: () => void }) {
  const { lang } = useApp()

  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(108,99,255,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
        }}>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 80, marginBottom: 8 }}>🎉</div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 36, fontWeight: 800, marginBottom: 8 }}>
            {t(lang, 'levelUp')}
          </h2>
          <p style={{ fontSize: 20, opacity: 0.9 }}>
            {t(lang, 'newLevel')} {level}
          </p>
          <p style={{ fontSize: 14, opacity: 0.7, marginTop: 16 }}>
            {lang === 'no' ? 'Trykk for å lukke' : 'Click to close'}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
