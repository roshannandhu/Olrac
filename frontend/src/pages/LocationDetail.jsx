import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AnimatePresence, motion } from 'framer-motion'
import { pageTransition, staggerContainer, staggerItem } from '../utils/animations'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  MapPin,
  Monitor,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'
import api from '../api/axios'
import { track } from '../utils/analytics'

const EASE_OUT = [0.0, 0.0, 0.2, 1.0]
const HERO_FALLBACK_DESCRIPTION = 'Premium advertising inventory positioned in a high-attention area for long-duration brand visibility and stronger brand recall.'
const GLASS_PANEL_STYLE = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.07)',
  backdropFilter: 'blur(14px)',
}
const QUOTE_PANEL_STYLE = {
  background: 'rgba(124,58,237,0.06)',
  border: '1px solid rgba(124,58,237,0.1)',
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString('en-IN')
}

function orderGalleryMedia(items, galleryOrder) {
  const orderMap = new Map((Array.isArray(galleryOrder) ? galleryOrder : []).map((id, index) => [id, index]))
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftOrder = orderMap.get(left.item.url)
      const rightOrder = orderMap.get(right.item.url)
      if (leftOrder === undefined && rightOrder === undefined) return left.index - right.index
      if (leftOrder === undefined) return 1
      if (rightOrder === undefined) return -1
      return leftOrder - rightOrder
    })
    .map(({ item }) => item)
}

function buildScreenGalleryMedia(screen) {
  if (!screen) return []

  const items = []

  if (screen.image_url) {
    items.push({
      type: 'image',
      url: screen.image_url,
      poster: screen.image_url,
    })
  }

  if (screen.promo_video_url) {
    items.push({
      type: 'video',
      url: screen.promo_video_url,
      poster: screen.image_url || screen.additional_images?.[0] || '',
    })
  }

  for (const image of screen.additional_images || []) {
    if (!image) continue
    items.push({
      type: 'image',
      url: image,
      poster: image,
    })
  }

  return orderGalleryMedia(items, screen.gallery_order)
}

function PriceDisplay({
  value,
  unit,
  className = '',
  iconClassName = 'h-5 w-5',
  unitClassName = 'text-xs font-semibold capitalize text-slate-400',
}) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <IndianRupee className={`${iconClassName} shrink-0`} />
      <span>{formatPrice(value)}</span>
      {unit ? <span className={unitClassName}>/ {unit}</span> : null}
    </div>
  )
}

