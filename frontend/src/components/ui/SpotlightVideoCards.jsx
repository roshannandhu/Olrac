import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Monitor } from 'lucide-react'

function VideoCard({ videos }) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (videos && idx >= videos.length) setIdx(0)
  }, [videos, idx])

  const current = videos?.[idx]
  const isVideo = current?.match(/\.(mp4|webm|mov|ogg|avi|mkv)$/i)

  useEffect(() => {
    if (!isVideo && videos && videos.length > 1 && current) {
      const t = setTimeout(() => setIdx((p) => (p + 1) % videos.length), 5000)
      return () => clearTimeout(t)
    }
  }, [idx, isVideo, videos, current])

  if (!videos || videos.length === 0) {
    return (
      <div className="relative h-full w-full bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Monitor className="h-8 w-8 text-white/20 mx-auto mb-2" />
          <p className="text-white/30 text-xs font-medium">Slot Available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-900">
      <div className="absolute inset-0 z-0">
        {isVideo ? (
          <video key={current} src={current} autoPlay muted playsInline
            loop={videos.length === 1}
            onEnded={() => setIdx((p) => (p + 1) % videos.length)}
            className="h-full w-full object-cover" />
        ) : (
          <img key={current} src={current} className="h-full w-full object-cover" alt="" />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      {videos.length > 1 && (
        <div className="absolute top-4 right-4 flex gap-1 z-20">
          {videos.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`} />
          ))}
        </div>
      )}
    </div>
  )
}

const SLOT_LABELS = ['High Traffic', 'Premium Zone', 'City Center']
const SLOT_DESCS = ['Malls & Transport Hubs', 'Entertainment Zones', 'Commercial Districts']

/**
 * Auto-cycling spotlight for 3 video cards.
 * Active card expands, shows progress bar, glows with violet ring.
 * Inactive cards shrink and dim. Click any card to focus it.
 */
export function SpotlightVideoCards({ card1 = [], card2 = [], card3 = [] }) {
  const cards = [card1, card2, card3]
  const DURATION = 4500
  const [activeIdx, setActiveIdx] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => {
      setActiveIdx((p) => (p + 1) % 3)
    }, DURATION)
    return () => clearInterval(t)
  }, [paused])

  return (
    <div className="flex flex-col md:flex-row h-[560px] w-full gap-3">
      {cards.map((cardVideos, i) => {
        const isActive = i === activeIdx
        return (
          <motion.div
            key={i}
            animate={{ flex: isActive ? 2.2 : 0.7 }}
            transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
            className="relative overflow-hidden rounded-[24px] cursor-pointer"
            style={{
              border: isActive
                ? '1.5px solid rgba(139,92,246,0.55)'
                : '1px solid rgba(255,255,255,0.06)',
              boxShadow: isActive
                ? '0 24px 64px rgba(0,0,0,0.5), 0 0 40px rgba(124,58,237,0.25)'
                : '0 24px 64px rgba(0,0,0,0.5)',
            }}
            onClick={() => { setActiveIdx(i); setPaused(true); setTimeout(() => setPaused(false), 8000) }}
          >
            {/* Video */}
            <VideoCard videos={cardVideos} />

            {/* Dim overlay on inactive */}
            <AnimatePresence>
              {!isActive && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/45 z-10"
                />
              )}
            </AnimatePresence>

            {/* Bottom label */}
            <div className="absolute inset-x-0 bottom-0 p-5 z-20 pointer-events-none">
              <AnimatePresence>
                {isActive ? (
                  <motion.div
                    key="full"
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.4 }}
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-300 mb-1">{SLOT_DESCS[i]}</p>
                    <p className="text-base font-black text-white">{SLOT_LABELS[i]}</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="mini"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold text-white/70"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    Slot {i + 1}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Progress bar — restarts when this card becomes active */}
            {isActive && (
              <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10 z-30">
                <motion.div
                  key={activeIdx}
                  className="h-full rounded-full bg-blue-500"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: DURATION / 1000, ease: 'linear' }}
                />
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
