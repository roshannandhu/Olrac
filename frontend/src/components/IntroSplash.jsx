import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { INTRO_SPLASH_KEY } from '../utils/displayExperience'

const DISPLAY_MS = 3000
const FADE_MS = 480

const BASE_TEXT_STYLE = {
  fontSize: 'clamp(2.6rem, 8vw, 6rem)',
  letterSpacing: '0.22em',
  lineHeight: 1,
  fontWeight: 900,
}

function GlitchTitle({ text }) {
  return (
    <div className="relative select-none" aria-label={text}>

      {/* Chromatic shard — top slice, red offset */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ clipPath: 'inset(8% 0 62% 0)' }}
        initial={{ opacity: 0, x: 0 }}
        animate={{ opacity: [0, 0.65, 0.2, 0], x: [0, -16, 6, 0] }}
        transition={{ duration: 0.5, delay: 0.3, ease: 'linear', times: [0, 0.28, 0.65, 1] }}
      >
        <span
          className="block uppercase"
          style={{ ...BASE_TEXT_STYLE, color: 'rgba(239,68,68,0.75)' }}
        >
          {text}
        </span>
      </motion.div>

      {/* Chromatic shard — bottom slice, indigo offset */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ clipPath: 'inset(62% 0 6% 0)' }}
        initial={{ opacity: 0, x: 0 }}
        animate={{ opacity: [0, 0.6, 0.18, 0], x: [0, 14, -5, 0] }}
        transition={{ duration: 0.5, delay: 0.3, ease: 'linear', times: [0, 0.28, 0.65, 1] }}
      >
        <span
          className="block uppercase"
          style={{ ...BASE_TEXT_STYLE, color: 'rgba(8,145,178,0.75)' }}
        >
          {text}
        </span>
      </motion.div>

      {/* Horizontal scan line during glitch */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 h-[2px] bg-white/40"
        style={{ top: '42%' }}
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: [0, 0.7, 0], scaleX: [0, 1, 1] }}
        transition={{ duration: 0.32, delay: 0.35, ease: 'linear', times: [0, 0.25, 1] }}
      />

      {/* Main text with glitch entrance */}
      <motion.h1
        className="relative uppercase text-white"
        style={{
          ...BASE_TEXT_STYLE,
          textShadow: [
            '0 0 45px rgba(8,145,178,0.9)',
            '0 0 100px rgba(8,145,178,0.45)',
            '0 0 25px rgba(255,255,255,0.12)',
          ].join(','),
        }}
        initial={{ opacity: 0, y: 10, filter: 'blur(28px)' }}
        animate={{
          opacity: [0, 0.7,  0.4,  1,   0.75, 1,   1,   1,   1],
          y:       [10,  0,    2,   -2,   1,   0,   0,   0,   0],
          x:       [0,  -9,   11,  -4,   2,   -1,   0,   0,   0],
          skewX:   [0,  -3,   2,  -.9,  .4,    0,   0,   0,   0],
          filter: [
            'blur(28px)',
            'blur(6px)',
            'blur(0px)',
            'blur(5px)',
            'blur(0px)',
            'blur(0px)',
            'blur(0px)',
            'blur(0px)',
            'blur(0px)',
          ],
        }}
        transition={{
          duration: 0.88,
          delay: 0.3,
          ease: 'linear',
          times: [0, 0.13, 0.24, 0.37, 0.52, 0.67, 0.8, 0.92, 1],
        }}
      >
        {text}
      </motion.h1>
    </div>
  )
}

export default function IntroSplash({ companyName = 'OLRAC', onComplete }) {
  const [seen] = useState(() => {
    try { return sessionStorage.getItem(INTRO_SPLASH_KEY) === 'true' } catch { return false }
  })
  const [exiting, setExiting] = useState(false)
  const [done, setDone] = useState(seen)

  const brandName = useMemo(
    () => String(companyName || 'OLRAC').toUpperCase().trim(),
    [companyName],
  )

  useEffect(() => {
    if (seen) return
    const t1 = setTimeout(() => setExiting(true), DISPLAY_MS)
    const t2 = setTimeout(() => {
      try { sessionStorage.setItem(INTRO_SPLASH_KEY, 'true') } catch {}
      setDone(true)
      onComplete?.()
    }, DISPLAY_MS + FADE_MS)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [seen, onComplete])

  if (done) return null

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-black"
      initial={{ opacity: 1 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: exiting ? FADE_MS / 1000 : 0, ease: [0.4, 0, 0.6, 1] }}
    >
      {/* Subtle grid */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.75, ease: 'easeOut' }}
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '72px 72px',
        }}
      />

      {/* Corner accent marks */}
      {[
        'top-6 left-6 border-t border-l',
        'top-6 right-6 border-t border-r',
        'bottom-6 left-6 border-b border-l',
        'bottom-6 right-6 border-b border-r',
      ].map((cls, i) => (
        <motion.div
          aria-hidden="true"
          key={i}
          className={`pointer-events-none absolute h-5 w-5 border-white/15 ${cls}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 + i * 0.06 }}
        />
      ))}

      {/* Purple glow bloom behind text */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.72 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, delay: 0.35, ease: [0.0, 0.0, 0.2, 1.0] }}
      >
        <div
          style={{
            width: 'min(72vw, 820px)',
            height: 'min(36vw, 400px)',
            borderRadius: '50%',
            background:
              'radial-gradient(ellipse at center, rgba(8,145,178,0.26) 0%, rgba(2,132,199,0.13) 38%, transparent 68%)',
            filter: 'blur(60px)',
          }}
        />
      </motion.div>

      {/* Company name */}
      <GlitchTitle text={brandName} />

      {/* Progress bar */}
      <div className="absolute bottom-10 inset-x-0 flex justify-center">
        <div className="relative h-px w-40 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="absolute inset-y-0 left-0 w-full origin-left rounded-full"
            style={{
              background: 'linear-gradient(90deg, rgba(8,145,178,0.8) 0%, rgba(255,255,255,0.85) 100%)',
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: DISPLAY_MS / 1000, ease: 'linear' }}
          />
        </div>
      </div>
    </motion.div>
  )
}
