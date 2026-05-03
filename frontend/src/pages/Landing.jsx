import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  Monitor,
  Sparkles,
  Target,
  Zap,
  RadioTower,
  TrendingUp,
} from 'lucide-react'
import { usePublicSettings } from '../context/PublicSettingsContext'
import { track } from '../utils/analytics'
import api from '../api/axios'
import Seo from '../components/Seo'
import IntroSplash from '../components/IntroSplash'
import { TiltCard } from '../components/ui/TiltCard'
import { DigitalBillboard } from '../components/ui/DigitalBillboard'
import { SonarButton } from '../components/ui/SonarButton'
import { VibrantVideoCards } from '../components/ui/VibrantVideoCards'
import {
  fadeUp, pageTransition, btnBounce, staggerContainer, staggerContainerSlow,
  staggerItem, sectionReveal, float, tiltIn, cascadeItem, blurReveal,
} from '../utils/animations'
import { PAGE_SEO } from '../utils/seo'

const EASE_OUT = [0.0, 0.0, 0.2, 1.0]

const HERO_TAGS = ['Digital Advertising', 'Emerging Platform', 'Smart Targeting']

const PLATFORM_TAGS = ['Digital Signage', 'DOOH', 'Outdoor Advertising', 'Brand Recall']

const PLATFORM_SUPPORT_CARDS = [
  {
    icon: RadioTower,
    title: 'For Every Business',
    desc: 'Startups to established brands - every business size and budget welcome.',
    gradient: 'linear-gradient(135deg, #1e40af, #1d4ed8)',
  },
  {
    icon: TrendingUp,
    title: 'Real Impact',
    desc: 'Affordable DOOH advertising that turns footfall into brand awareness.',
    gradient: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
  },
]

const LAUNCH_STEPS = [
  { step: '01', icon: Target, title: 'Configure Campaign', desc: 'Choose your preferred locations and campaign duration.' },
  { step: '02', icon: Monitor, title: 'Book Premium Slots', desc: 'Select from our digital screen inventory in high-traffic areas.' },
  { step: '03', icon: ImageIcon, title: 'Upload Creative Assets', desc: 'Send your visuals, video, or campaign brief to our team.' },
  { step: '04', icon: Zap, title: 'Go Live Instantly', desc: 'Your brand begins showing on all confirmed screens.' },
]

// ── Infinite marquee ──────────────────────────────────────────
function Marquee({ items }) {
  const repeated = [...items, ...items, ...items, ...items]
  return (
    <div className="overflow-hidden border-y border-white/[0.05] bg-[#07070d] py-3 sm:py-[18px]">
      <motion.div
        animate={{ x: [0, '-50%'] }}
        transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
        className="flex whitespace-nowrap"
        style={{ willChange: 'transform' }}
      >
        {repeated.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-2 px-5 text-[10px] font-black uppercase tracking-[0.18em] text-white/35 sm:gap-3 sm:px-8 sm:text-[11px] sm:tracking-[0.22em]">
            {item}
            <span className="h-[5px] w-[5px] rounded-full bg-blue-400/60 inline-block flex-shrink-0" />
          </span>
        ))}
      </motion.div>
    </div>
  )
}

// ── Video card ────────────────────────────────────────────────
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
          <img key={current} src={current} loading="lazy" className="h-full w-full object-cover" alt="Digital advertising screen preview" />
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

