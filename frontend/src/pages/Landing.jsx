import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Image as ImageIcon,
  MessageCircle,
  Monitor,
  MoveRight,
  RadioTower,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import { usePublicSettings } from '../context/PublicSettingsContext'
import api from '../api/axios'
import IntroSplash from '../components/IntroSplash'

function BrandMotionCard({ item }) {
  return (
    <div className="group relative w-[220px] min-w-[220px] flex-shrink-0 transition duration-300 hover:scale-[1.015] sm:w-[270px] sm:min-w-[270px]">
      <div className="relative h-40 sm:h-48">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-contain mix-blend-multiply transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="h-12 w-12 text-slate-300" />
          </div>
        )}
      </div>
    </div>
  )
}

function VideoCard({ videos }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (videos && currentIndex >= videos.length) {
       setCurrentIndex(0)
    }
  }, [videos, currentIndex])

  const currentMedia = videos?.[currentIndex]
  const isVideo = currentMedia?.match(/\.(mp4|webm|mov|ogg)$/i)

  useEffect(() => {
    if (!isVideo && videos && videos.length > 1 && currentMedia) {
       const timer = setTimeout(() => {
          setCurrentIndex((p) => (p + 1) % videos.length)
       }, 5000)
       return () => clearTimeout(timer)
    }
  }, [currentIndex, isVideo, videos, currentMedia])

  if (!videos || videos.length === 0) {
    return (
      <div className="group relative overflow-hidden rounded-[32px] bg-[#111116] border border-white/5 shadow-xl h-[420px] flex items-center justify-center">
         <div className="text-slate-600 text-sm font-medium">Card Slot Available</div>
      </div>
    )
  }

  return (
    <div className="group relative overflow-hidden rounded-[32px] bg-[#111116] border border-white/5 shadow-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl h-[420px]">
      <div className="absolute inset-0 z-0">
         {isVideo ? (
           <video
             key={currentMedia}
             src={currentMedia}
             autoPlay
             muted
             playsInline
             loop={videos.length === 1}
             onEnded={() => setCurrentIndex((p) => (p + 1) % videos.length)}
             className="h-full w-full object-cover opacity-90 transition-opacity duration-500"
           />
         ) : (
           <img
             key={currentMedia}
             src={currentMedia}
             className="h-full w-full object-cover opacity-90 transition-opacity duration-500 animate-in fade-in zoom-in-95"
             alt="Card Media"
           />
         )}
      </div>

      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#111116] via-[#111116]/40 to-transparent pointer-events-none" />
      
      {videos.length > 1 && (
        <div className="absolute top-4 right-4 flex gap-1 z-20">
          {videos.map((_, i) => (
             <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-5 bg-white' : 'w-2 bg-white/30'}`} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Landing() {
  const { settings } = usePublicSettings()
  const navigate = useNavigate()
  const location = useLocation()
  const [brandImages, setBrandImages] = useState([])
  const [brandImagesLoaded, setBrandImagesLoaded] = useState(false)
  const [videoCards, setVideoCards] = useState({ card1: [], card2: [], card3: [] })
  const [loading, setLoading] = useState(true)
  const [isBrandCarouselDragging, setIsBrandCarouselDragging] = useState(false)
  const brandCarouselRef = useRef(null)
  const brandCarouselDragRef = useRef({ active: false, startX: 0, startScrollLeft: 0 })
  const brandCarouselPausedRef = useRef(false)
  const brandCarouselResumeTimeoutRef = useRef(null)
  const appName = settings.config.general_app_name || 'OLRAC Advertise'

  useEffect(() => {
    const fetchBrandImages = async () => {
      try {
        const res = await api.get('/settings/brand-images', {
          params: { t: Date.now() },
        })
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
        const res = await api.get('/settings/landing-videos', {
          params: { t: Date.now() },
        })
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
      const target = document.getElementById('contact')
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      navigate('/', { replace: true, state: {} })
    }
  }, [location.state, navigate])

  const brandMotionItems = useMemo(() => {
    const configuredImages = (brandImages || [])
      .filter(Boolean)
      .map((imageUrl, index) => ({
        id: `brand-${index}`,
        name: appName,
        area: 'Brand Showcase',
        image_url: imageUrl,
      }))

    if (configuredImages.length === 0) return []

    const baseItems = [...configuredImages]
    while (baseItems.length < 8) {
      baseItems.push(...configuredImages.map((item, index) => ({
        ...item,
        id: `${item.id}-repeat-${index}-${baseItems.length}`,
      })))
    }

    return [...baseItems, ...baseItems]
  }, [appName, brandImages])

  const whatsappNumber = String(
    settings.whatsapp_number || settings.config.general_contact_phone || ''
  ).replace(/[^\d]/g, '')

  const pauseBrandCarousel = () => {
    brandCarouselPausedRef.current = true

    if (brandCarouselResumeTimeoutRef.current) {
      clearTimeout(brandCarouselResumeTimeoutRef.current)
      brandCarouselResumeTimeoutRef.current = null
    }
  }

  const resumeBrandCarouselLater = (delay = 1400) => {
    if (brandCarouselResumeTimeoutRef.current) {
      clearTimeout(brandCarouselResumeTimeoutRef.current)
    }

    brandCarouselResumeTimeoutRef.current = setTimeout(() => {
      brandCarouselPausedRef.current = false
      brandCarouselResumeTimeoutRef.current = null
    }, delay)
  }

  const normalizeBrandCarouselPosition = () => {
    const container = brandCarouselRef.current

    if (!container) return

    const loopWidth = container.scrollWidth / 2
    if (!loopWidth) return

    if (container.scrollLeft >= loopWidth) {
      container.scrollLeft -= loopWidth
    }
  }

  const handleBrandCarouselWheel = (event) => {
    const container = brandCarouselRef.current
    if (!container) return

    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    if (!delta) return

    event.preventDefault()
    pauseBrandCarousel()
    container.scrollLeft += delta
    normalizeBrandCarouselPosition()
    resumeBrandCarouselLater()
  }

  const handleBrandCarouselPointerDown = (event) => {
    const container = brandCarouselRef.current
    if (!container) return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    pauseBrandCarousel()
    setIsBrandCarouselDragging(true)
    brandCarouselDragRef.current = {
      active: true,
      startX: event.clientX,
      startScrollLeft: container.scrollLeft,
    }

    container.setPointerCapture?.(event.pointerId)
  }

  const handleBrandCarouselPointerMove = (event) => {
    const container = brandCarouselRef.current
    const dragState = brandCarouselDragRef.current

    if (!container || !dragState.active) return

    event.preventDefault()
    container.scrollLeft = dragState.startScrollLeft - (event.clientX - dragState.startX)
    normalizeBrandCarouselPosition()
  }

  const handleBrandCarouselPointerUp = (event) => {
    const container = brandCarouselRef.current

    if (container && brandCarouselDragRef.current.active) {
      container.releasePointerCapture?.(event.pointerId)
    }

    brandCarouselDragRef.current.active = false
    setIsBrandCarouselDragging(false)
    resumeBrandCarouselLater()
  }

  const contactHref = whatsappNumber
    ? `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent('Hi, I want to advertise with OLRAC.')}`
    : '#contact'

  useEffect(() => {
    if (!brandMotionItems.length) return undefined

    let animationFrameId
    let previousTimestamp

    const step = (timestamp) => {
      if (previousTimestamp == null) {
        previousTimestamp = timestamp
      }

      const elapsed = timestamp - previousTimestamp
      previousTimestamp = timestamp

      const container = brandCarouselRef.current
      if (container && !brandCarouselPausedRef.current && !brandCarouselDragRef.current.active) {
        const pxPerSecond = window.innerWidth < 640 ? 38 : 56
        container.scrollLeft += (pxPerSecond * elapsed) / 1000
        normalizeBrandCarouselPosition()
      }

      animationFrameId = window.requestAnimationFrame(step)
    }

    animationFrameId = window.requestAnimationFrame(step)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [brandMotionItems.length])

  useEffect(() => {
    return () => {
      if (brandCarouselResumeTimeoutRef.current) {
        clearTimeout(brandCarouselResumeTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(196,181,253,0.28),transparent_18%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_20%),linear-gradient(180deg,#f4efff_0%,#efe7ff_38%,#f4efff_100%)]">
      <IntroSplash companyName={appName} />
      <section className="relative overflow-hidden border-b border-slate-800 bg-slate-900">
        <div className="absolute inset-0 z-0">
          <img 
            src="/hero.jpeg" 
            alt="Hero Background" 
            className="h-full w-full object-cover object-center"
          />
        </div>
        <div className="absolute inset-0 z-0 opacity-30">
          <div className="absolute left-[15%] top-[24%] h-2 w-2 rounded-full bg-white animate-pulse" />
          <div className="absolute left-[58%] top-[18%] h-2.5 w-2.5 rounded-full bg-white/80 animate-ping" />
          <div className="absolute right-[18%] top-[42%] h-2 w-2 rounded-full bg-indigo-200 animate-pulse" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-yellow-300" />
                {appName}
              </div>

              <h1 className="mt-6 text-4xl font-black leading-[0.96] text-white sm:text-5xl lg:text-7xl">
                Amplify Your
                <span className="block">Brand in Motion</span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-white/80 sm:text-lg">
                Digital advertising across premium high-traffic screens.
                From startups to enterprises — reach the right audience, instantly.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {['Digital Advertising', 'Emerging Platform', 'Smart Targeting'].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap">
                <button
                  onClick={() => navigate('/booking')}
                  className="inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-base font-black text-primary-700 shadow-[0_20px_50px_rgba(15,23,42,0.24)] transition hover:-translate-y-0.5 hover:bg-slate-50"
                >
                  <Sparkles className="h-5 w-5" />
                  Instant Quotation
                </button>
                <button
                  onClick={() => navigate('/locations')}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-primary-700 shadow-xl transition hover:bg-slate-50"
                >
                  Start Advertising
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate('/locations')}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
                >
                  View Locations
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="mx-auto max-w-md rounded-[34px] border border-white/15 bg-white/10 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.24)] backdrop-blur-xl">
                <div className="rounded-[28px] border border-white/10 bg-slate-950/15 p-4">
                  <div className="rounded-[24px] bg-white/95 p-4 shadow-inner">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Live Network</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">Premium Screens</p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
                        <Monitor className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {[
                        ['Digital Reach', 'High-traffic premium locations'],
                        ['Audience Match', 'Smarter targeting, stronger recall'],
                        ['Ad Launch', 'Fast booking with low friction'],
                      ].map(([title, desc]) => (
                        <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-sm font-bold text-slate-900">{title}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -left-6 -top-6 hidden rounded-2xl bg-white px-4 py-3 shadow-xl lg:block">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Starting Price</p>
                <p className="mt-2 text-2xl font-black text-slate-900">Rs 99/day</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="font-['Sora',sans-serif] text-4xl font-extrabold tracking-tight text-primary-600 sm:text-5xl lg:text-6xl">
              What is Olrac
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-700">
              OLRAC is a digital advertising platform that helps brands display ads on real-world screens placed in high-traffic, crowded locations.
            </p>
            <p className="mt-4 text-base leading-8 text-slate-600">
              We make it easy for businesses to reach people where attention is highest — turning everyday spaces into powerful advertising opportunities.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {[
              {
                icon: Monitor,
                title: 'High-Traffic, Crowded Locations',
                desc: 'Digital screen advertising in high-footfall locations for maximum brand visibility.',
              },
              {
                icon: RadioTower,
                title: 'For Every Business',
                desc: 'Supporting businesses of all sizes, from startups to established brands.',
              },
              {
                icon: Target,
                title: 'Real Visibility. Real Impact.',
                desc: 'Affordable DOOH advertising helping brands reach more customers effectively.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[28px] border border-primary-100 bg-[linear-gradient(135deg,#f5f3ff_0%,#eef2ff_100%)] p-7 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-xl font-black text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f8fafc] py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <h2 className="font-['Sora',sans-serif] text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Why brands win on OLRAC
            </h2>
          </div>
          
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <VideoCard videos={videoCards.card1} />
            <VideoCard videos={videoCards.card2} />
            <VideoCard videos={videoCards.card3} />
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-['Sora',sans-serif] text-4xl font-extrabold tracking-tight text-primary-600 sm:text-5xl lg:text-6xl">
              How We Work
            </h2>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-4">
            {[
              'Get Instant Quotation',
              'Book Your Slot',
              'Share Your Content',
              'We Display Your Ad',
            ].map((step, index) => (
              <div key={step} className="relative rounded-[28px] border border-primary-100 bg-[linear-gradient(135deg,#f5f3ff_0%,#eef2ff_100%)] p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-lg font-black text-white">
                    {index + 1}
                  </div>
                  {index < 3 ? <MoveRight className="hidden h-5 w-5 text-slate-300 lg:block" /> : null}
                </div>
                <h3 className="mt-5 text-lg font-black text-slate-900">{step}</h3>
              </div>
            ))}
          </div>

          <div className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-primary-50 px-5 py-3 text-sm font-semibold text-primary-700">
            <CheckCircle2 className="h-4 w-4" />
            Simple. Fast. Effective.
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[#f8fafc] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-['Sora',sans-serif] text-4xl font-extrabold tracking-tight text-primary-600 sm:text-5xl lg:text-6xl">
              Our Clients
            </h2>
          </div>

          <div className="relative mt-10">
            {loading || !brandImagesLoaded ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-[300px] rounded-[28px] bg-white animate-pulse shadow-sm" />
                ))}
              </div>
            ) : brandMotionItems.length > 0 ? (
              <div
                ref={brandCarouselRef}
                className={`brand-carousel-scroll overflow-x-auto pb-4 select-none ${
                  isBrandCarouselDragging ? 'cursor-grabbing' : 'cursor-grab'
                }`}
                onWheel={handleBrandCarouselWheel}
                onPointerDown={handleBrandCarouselPointerDown}
                onPointerMove={handleBrandCarouselPointerMove}
                onPointerUp={handleBrandCarouselPointerUp}
                onPointerCancel={handleBrandCarouselPointerUp}
                onScroll={normalizeBrandCarouselPosition}
              >
                <div className="flex w-max items-center gap-5 py-2 pr-5 sm:gap-6">
                  {brandMotionItems.map((item, index) => (
                    <BrandMotionCard key={`${item.id}-${index}`} item={item} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-[28px] border border-slate-200 bg-white p-12 text-center shadow-sm">
                <ImageIcon className="mx-auto h-14 w-14 text-slate-300" />
                <h3 className="mt-4 text-xl font-black text-slate-900">No brand visuals available yet</h3>
                <p className="mt-2 text-sm text-slate-500">Upload homepage brand images from admin settings and they will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-transparent py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-[32px] border border-white/40 bg-[linear-gradient(135deg,rgba(124,58,237,0.96)_0%,rgba(109,40,217,0.96)_42%,rgba(67,56,202,0.94)_100%)] px-8 py-12 text-center shadow-[0_24px_70px_rgba(109,40,217,0.18)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/70">Ready to Advertise?</p>
            <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">
              Start your campaign today and get your brand in front of thousands.
            </h2>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => navigate('/locations')}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-7 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-black"
              >
                Start Advertising
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href={contactHref}
                target={whatsappNumber ? '_blank' : undefined}
                rel={whatsappNumber ? 'noopener noreferrer' : undefined}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