function QuotePanel({ screen, price, available, onQuoteClick, onBrowseLocations, compact = false }) {
  const quoteFacts = [
    {
      icon: Zap,
      label: 'Slot Capacity',
      value: `${screen.total_slots || 0} Slots`,
    },
    screen.footfall
      ? { icon: Users, label: 'Daily Footfall', value: `${screen.footfall} Reach` }
      : { icon: CheckCircle2, label: 'Availability', value: available > 0 ? `${available} slots open` : 'Fully booked' },
  ]

  return (
    <div className={`overflow-hidden rounded-[28px] border border-slate-200 bg-white ${compact ? 'shadow-[0_18px_44px_rgba(15,23,42,0.12)]' : 'shadow-[0_8px_40px_rgba(0,0,0,0.08)]'}`}>
      <div className={compact ? 'px-5 py-5 sm:px-6 sm:py-6' : 'px-6 py-6'} style={{ background: 'linear-gradient(135deg, #2e0061, #4c1d95, #312e81)' }}>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-violet-300/70">Instant Quotation</p>
        <h2 className={`${compact ? 'text-[1.35rem] sm:text-[1.55rem]' : 'text-2xl'} font-black leading-tight text-white`}>
          {screen.name}
        </h2>
        <div className="mt-3 flex items-center gap-1.5 text-sm text-white/60">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{screen.area}</span>
        </div>
      </div>

      <div className={compact ? 'space-y-3 p-4 sm:p-5' : 'space-y-4 p-6'}>
        <div
          className={`rounded-2xl p-4 ${compact ? 'space-y-3' : 'flex items-center justify-between gap-3'}`}
          style={QUOTE_PANEL_STYLE}
        >
          <div className={compact ? 'flex items-start justify-between gap-3' : ''}>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600">Base Rate Info</p>
              <p className="text-sm font-bold capitalize text-slate-700">per {screen.price_unit || 'day'}</p>
            </div>
            <PriceDisplay
              value={price}
              className={`${compact ? 'text-[1.45rem]' : 'text-2xl'} font-black text-violet-700`}
              iconClassName={compact ? 'h-6 w-6' : 'h-6 w-6'}
            />
          </div>
          {compact ? (
            <p className="text-xs leading-5 text-slate-500">
              Bundle this screen with other locations during checkout if you want a wider campaign.
            </p>
          ) : null}
        </div>

        <div className={compact ? 'grid grid-cols-1 gap-2 sm:grid-cols-2' : 'space-y-2'}>
          {quoteFacts.map((fact) => (
            <div
              key={fact.label}
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <fact.icon className="h-4 w-4 shrink-0 text-violet-500" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{fact.label}</p>
                <p className="truncate text-sm font-semibold text-slate-900">{fact.value}</p>
              </div>
            </div>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={onQuoteClick}
          className={`flex w-full items-center justify-center gap-2.5 rounded-2xl font-bold text-white transition-all ${compact ? 'py-3.5 text-sm sm:text-[15px]' : 'py-4 text-[15px]'}`}
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 8px 24px rgba(124,58,237,0.35)' }}
        >
          <Sparkles className="h-4 w-4" />
          Get Instant Quote
          <ChevronRight className="h-4 w-4" />
        </motion.button>

        {!compact ? (
          <button
            type="button"
            onClick={onBrowseLocations}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Browse All Locations
          </button>
        ) : null}
      </div>
    </div>
  )
}

function GalleryPanel({ screenName, mediaItems, selectedMediaUrl, onSelectMedia }) {
  const activeMedia = mediaItems.find((item) => item.url === selectedMediaUrl) || mediaItems[0] || null
  const hasRail = mediaItems.length > 1
  const activeIdx = mediaItems.findIndex((item) => item.url === (activeMedia?.url || ''))
  const touchStartX = useRef(null)

  const goPrev = () => {
    if (!hasRail) return
    onSelectMedia(mediaItems[(activeIdx - 1 + mediaItems.length) % mediaItems.length].url)
  }

  const goNext = () => {
    if (!hasRail) return
    onSelectMedia(mediaItems[(activeIdx + 1) % mediaItems.length].url)
  }

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const delta = touchStartX.current - e.changedTouches[0].clientX
    touchStartX.current = null
    if (Math.abs(delta) < 40) return
    if (delta > 0) goNext()
    else goPrev()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.12 }}
      className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]"
    >
      <div className={hasRail ? 'grid grid-cols-1 lg:grid-cols-[1fr_140px]' : ''}>
        <div
          className="group relative overflow-hidden bg-slate-100"
          onTouchStart={hasRail ? handleTouchStart : undefined}
          onTouchEnd={hasRail ? handleTouchEnd : undefined}
        >
          <div className="aspect-[5/4] sm:aspect-[16/10]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeMedia?.url || 'empty-gallery'}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="h-full w-full"
              >
                {activeMedia?.type === 'video' ? (
                  <video
                    src={activeMedia.url}
                    poster={activeMedia.poster || undefined}
                    controls
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover bg-slate-950"
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : activeMedia?.url ? (
                  <img src={activeMedia.url} alt={screenName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Monitor className="h-16 w-16 text-slate-200" />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {hasRail && (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50 lg:opacity-0 lg:group-hover:opacity-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50 lg:opacity-0 lg:group-hover:opacity-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5">
                {mediaItems.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSelectMedia(mediaItems[i].url)}
                    className={`rounded-full transition-all duration-200 ${
                      i === activeIdx
                        ? 'w-4 h-1.5 bg-white'
                        : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {hasRail ? (
          <>
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 lg:hidden">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-500">Swipe Gallery</p>
                  <p className="mt-1 text-xs text-slate-500">Swipe through images and play the screen video directly in the main gallery.</p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-500">
                  {mediaItems.length} items
                </span>
              </div>

              <div className="locations-mobile-scroll -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 pt-1">
                {mediaItems.map((item, index) => (
                  <button
                    key={`${item.type}-${item.url}-${index}`}
                    type="button"
                    onClick={() => onSelectMedia(item.url)}
                    className={`relative aspect-[4/5] w-[5.75rem] shrink-0 snap-start overflow-hidden rounded-2xl border-2 transition-all ${activeMedia?.url === item.url
                      ? 'border-violet-500 shadow-[0_0_0_3px_rgba(124,58,237,0.12)]'
                      : 'border-transparent bg-white hover:border-slate-200'
                      }`}
                  >
                    {item.type === 'video' ? (
                      <>
                        {item.poster ? (
                          <img src={item.poster} alt={`${screenName} video`} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-950">
                            <PlayCircle className="h-8 w-8 text-white/85" />
                          </div>
                        )}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/15 to-transparent" />
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/18 text-white backdrop-blur-sm">
                            <PlayCircle className="h-5 w-5" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <img src={item.url} alt={`View ${index + 1}`} className="h-full w-full object-cover" />
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 to-transparent px-2 pb-2 pt-4 text-left">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90">
                        {item.type === 'video' ? 'Video' : `View ${index + 1}`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden border-t border-slate-100 bg-slate-50 p-4 lg:block lg:border-l lg:border-t-0">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Gallery</p>
              <div className="grid grid-cols-2 gap-2">
                {mediaItems.map((item, index) => (
                  <button
                    key={`${item.type}-${item.url}-${index}`}
                    type="button"
                    onClick={() => onSelectMedia(item.url)}
                    className={`relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${activeMedia?.url === item.url
                      ? 'border-violet-500 shadow-[0_0_0_3px_rgba(124,58,237,0.12)]'
                      : 'border-transparent hover:border-slate-200'
                      }`}
                  >
                    {item.type === 'video' ? (
                      <>
                        {item.poster ? (
                          <img src={item.poster} alt={`${screenName} video`} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-950">
                            <PlayCircle className="h-8 w-8 text-white/85" />
                          </div>
                        )}
                        <div className="pointer-events-none absolute inset-0 bg-slate-950/30" />
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/18 text-white backdrop-blur-sm">
                            <PlayCircle className="h-5 w-5" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <img src={item.url} alt={`View ${index + 1}`} className="h-full w-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </motion.div>
  )
}

function TrustNote() {
  return (
    <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}
        >
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">One form. Multiple screens.</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Use the quotation flow to bundle multiple locations into a single campaign request.
          </p>
        </div>
      </div>
    </div>
  )
}

function MobileQuoteBar({ screen, price, onQuoteClick }) {
  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 360, damping: 30 }}
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 lg:hidden"
      style={{ background: 'linear-gradient(to top, rgba(248,248,251,1) 70%, rgba(248,248,251,0))' }}
    >
      <div className="rounded-[22px] border border-violet-200 bg-white px-4 py-4 shadow-[0_-6px_32px_rgba(124,58,237,0.16)]">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">Ready To Quote</p>
            <p className="mt-0.5 truncate text-sm font-black text-slate-900">{screen.name}</p>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-violet-400" />
              <span className="truncate">{screen.area}</span>
            </div>
          </div>
          <PriceDisplay
            value={price}
            unit={screen.price_unit || 'day'}
            className="shrink-0 text-sm font-black text-violet-700"
            iconClassName="h-4 w-4"
            unitClassName="text-[10px] font-semibold capitalize text-slate-400"
          />
        </div>

        <button
          type="button"
          onClick={onQuoteClick}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-[18px] py-3.5 text-sm font-black text-white shadow-[0_6px_20px_rgba(124,58,237,0.38)] transition active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}
        >
          <Sparkles className="h-4 w-4" />
          Get Instant Quote
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  )
}

export default function LocationDetail() {
  const { screenId } = useParams()
  const navigate = useNavigate()
  const [screen, setScreen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedMediaUrl, setSelectedMediaUrl] = useState('')

  useEffect(() => {
    api.get(`/screens/${screenId}`)
      .then((res) => {
        setScreen(res.data)
      })
      .catch(() => {
        toast.error('Location not found')
        navigate('/locations')
      })
      .finally(() => setLoading(false))
  }, [screenId, navigate])

  const galleryMedia = useMemo(() => {
    return buildScreenGalleryMedia(screen)
  }, [screen])

  useEffect(() => {
    if (galleryMedia.length === 0) {
      setSelectedMediaUrl('')
      return
    }

    if (!galleryMedia.some((item) => item.url === selectedMediaUrl)) {
      setSelectedMediaUrl(galleryMedia[0].url)
    }
  }, [galleryMedia, selectedMediaUrl])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f8fb]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-600/30 border-t-violet-600" />
          <p className="text-sm font-medium text-slate-400">Loading location...</p>
        </div>
      </div>
    )
  }

  if (!screen) return null

  const selectedPlanPrice = Number(screen.base_price || 0)
  const totalSlots = screen.total_slots || 0
  const bookedSlots = screen.booked_slots || 0
  const available = Math.max(0, totalSlots - bookedSlots)
  const heroDescription = screen.description || HERO_FALLBACK_DESCRIPTION

  const heroStats = [
    {
      label: 'Capacity',
      value: totalSlots,
      sub: 'slots',
      icon: Zap,
    },
    screen.footfall
      ? { label: 'Footfall', value: screen.footfall, sub: 'daily', icon: Users }
      : { label: 'Open', value: available, sub: 'slots', icon: CheckCircle2 },
    {
      label: 'Base Rate',
      value: formatPrice(selectedPlanPrice),
      sub: `per ${screen.price_unit || 'day'}`,
      icon: IndianRupee,
    },
  ]

  const desktopHeroStats = [
    { label: 'Total Capacity', value: totalSlots, sub: 'slots' },
    screen.footfall
      ? { label: 'Daily Footfall', value: screen.footfall, sub: 'reach' }
      : { label: 'Open Slots', value: available, sub: 'available' },
    { label: 'Base Rate', value: formatPrice(selectedPlanPrice), sub: `per ${screen.price_unit || 'day'}` },
  ]

  const quickFacts = [
    {
      icon: MapPin,
      label: 'Location',
      value: screen.area,
      gradient: 'linear-gradient(135deg, #7c3aed, #6366f1)',
    },
    screen.footfall
      ? { icon: Users, label: 'Daily Footfall', value: `${screen.footfall} reach`, gradient: 'linear-gradient(135deg, #7c3aed, #8b5cf6)' }
      : { icon: CheckCircle2, label: 'Availability', value: available > 0 ? `${available} slots open` : 'Fully booked', gradient: 'linear-gradient(135deg, #10b981, #14b8a6)' },
    {
      icon: Zap,
      label: 'Slot Capacity',
      value: `${totalSlots} slots`,
      gradient: 'linear-gradient(135deg, #4f46e5, #2563eb)',
    },
  ]

  const handleBrowseLocations = () => navigate('/locations')
  const handleQuoteClick = () => {
    track('book_now_clicked', { screen_id: screen.id, screen_name: screen.name, area: screen.area })
    navigate(`/booking?locations=${screen.id}`)
  }

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-[#f8f8fb]"
    >
      <section className="relative overflow-hidden bg-[#050508]">
        {screen.image_url ? (
          <motion.img
            initial={{ scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.4, ease: EASE_OUT }}
            src={screen.image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-45 sm:opacity-35 lg:opacity-25"
          />
        ) : null}

        <div
          className="absolute inset-0 sm:hidden"
          style={{ background: 'linear-gradient(to bottom, rgba(5,5,8,0.14) 0%, rgba(5,5,8,0.32) 46%, rgba(5,5,8,0.72) 100%)' }}
        />
        <div
          className="absolute inset-0 hidden sm:block"
          style={{ background: 'linear-gradient(to bottom, rgba(5,5,8,0.38) 0%, rgba(5,5,8,0.58) 58%, #050508 100%)' }}
        />
        <div className="pointer-events-none absolute right-[-5%] top-[-15%] h-[360px] w-[360px] rounded-full bg-violet-700/10 blur-[120px] sm:h-[400px] sm:w-[400px]" />
        <div className="pointer-events-none absolute bottom-0 left-[-5%] h-[240px] w-[240px] rounded-full bg-indigo-600/8 blur-[100px] sm:h-[300px] sm:w-[300px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-9 pt-5 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8">
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            whileHover={{ x: -3 }}
            onClick={handleBrowseLocations}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3.5 py-2 text-xs font-semibold text-white/75 backdrop-blur-sm transition hover:border-white/25 hover:text-white sm:px-4 sm:text-sm"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Locations
          </motion.button>

          <div className="mt-5 grid grid-cols-1 gap-6 lg:mt-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-10">
            <div>
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/12 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300 sm:mb-5 sm:px-3.5 sm:text-[11px]"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Slot Capacity: {totalSlots}
              </motion.div>

              <div className="overflow-hidden">
                <motion.h1
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.15 }}
                  className="text-[2rem] font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[3.2rem]"
                >
                  {screen.name}
                </motion.h1>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-white/70 sm:mt-4 sm:gap-x-5 sm:text-sm"
              >
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-violet-300" />
                  {screen.area}
                </span>
                {screen.footfall ? (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-violet-300" />
                    {screen.footfall} daily footfall
                  </span>
                ) : null}
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.45 }}
                className="mt-4 max-w-xl line-clamp-3 text-sm leading-6 text-white/70 sm:mt-5 sm:line-clamp-none sm:text-[15px] sm:leading-7"
              >
                {heroDescription}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="mt-5 grid grid-cols-3 gap-2 sm:hidden"
              >
                {heroStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/10 bg-white/8 px-3 py-3 text-white backdrop-blur-sm"
                  >
                    <stat.icon className="h-4 w-4 text-violet-300" />
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">{stat.label}</p>
                    <p className="mt-1 text-base font-black leading-none text-white">{stat.value}</p>
                    <p className="mt-1 text-[11px] text-white/50">{stat.sub}</p>
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="hidden gap-3 lg:grid lg:grid-cols-2"
            >
              {desktopHeroStats.map((stat) => (
                <motion.div
                  variants={staggerItem}
                  key={stat.label}
                  className="rounded-2xl p-5"
                  style={GLASS_PANEL_STYLE}
                >
                  <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-white/35">{stat.label}</p>
                  <p className="text-4xl font-black text-white">{stat.value}</p>
                  <p className="mt-1 text-[11px] text-white/35">{stat.sub}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-5 pb-32 sm:px-6 sm:py-10 sm:pb-36 lg:pb-10 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:gap-8">
          <div className="space-y-4 sm:space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="hidden sm:block xl:hidden"
            >
              <QuotePanel
                screen={screen}
                price={selectedPlanPrice}
                available={available}
                onQuoteClick={handleQuoteClick}
                onBrowseLocations={handleBrowseLocations}
                compact
              />
            </motion.div>

            <GalleryPanel
              screenName={screen.name}
              mediaItems={galleryMedia}
              selectedMediaUrl={selectedMediaUrl}
              onSelectMedia={setSelectedMediaUrl}
            />

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.18 }}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {quickFacts.map((fact) => (
                <div
                  key={fact.label}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ background: fact.gradient }}
                  >
                    <fact.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{fact.label}</p>
                    <p className="mt-0.5 truncate text-sm font-bold text-slate-900">{fact.value}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.24 }}
              className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)] sm:p-6"
            >
              <div className="mb-4 sm:mb-5">
                <h2 className="text-base font-black text-slate-900 sm:text-lg">Base Ad Space Rate</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Duration packages and total custom estimates are available during checkout.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="relative overflow-hidden rounded-2xl border border-violet-400 p-4 shadow-[0_0_0_3px_rgba(124,58,237,0.1)] sm:p-5">
                  <motion.div
                    layoutId="billingActive"
                    className="absolute inset-0 rounded-2xl"
                    style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.07), rgba(99,102,241,0.05))' }}
                  />
                  <div className="relative z-10">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600">
                      Starting Base Rate
                    </p>
                    <PriceDisplay
                      value={selectedPlanPrice}
                      className="mt-2 text-[1.45rem] font-black leading-none text-violet-700"
                      iconClassName="h-5 w-5"
                    />
                    <p className="mt-1.5 text-[11px] capitalize text-slate-400">per {screen.price_unit || 'day'}</p>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Need a longer campaign? Final estimates can be tailored during checkout.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="xl:hidden"
            >
              <TrustNote />
            </motion.div>
          </div>

          <div className="hidden space-y-4 xl:sticky xl:top-[88px] xl:block">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <QuotePanel
                screen={screen}
                price={selectedPlanPrice}
                available={available}
                onQuoteClick={handleQuoteClick}
                onBrowseLocations={handleBrowseLocations}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <TrustNote />
            </motion.div>
          </div>
        </div>
      </section>

      <MobileQuoteBar
        screen={screen}
        price={selectedPlanPrice}
        onQuoteClick={handleQuoteClick}
      />
    </motion.div>
  )
}
