import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Monitor } from 'lucide-react'

function VideoPlayer({ videos }) {
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
      <div className="relative h-full w-full bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Monitor className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400 text-xs font-medium">Slot Available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100 border border-slate-200">
      {isVideo ? (
        <video
          key={current}
          src={current}
          autoPlay
          muted
          playsInline
          loop={videos.length === 1}
          onEnded={() => setIdx((p) => (p + 1) % videos.length)}
          className="h-full w-full object-cover"
        />
      ) : (
        <img key={current} src={current} className="h-full w-full object-cover" alt="" />
      )}

      {videos.length > 1 && (
        <div className="absolute top-3 right-3 flex gap-1 z-20">
          {videos.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === idx ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`} />
          ))}
        </div>
      )}
    </div>
  )
}

function TiltCard3D({ children, className = '' }) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const xSpring = useSpring(x, { stiffness: 260, damping: 32 })
  const ySpring = useSpring(y, { stiffness: 260, damping: 32 })
  const rotateX = useTransform(ySpring, [-0.5, 0.5], ['10deg', '-10deg'])
  const rotateY = useTransform(xSpring, [-0.5, 0.5], ['-10deg', '10deg'])
  const shadowY = useTransform(ySpring, [-0.5, 0.5], ['-8px', '8px'])
  const shadowX = useTransform(xSpring, [-0.5, 0.5], ['-8px', '8px'])

  const handleMouseMove = (e) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { x.set(0); y.set(0) }}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className={`cursor-pointer ${className}`}
    >
      <motion.div
        style={{
          transformStyle: 'preserve-3d',
          boxShadow: useTransform(
            [xSpring, ySpring],
            ([xv, yv]) =>
              `${-xv * 20}px ${yv * 20}px 40px rgba(15,23,42,0.12), 0 8px 24px rgba(15,23,42,0.06)`
          ),
        }}
        className="h-full w-full rounded-[22px] overflow-hidden border border-slate-100"
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

export function VibrantVideoCards({ card1 = [], card2 = [], card3 = [] }) {
  const cards = [card1, card2, card3]
  const mobileSliderRef = useRef(null)
  const [activeMobileIdx, setActiveMobileIdx] = useState(1)

  useEffect(() => {
    const container = mobileSliderRef.current
    if (!container) return undefined

    const getCards = () => Array.from(container.querySelectorAll('[data-mobile-video-card]'))

    const updateActive = () => {
      const containerRect = container.getBoundingClientRect()
      const containerCenter = containerRect.left + containerRect.width / 2
      let nearestIdx = 0
      let nearestDistance = Number.POSITIVE_INFINITY

      getCards().forEach((card, index) => {
        const rect = card.getBoundingClientRect()
        const center = rect.left + rect.width / 2
        const distance = Math.abs(containerCenter - center)
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestIdx = index
        }
      })

      setActiveMobileIdx(nearestIdx)
    }

    const centerInitialCard = () => {
      const card = getCards()[1]
      if (!card) return
      const targetLeft = card.offsetLeft - (container.clientWidth - card.clientWidth) / 2
      container.scrollTo({ left: targetLeft, behavior: 'auto' })
      updateActive()
    }

    let rafId = 0
    const onScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(updateActive)
    }

    const onResize = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(updateActive)
    }

    const initId = requestAnimationFrame(centerInitialCard)
    container.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(initId)
      cancelAnimationFrame(rafId)
      container.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <>
      {/* Mobile — horizontal scroll carousel with 3D tilt on active card */}
      <div className="md:hidden" style={{ perspective: '900px' }}>
        <div
          ref={mobileSliderRef}
          className="-mx-4 overflow-x-auto px-[11vw] pb-4 pt-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex items-stretch gap-4">
            {cards.map((videos, i) => {
              const isActive = activeMobileIdx === i
              const side = i < activeMobileIdx ? 1 : -1
              return (
                <motion.div
                  key={i}
                  data-mobile-video-card
                  animate={{
                    scale: isActive ? 1 : 0.91,
                    opacity: isActive ? 1 : 0.55,
                    rotateY: isActive ? 0 : side * 14,
                    z: isActive ? 0 : -30,
                  }}
                  transition={{ duration: 0.32, ease: [0.25, 1, 0.5, 1] }}
                  className="snap-center"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div
                    className="w-[74vw] min-w-[74vw] max-w-[320px] h-[260px] overflow-hidden rounded-[22px] border border-slate-100"
                    style={{
                      boxShadow: isActive
                        ? '0 20px 50px rgba(15,23,42,0.14), 0 4px 12px rgba(15,23,42,0.06)'
                        : '0 6px 20px rgba(15,23,42,0.06)',
                    }}
                  >
                    <VideoPlayer videos={videos} />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          {cards.map((_, i) => (
            <motion.span
              key={i}
              animate={{
                width: activeMobileIdx === i ? 22 : 8,
                opacity: activeMobileIdx === i ? 1 : 0.35,
              }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="h-2 rounded-full bg-blue-500"
            />
          ))}
        </div>
      </div>

      {/* Desktop — equal 3-column grid with 3D mouse-tilt per card */}
      <div className="hidden md:grid md:grid-cols-3 gap-5" style={{ perspective: '1200px' }}>
        {cards.map((videos, i) => (
          <TiltCard3D key={i} className="h-[320px]">
            <VideoPlayer videos={videos} />
          </TiltCard3D>
        ))}
      </div>
    </>
  )
}