// ── Page ──────────────────────────────────────────────────────
export default function Landing() {
  const { settings } = usePublicSettings()
  const navigate = useNavigate()
  const location = useLocation()
  const heroRef = useRef(null)
  const ctaRef = useRef(null)
  const [showFloatingCTA, setShowFloatingCTA] = useState(false)
  const [brandImages, setBrandImages] = useState([])
  const [brandImagesLoaded, setBrandImagesLoaded] = useState(false)
  const [videoCards, setVideoCards] = useState({ card1: [], card2: [], card3: [] })
  const heroMediaUrls = useMemo(
    () => Array.isArray(settings.config.hero_billboard_media) ? settings.config.hero_billboard_media : [],
    [settings.config.hero_billboard_media]
  )
  const [loading, setLoading] = useState(true)
  const [isBrandCarouselDragging, setIsBrandCarouselDragging] = useState(false)
  const brandCarouselRef = useRef(null)
  const brandCarouselDragRef = useRef({ active: false, startX: 0, startScrollLeft: 0 })
  const brandCarouselPausedRef = useRef(false)
  const brandCarouselResumeTimeoutRef = useRef(null)
  const appName = settings.config.general_app_name || 'OLRAC Advertise'

  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroBgY = useTransform(scrollYProgress, [0, 1], ['0%', '35%'])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.08])

  useEffect(() => {
    const fetchBrandImages = async () => {
      try {
        const res = await api.get('/settings/brand-images', { params: { t: Date.now() } })
        setBrandImages(Array.isArray(res.data.images) ? res.data.images : [])
      } catch {
        setBrandImages([])
      } finally {
        setBrandImagesLoaded(true)
        setLoading(false)
      }
    }

    const fetchLandingVideos = async () => {
      try {
        const res = await api.get('/settings/landing-videos', { params: { t: Date.now() } })
        setVideoCards({
          card1: Array.isArray(res.data.card1) ? res.data.card1 : [],
          card2: Array.isArray(res.data.card2) ? res.data.card2 : [],
          card3: Array.isArray(res.data.card3) ? res.data.card3 : [],
        })
      } catch {
        setVideoCards({ card1: [], card2: [], card3: [] })
      }
    }

    fetchBrandImages()
    fetchLandingVideos()

    const handleSettingsUpdate = () => {
      setBrandImagesLoaded(false)
      fetchBrandImages()
      fetchLandingVideos()
    }
    window.addEventListener('olrac-settings-updated', handleSettingsUpdate)
    return () => window.removeEventListener('olrac-settings-updated', handleSettingsUpdate)
  }, [])

  useEffect(() => {
    if (location.state?.scrollTo === 'contact') {
      navigate('/', { replace: true, state: {} })
      const timer = setTimeout(() => {
        const target = document.getElementById('contact')
        if (target) {
          const top = target.getBoundingClientRect().top + window.scrollY - 88
          window.scrollTo({ top, behavior: 'smooth' })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [location.state, navigate])

  useEffect(() => {
    const handleScroll = () => {
      const heroBottom = heroRef.current?.getBoundingClientRect().bottom ?? 0
      const ctaTop = ctaRef.current?.getBoundingClientRect().top ?? window.innerHeight
      setShowFloatingCTA(heroBottom < window.innerHeight * 0.42 && ctaTop > window.innerHeight * 0.72)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const brandMotionItems = useMemo(() => {
    const configured = (brandImages || []).filter(Boolean).map((url, i) => ({
      id: `brand-${i}`,
      name: appName,
      image_url: url,
    }))
    if (configured.length === 0) return []
    const base = [...configured]
    while (base.length < 8) base.push(...configured.map((item, i) => ({ ...item, id: `${item.id}-r-${i}-${base.length}` })))
    return [...base, ...base]
  }, [appName, brandImages])

  const whatsappNumber = String(
    settings.whatsapp_number || settings.config.general_contact_phone || ''
  ).replace(/[^\d]/g, '')

  const contactHref = whatsappNumber
    ? `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent('Hi, I want to advertise with OLRAC.')}`
    : '#contact'

  const pauseBrandCarousel = () => {
    brandCarouselPausedRef.current = true
    if (brandCarouselResumeTimeoutRef.current) clearTimeout(brandCarouselResumeTimeoutRef.current)
  }

  const resumeBrandCarouselLater = (delay = 1400) => {
    if (brandCarouselResumeTimeoutRef.current) clearTimeout(brandCarouselResumeTimeoutRef.current)
    brandCarouselResumeTimeoutRef.current = setTimeout(() => {
      brandCarouselPausedRef.current = false
    }, delay)
  }

  const normalizeBrandCarouselPosition = () => {
    const container = brandCarouselRef.current
    if (!container) return
    const loopWidth = container.scrollWidth / 2
    if (loopWidth && container.scrollLeft >= loopWidth) container.scrollLeft -= loopWidth
  }

  const handleBrandCarouselWheel = (e) => {
    const container = brandCarouselRef.current
    if (!container) return
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    if (!delta) return
    e.preventDefault()
    pauseBrandCarousel()
    container.scrollLeft += delta
    normalizeBrandCarouselPosition()
    resumeBrandCarouselLater()
  }

  const handleBrandCarouselPointerDown = (e) => {
    const container = brandCarouselRef.current
    if (!container) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    pauseBrandCarousel()
    setIsBrandCarouselDragging(true)
    brandCarouselDragRef.current = { active: true, startX: e.clientX, startScrollLeft: container.scrollLeft }
    container.setPointerCapture?.(e.pointerId)
  }

  const handleBrandCarouselPointerMove = (e) => {
    const container = brandCarouselRef.current
    const drag = brandCarouselDragRef.current
    if (!container || !drag.active) return
    e.preventDefault()
    container.scrollLeft = drag.startScrollLeft - (e.clientX - drag.startX)
    normalizeBrandCarouselPosition()
  }

  const handleBrandCarouselPointerUp = (e) => {
    const container = brandCarouselRef.current
    if (container && brandCarouselDragRef.current.active) container.releasePointerCapture?.(e.pointerId)
    brandCarouselDragRef.current.active = false
    setIsBrandCarouselDragging(false)
    resumeBrandCarouselLater()
  }

  useEffect(() => {
    if (!brandMotionItems.length) return
    let rafId, prevTs
    const step = (ts) => {
      if (prevTs == null) prevTs = ts
      const elapsed = ts - prevTs
      prevTs = ts
      const container = brandCarouselRef.current
      if (container && !brandCarouselPausedRef.current && !brandCarouselDragRef.current.active) {
        container.scrollLeft += ((window.innerWidth < 640 ? 38 : 56) * elapsed) / 1000
        normalizeBrandCarouselPosition()
      }
      rafId = requestAnimationFrame(step)
    }
    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [brandMotionItems.length])

  useEffect(() => () => {
    if (brandCarouselResumeTimeoutRef.current) clearTimeout(brandCarouselResumeTimeoutRef.current)
  }, [])

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-[#050508]"
    >
      <Seo meta={PAGE_SEO['/']} />
      <IntroSplash companyName={appName} />

      {/* ── FLOATING CTA PILL ──────────────────────────────────── */}
      <AnimatePresence>
        {showFloatingCTA && (
          <motion.div
            initial={{ y: 28, opacity: 0, scale: 0.92 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 18, opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4rem)] z-50 flex justify-center px-3 pointer-events-none sm:bottom-14 sm:px-4 lg:bottom-16"
          >
            <button
              type="button"
              onClick={() => { track('cta_clicked', { cta: 'hero_advertise', page: 'landing' }); navigate('/booking') }}
              className="group pointer-events-auto inline-flex w-full max-w-sm items-center justify-center gap-3.5 rounded-full px-8 py-4 text-[15px] font-black text-white shadow-[0_14px_54px_rgba(29,78,216,0.62)] backdrop-blur-xl transition-all hover:shadow-[0_18px_72px_rgba(29,78,216,0.8)] hover:scale-[1.03] active:scale-[0.97] sm:w-auto sm:max-w-none sm:px-10 sm:py-[1.05rem]"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <Sparkles className="h-5 w-5 text-blue-200" />
              Get Instant Quotation
              <ArrowRight className="h-5 w-5 text-white/80 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative flex items-start overflow-hidden bg-[#050508] lg:min-h-screen lg:items-center">
        {/* Parallax background */}
        <motion.div
          style={{ y: heroBgY, scale: heroScale }}
          className="absolute inset-0 z-0"
        >
          <img src="/hero.jpeg" alt="OLRAC Advertise digital screen advertising network" className="h-full w-full object-cover object-center opacity-[0.38]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050508]/55 via-[#050508]/20 to-[#050508]" />
        </motion.div>

        {/* Ambient blobs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.28, 0.15] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute left-[-18%] top-[-5%] z-0 h-[320px] w-[320px] rounded-full bg-blue-800 blur-[96px] sm:h-[600px] sm:w-[600px] sm:blur-[160px]"
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.08, 0.16, 0.08] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="pointer-events-none absolute bottom-[10%] right-[-14%] z-0 h-[240px] w-[240px] rounded-full bg-blue-700 blur-[90px] sm:right-[-5%] sm:h-[400px] sm:w-[400px] sm:blur-[130px]"
        />

        <div className="relative z-10 w-full lg:hidden">
          <div className="mx-auto flex min-h-[88svh] max-w-lg flex-col justify-between px-5 pb-10 pt-24">
            {/* Top content */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55 }}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-white/70"
                style={{ background: 'rgba(255,255,255,0.07)' }}
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                {appName}
              </motion.div>

              <motion.div
                role="heading"
                aria-level="1"
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.08 }}
                className="mt-5 text-[2.6rem] font-black leading-[0.90] tracking-tight text-white"
              >
                Place your brand
                <span
                  className="mt-2 block"
                  style={{
                    background: 'linear-gradient(135deg, #93c5fd 0%, #3b82f6 50%, #1d4ed8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  where the city already looks at an affordable price.
                </span>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.22 }}
                className="mt-4 text-[15px] leading-7 text-white/75"
              >
                Digital advertising across premium high-traffic screens.
                From startups to enterprises - reach the right audience, instantly.
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.32 }}
                className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {HERO_TAGS.map((tag) => (
                  <span
                    key={tag}
                    className="shrink-0 rounded-full border border-white/15 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/65"
                    style={{ background: 'rgba(255,255,255,0.07)' }}
                  >
                    {tag}
                  </span>
                ))}
              </motion.div>

              {/* Mini billboard preview */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.42 }}
                className="relative mt-6 h-[148px] w-full overflow-hidden rounded-[22px] border border-white/[0.12]"
                style={{ background: 'linear-gradient(135deg, #0c1a40, #050b1e)' }}
              >
                {heroMediaUrls.length > 0 ? (
                  <div className="absolute inset-0">
                    <VideoCard videos={heroMediaUrls} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Monitor className="mx-auto mb-2 h-8 w-8 text-blue-400/40" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Premium Screen</p>
                    </div>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 rounded-[22px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]" />
                <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 backdrop-blur-sm">
                  <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.8, repeat: Infinity }} className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/70">On Air</span>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">Your Brand On Screen</span>
                  <div className="rounded-full bg-blue-700/60 px-2.5 py-1 backdrop-blur-sm">
                    <span className="text-[9px] font-bold text-white/80">High Traffic</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Bottom: price badge + live + buttons */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="mt-10"
            >
              {/* Price + live row */}
              <div className="mb-4 flex items-center gap-3">
                <div
                  className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 backdrop-blur-sm"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                >
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/40 leading-none mb-1">Starting</p>
                    <p className="text-[1.45rem] font-black text-white leading-none">
                      Rs 99<span className="text-xs font-medium text-white/45">/day</span>
                    </p>
                  </div>
                </div>
                <motion.div
                  animate={{ opacity: [0.65, 1, 0.65] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 backdrop-blur-sm"
                >
                  <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <p className="text-[12px] font-bold text-emerald-300">Live Now</p>
                </motion.div>
              </div>

              {/* CTA buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <SonarButton
                  variant="shimmer"
                  onClick={() => {
                    track('cta_clicked', { cta: 'hero_mobile_quote', page: 'landing' })
                    navigate('/booking')
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-700 px-4 py-4 text-[14px] font-black text-white shadow-[0_0_40px_rgba(29,78,216,0.5)] transition-all hover:bg-blue-600"
                >
                  <Sparkles className="h-4 w-4" />
                  Instant Quotation
                  <ArrowRight className="h-4 w-4" />
                </SonarButton>
                <button
                  onClick={() => navigate('/locations')}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-white/[0.18] bg-white/[0.06] px-4 py-4 text-[14px] font-bold text-white/90 transition hover:border-white/[0.3] hover:bg-white/[0.1]"
                >
                  <MapPin className="h-4 w-4" />
                  View Locations
                </button>
              </div>

              {/* Trust strip */}
              <div className="mt-4 flex items-center justify-center gap-5 border-t border-white/[0.07] pt-4">
                {[
                  { Icon: Monitor, text: 'Premium Slots' },
                  { Icon: Zap, text: 'Go Live Fast' },
                  { Icon: MapPin, text: 'Multiple Areas' },
                ].map(({ Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-white/30" />
                    <span className="text-[10px] font-semibold text-white/40 tracking-wide">{text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 hidden w-full lg:block">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-36">
            <div className="grid gap-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">

              {/* Left */}
              <div className="max-w-3xl">
                <motion.div
                  variants={fadeUp} initial="hidden" animate="visible"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white/70 backdrop-blur-sm mb-6"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                  {appName}
                </motion.div>

                <div className="overflow-hidden">
                  <motion.h1
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.1 }}
                    className="text-3xl font-black leading-[0.93] text-white sm:text-4xl lg:text-5xl xl:text-6xl"
                  >
                    Place your brand
                    <span className="block mt-2" style={{
                      background: 'linear-gradient(135deg, #93c5fd 0%, #3b82f6 50%, #1d4ed8 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}>
                      where the city already looks at an affordable price.
                    </span>
                  </motion.h1>
                </div>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.3, ease: EASE_OUT }}
                  className="mt-7 max-w-xl text-base leading-8 !text-white sm:text-lg font-medium"
                >
                  Digital advertising across premium high-traffic screens.
                  From startups to enterprises — reach the right audience, instantly.
                </motion.p>

                <motion.div
                  variants={staggerContainer} initial="hidden" animate="visible"
                  className="mt-6 flex flex-wrap gap-2"
                >
                  {['Digital Advertising', 'Emerging Platform', 'Smart Targeting'].map((tag) => (
                    <motion.span
                      variants={staggerItem}
                      key={tag}
                      className="rounded-full border border-white/15 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/65"
                      style={{ background: 'rgba(255,255,255,0.07)' }}
                    >
                      {tag}
                    </motion.span>
                  ))}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.5, ease: EASE_OUT }}
                  className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap"
                >
                  <SonarButton
                    variant="shimmer"
                    onClick={() => navigate('/booking')}
                    className="inline-flex items-center gap-3 rounded-full bg-blue-700 px-9 py-4 text-[15px] font-black text-white shadow-[0_0_48px_rgba(29,78,216,0.6)] hover:bg-blue-600 transition-all"
                  >
                    <Sparkles className="h-4 w-4" />
                    Instant Quotation
                    <ArrowRight className="h-4 w-4" />
                  </SonarButton>
                  <motion.button
                    variants={btnBounce} whileHover="hover" whileTap="tap"
                    onClick={() => navigate('/locations')}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-4 text-[15px] font-bold text-white/85 backdrop-blur-sm transition-all hover:border-white/35 hover:text-white"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                  >
                    <MapPin className="h-4 w-4" />
                    View Locations
                  </motion.button>
                </motion.div>
              </div>

              {/* Right — Billboard + floating cards */}
              <motion.div
                initial={{ opacity: 0, scale: 0.88, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.4, ease: EASE_OUT }}
                className="relative w-full z-20 mt-10 lg:mt-0"
              >
                <DigitalBillboard mediaUrls={heroMediaUrls} />

                {/* Floating price card */}
                <motion.div
                  variants={float}
                  animate="animate"
                  className="absolute -left-6 -top-6 z-30 rounded-2xl border border-white/10 px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-white/45">Starting Price</p>
                  <p className="mt-1 text-2xl font-black text-white">
                    Rs 99
                    <span className="text-sm font-medium text-white/45">/day</span>
                  </p>
                </motion.div>

                {/* Live indicator */}
                <motion.div
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -right-3 bottom-8 z-30 flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 backdrop-blur-sm"
                >
                  <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <p className="text-xs font-bold text-emerald-300">Live Now</p>
                </motion.div>
              </motion.div>

            </div>
          </div>
        </motion.div>

        {/* Bottom fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-[#07070d] to-transparent lg:h-40" />
      </section>

      {/* ── MARQUEE ──────────────────────────────────────────── */}
      <Marquee items={['Digital Advertising', 'Real World Reach', 'High Traffic Locations', 'Instant Go-Live', 'Premium Screens', 'Maximum Visibility', 'DOOH Platform', 'Brand Amplification']} />

      {/* ── WHAT IS OLRAC — Bento ─────────────────────────────── */}
      <section className="lg:hidden">
        {/* Dark-to-light transition bridge */}
        <div className="h-8 w-full" style={{ background: 'linear-gradient(to bottom, #07070d, #ffffff)' }} />

        <div className="bg-white pb-4">
          <div className="mx-auto max-w-xl px-4">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-600">01 — The Platform</p>
            <h2 className="mt-3 text-[2rem] font-black leading-[1.02] tracking-tight text-slate-900">
              What is{' '}
              <span style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                OLRAC?
              </span>
            </h2>
            <p className="mt-3 text-[15px] leading-7 text-slate-500">
              A digital advertising platform that displays your brand on real-world screens
              in high-traffic locations - turning everyday spaces into powerful ad moments.
            </p>

            <div className="mt-5 relative overflow-hidden rounded-[26px] border border-slate-100 bg-white p-5 shadow-[0_14px_42px_rgba(15,23,42,0.08)]">
              {/* Top accent bar */}
              <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-[26px]" style={{ background: 'linear-gradient(90deg, #1d4ed8, #3b82f6)' }} />
              {/* Subtle bg blob */}
              <div className="pointer-events-none absolute -right-10 -top-10 h-[160px] w-[160px] rounded-full opacity-[0.06]"
                style={{ background: 'radial-gradient(circle, #1d4ed8, transparent)' }} />
              <div
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl shadow-[0_6px_18px_rgba(29,78,216,0.28)]"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}
              >
                <Monitor className="h-5 w-5 text-white" />
              </div>
              <h3 className="mt-4 text-[1.35rem] font-black leading-tight text-slate-900">High-Traffic Screen Advertising</h3>
              <p className="mt-2.5 text-sm leading-6 text-slate-500">
                Your brand displayed on digital screens in the busiest locations - malls,
                transport hubs, entertainment zones - for maximum visibility and recall.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {PLATFORM_TAGS.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-blue-50 border border-blue-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Inline stats */}
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                {[
                  { value: '4+', label: 'Screens' },
                  { value: '24/7', label: 'Live' },
                  { value: '₹99', label: 'From/Day' },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-[1.1rem] font-black text-blue-700">{s.value}</p>
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              {PLATFORM_SUPPORT_CARDS.map((item) => (
                <div key={item.title} className="relative overflow-hidden rounded-[22px] border border-slate-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
                  <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: item.gradient }} />
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl shadow-[0_6px_18px_rgba(29,78,216,0.22)]" style={{ background: item.gradient }}>
                    <item.icon className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="mt-3 text-[15px] font-bold leading-5 text-slate-900">{item.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-5 text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative hidden bg-white py-24 lg:block lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="max-w-2xl mb-14"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600 mb-4">01 — The Platform</p>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-[1.0]">
              What is{' '}
              <span style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>OLRAC?</span>
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-500 max-w-lg">
              A digital advertising platform that displays your brand on real-world screens
              in high-traffic locations — turning everyday spaces into powerful ad moments.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:grid-rows-2" style={{ perspective: '1200px' }}>
            {/* Hero card — left 2/3 spanning 2 rows */}
            <motion.div
              variants={tiltIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              className="lg:col-span-2 lg:row-span-2"
            >
              <TiltCard className="h-full">
                <div className="group relative h-full min-h-[280px] lg:min-h-[360px] overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.07)] flex flex-col p-9 lg:p-11">
                  {/* Subtle decorative gradient blob */}
                  <div className="pointer-events-none absolute -right-16 -top-16 h-[280px] w-[280px] rounded-full opacity-[0.07]"
                    style={{ background: 'radial-gradient(circle, #1d4ed8, transparent)' }} />

                  <div className="relative z-10 flex flex-col flex-1">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl mb-7"
                      style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
                      <Monitor className="h-5 w-5 text-white" />
                    </div>

                    <h3 className="text-3xl font-black text-slate-900 lg:text-4xl mb-4 leading-tight tracking-tight">
                      High-Traffic Screen<br />Advertising
                    </h3>
                    <p className="text-slate-500 leading-relaxed text-base max-w-md">
                      Your brand displayed on digital screens in the busiest locations — malls,
                      transport hubs, entertainment zones — for maximum visibility and recall.
                    </p>

                    <div className="flex-1" />

                    <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap gap-2">
                      {['Digital Signage', 'DOOH', 'Outdoor Advertising', 'Brand Recall'].map(tag => (
                        <span key={tag}
                          className="rounded-full bg-slate-50 border border-slate-200 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </TiltCard>
            </motion.div>

            {/* Top-right card */}
            <motion.div
              variants={tiltIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
            >
              <TiltCard className="h-full">
                <div className="group h-full min-h-[175px] rounded-[28px] border border-slate-100 bg-white p-7 shadow-[0_8px_32px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_56px_rgba(29,78,216,0.12)] hover:border-blue-100 transition-all overflow-hidden relative">
                  <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #1d4ed8, #2563eb)' }} />
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl shadow-[0_4px_14px_rgba(29,78,216,0.32)] mb-5"
                    style={{ background: 'linear-gradient(135deg, #1e40af, #1d4ed8)' }}>
                    <RadioTower className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-[1.05rem] font-bold text-slate-900 group-hover:text-blue-700 transition-colors mb-2">For Every Business</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Startups to established brands — every business size and budget welcome.
                  </p>
                </div>
              </TiltCard>
            </motion.div>

            {/* Bottom-right card */}
            <motion.div
              variants={tiltIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
            >
              <TiltCard className="h-full">
                <div className="group h-full min-h-[175px] rounded-[28px] border border-slate-100 bg-white p-7 shadow-[0_8px_32px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_56px_rgba(29,78,216,0.12)] hover:border-blue-100 transition-all overflow-hidden relative">
                  <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #1d4ed8, #3b82f6)' }} />
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl shadow-[0_4px_14px_rgba(29,78,216,0.28)] mb-5"
                    style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}>
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-[1.05rem] font-bold text-slate-900 group-hover:text-blue-700 transition-colors mb-2">Real Impact</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Affordable DOOH advertising that turns footfall into brand awareness.
                  </p>
                </div>
              </TiltCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── WHY BRANDS WIN — Video accordion ─────────────────── */}
      <section className="bg-white py-8 lg:hidden">
        <div className="mx-auto max-w-xl px-4">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-600">02 — Proof of Value</p>
          <h2 className="mt-3 text-3xl font-black leading-[1.02] tracking-tight text-slate-900">
            Why brands win{' '}
            <span style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              on OLRAC?
            </span>
          </h2>

          <div className="mt-6">
            <VibrantVideoCards
              card1={videoCards.card1}
              card2={videoCards.card2}
              card3={videoCards.card3}
            />
          </div>
        </div>
      </section>

      <motion.section
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className="relative hidden bg-white py-24 overflow-hidden lg:block lg:py-32"
      >
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <div className="mb-14">
            <motion.p variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600 mb-4">02 — Proof of Value</motion.p>
            <motion.h2 variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="text-5xl font-black tracking-tight text-slate-900 sm:text-6xl leading-[1.0]">
              Why brands win{' '}
              <span style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>on OLRAC?</span>
            </motion.h2>
          </div>

          <VibrantVideoCards
            card1={videoCards.card1}
            card2={videoCards.card2}
            card3={videoCards.card3}
          />
        </div>
      </motion.section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="bg-[#f8f8fb] py-10 lg:hidden">
        <div className="mx-auto max-w-xl px-4">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-blue-600">03 — How It Works</p>
          <h2 className="mt-3 text-[2rem] font-black leading-[1.02] tracking-tight text-slate-900">
            Launch in minutes,
            <span style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {' '}go live instantly.
            </span>
          </h2>
          <div className="relative mt-6 space-y-3">
            {/* Vertical connector — aligned to icon center (p-5=20px + icon w-12/2=24px → 44px, but with gap we offset) */}
            <div className="absolute left-[42px] top-10 bottom-10 w-[2px] rounded-full"
              style={{ background: 'linear-gradient(to bottom, #1d4ed8 0%, #3b82f6 60%, transparent 100%)' }} />

            {LAUNCH_STEPS.map((item) => (
              <div key={item.step} className="relative overflow-hidden rounded-[26px] border border-slate-100 bg-white p-5 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
                {/* Step number watermark */}
                <div className="pointer-events-none absolute right-4 top-3 text-[4.5rem] font-black leading-none text-slate-50 select-none tracking-tighter">
                  {item.step}
                </div>
                {/* Left accent bar */}
                <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full"
                  style={{ background: 'linear-gradient(to bottom, #1d4ed8, #3b82f6)' }} />
                <div className="relative flex items-start gap-4 pl-1">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-[0_6px_18px_rgba(29,78,216,0.25)]" style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}>
                    <item.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">{item.step}</p>
                    <h3 className="mt-1 text-base font-bold text-slate-900">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-slate-500">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700">
              <Zap className="h-4 w-4 text-blue-600" />
              Zero friction. Maximum impact.
            </div>
          </div>

          {/* Section CTA */}
          <button
            onClick={() => { track('cta_clicked', { cta: 'how_it_works_cta', page: 'landing' }); navigate('/booking') }}
            className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-full py-4 text-[14px] font-black text-white shadow-[0_8px_32px_rgba(29,78,216,0.4)] transition-all hover:shadow-[0_12px_40px_rgba(29,78,216,0.5)]"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}
          >
            <Sparkles className="h-4 w-4" />
            Start Your Campaign
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <motion.section
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className="relative hidden bg-[#f8f8fb] py-24 lg:block lg:py-32"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-16">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600 mb-4">03 — How It Works</p>
            <h2 className="text-5xl font-black tracking-tight text-slate-900 sm:text-6xl leading-[1.0]">
              Launch in minutes,{' '}
              <span style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>go live instantly.</span>
            </h2>
          </div>

          <div className="relative">
            {/* Connector line between steps */}
            <div className="hidden lg:block absolute top-[42px] left-[calc(12.5%+20px)] right-[calc(12.5%+20px)] h-[2px] z-0"
              style={{ background: 'linear-gradient(90deg, transparent, #1d4ed822, #1d4ed844, #1d4ed822, transparent)' }}
            />
            <motion.div
              variants={staggerContainerSlow}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              className="grid gap-4 lg:grid-cols-4 relative"
            >
              {LAUNCH_STEPS.map((item) => (
                <motion.div key={item.step} variants={cascadeItem} className="relative group">
                  <TiltCard className="h-full">
                    <div className="relative h-full min-h-[200px] rounded-[28px] border border-slate-100 bg-white p-8 shadow-[0_4px_24px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_56px_rgba(29,78,216,0.12)] hover:border-blue-100 transition-all overflow-hidden">
                      <div className="absolute -right-2 -top-2 text-[96px] font-black text-slate-50 select-none leading-none pointer-events-none tracking-tighter">
                        {item.step}
                      </div>
                      <div className="relative z-10">
                        <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl mb-6 shadow-[0_4px_16px_rgba(29,78,216,0.28)]"
                          style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}
                        >
                          <item.icon className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors mb-2.5">{item.title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  </TiltCard>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="mt-9"
          >
            <span className="inline-flex items-center gap-2.5 rounded-full border border-blue-200 bg-blue-50 px-6 py-3 text-sm font-bold text-blue-700">
              <Zap className="h-4 w-4 text-blue-600" />
              Zero friction. Maximum impact.
            </span>
          </motion.div>
        </div>
      </motion.section>

      {/* ── TRUSTED PARTNERS ─────────────────────────────────── */}
      <section className="overflow-hidden border-y border-slate-100 bg-white py-10 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mb-8 text-left lg:mb-12">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600 mb-4">04 — Trusted By</p>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-[1.0]">
              Brands that{' '}
              <span style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>trust us.</span>
            </h2>
          </div>

          <div className="relative mt-4">
            {loading || !brandImagesLoaded ? (
              <div className="flex gap-3 sm:gap-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 w-[160px] min-w-[160px] rounded-[22px] bg-slate-100 animate-pulse sm:h-32 sm:w-[220px] sm:min-w-[220px] sm:rounded-[24px]" />
                ))}
              </div>
            ) : brandMotionItems.length > 0 ? (
              <div
                ref={brandCarouselRef}
                className={`brand-carousel-scroll -mx-4 overflow-x-auto px-4 pb-3 select-none sm:mx-0 sm:px-0 sm:pb-4 ${isBrandCarouselDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onWheel={handleBrandCarouselWheel}
                onPointerDown={handleBrandCarouselPointerDown}
                onPointerMove={handleBrandCarouselPointerMove}
                onPointerUp={handleBrandCarouselPointerUp}
                onPointerCancel={handleBrandCarouselPointerUp}
                onScroll={normalizeBrandCarouselPosition}
              >
                <div className="flex w-max items-center gap-3 py-2 pr-3 sm:gap-6 sm:pr-5">
                  {brandMotionItems.map((item, index) => (
                    <div
                      key={`${item.id}-${index}`}
                      className="group relative w-[160px] min-w-[160px] flex-shrink-0 transition duration-300 hover:scale-[1.02] sm:w-[240px] sm:min-w-[240px]"
                    >
                      <div className="relative flex h-24 items-center justify-center rounded-[22px] border border-slate-100 bg-slate-50 p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all hover:border-blue-100 hover:shadow-[0_8px_30px_rgba(29,78,216,0.08)] sm:h-36 sm:rounded-[24px] sm:p-6">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={`${item.name} brand logo`}
                            loading="lazy"
                            className="max-h-full max-w-full object-contain mix-blend-multiply transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <ImageIcon className="h-10 w-10 text-slate-200" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-[28px] border border-slate-100 bg-slate-50 p-12 text-center">
                <ImageIcon className="mx-auto h-12 w-12 text-slate-200" />
                <h3 className="mt-4 text-lg font-bold text-slate-900">Partner logos coming soon</h3>
                <p className="mt-2 text-sm text-slate-400">We're onboarding brands — check back shortly.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────── */}
      <motion.section
        ref={ctaRef}
        id="contact"
        variants={blurReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        className="relative overflow-hidden py-20 pb-28 lg:py-28 lg:pb-36"
        style={{ background: 'linear-gradient(160deg, #020917 0%, #0c2461 30%, #0a1e5e 65%, #050508 100%)' }}
      >
        {/* Animated ambient blobs */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.18, 0.28, 0.18] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute left-[-20%] top-[-15%] h-[260px] w-[260px] rounded-full bg-blue-800 blur-[80px] lg:left-[-10%] lg:top-[-10%] lg:h-[500px] lg:w-[500px] lg:blur-[120px]"
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.1, 0.18, 0.1] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="pointer-events-none absolute right-[-16%] bottom-[-12%] h-[200px] w-[200px] rounded-full bg-blue-700 blur-[70px] lg:right-[-8%] lg:bottom-[-10%] lg:h-[400px] lg:w-[400px] lg:blur-[100px]"
        />
        <div className="pointer-events-none absolute left-[40%] top-[20%] h-[180px] w-[180px] rounded-full bg-blue-500/10 blur-[60px] lg:h-[300px] lg:w-[300px] lg:blur-[80px]" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <motion.p
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-blue-400 lg:mb-4 lg:text-[11px]"
          >
            Ready to Advertise?
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1 }}
            className="text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.0]"
          >
            Start your campaign,{' '}
            <span style={{
              background: 'linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              reach thousands.
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-5 max-w-xl text-[15px] leading-7 text-white/70 lg:mx-auto lg:mt-7 lg:text-lg"
          >
            Join hundreds of brands already growing their reach through OLRAC's premium screen network.
          </motion.p>

          {/* Mobile stat row */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-6 flex items-center justify-center gap-6 border-t border-white/[0.08] pt-5 lg:hidden"
          >
            {[
              { value: '4+', label: 'Live Screens' },
              { value: '24/7', label: 'On Air' },
              { value: '₹99', label: 'Starting/Day' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-[1.2rem] font-black text-white">{value}</p>
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-white/35">{label}</p>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-4 lg:mt-11"
          >
            <SonarButton
              variant="shimmer"
              onClick={() => { track('cta_clicked', { cta: 'cta_section_quote', page: 'landing' }); navigate('/booking') }}
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-blue-600 px-9 py-4 text-[15px] font-black text-white shadow-[0_0_48px_rgba(29,78,216,0.55)] transition-all hover:bg-blue-500 sm:w-auto"
            >
              <Sparkles className="h-4 w-4" />
              Instant Quotation
              <ArrowRight className="h-4 w-4" />
            </SonarButton>
            <motion.button
              variants={btnBounce} whileHover="hover" whileTap="tap"
              onClick={() => navigate('/locations')}
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-9 py-4 text-[15px] font-bold text-white/90 backdrop-blur-sm transition-all hover:border-white/30 hover:bg-white/16 sm:w-auto"
            >
              <MapPin className="h-4 w-4" />
              View Locations
            </motion.button>
            <a
              href={contactHref}
              target={whatsappNumber ? '_blank' : undefined}
              rel={whatsappNumber ? 'noopener noreferrer' : undefined}
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-9 py-4 text-[15px] font-bold text-emerald-300 backdrop-blur-sm transition hover:border-emerald-400/40 hover:bg-emerald-500/20 sm:w-auto"
            >
              <MessageCircle className="h-5 w-5" />
              WhatsApp Us
            </a>
          </motion.div>
        </div>
      </motion.section>


    </motion.div>
  )
}
