import { useMemo, useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { motion, AnimatePresence } from 'framer-motion'
import { pageTransition, staggerContainer, cascadeItem } from '../utils/animations'
import {
  MapPin, Monitor, Search, IndianRupee, Users, ArrowRight, X, CheckCircle2,
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { track } from '../utils/analytics'

const EASE_OUT = [0.0, 0.0, 0.2, 1.0]

// â”€â”€ Custom violet SVG marker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function makeMarker(color = '#2563eb', size = 30, ring = 'rgba(37,99,235,0.18)') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 1.4}" viewBox="0 0 28 38">
      <defs>
        <filter id="pin-shadow" x="-80%" y="-80%" width="260%" height="260%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="rgba(15,23,42,0.28)"/>
        </filter>
      </defs>
      <circle cx="14" cy="14" r="11.5" fill="${ring}" />
      <path filter="url(#pin-shadow)" d="M14 1C7.37 1 2 6.37 2 13c0 8 12 21 12 21s12-13 12-21C26 6.37 20.63 1 14 1z" fill="${color}" stroke="white" stroke-width="1.7"/>
      <circle cx="14" cy="13" r="5.2" fill="white"/>
      <circle cx="14" cy="13" r="2.2" fill="${color}"/>
    </svg>
  `.trim()
  return new L.DivIcon({
    html: svg, className: '', iconSize: [size, size * 1.4],
    iconAnchor: [size / 2, size * 1.4], popupAnchor: [0, -(size * 1.4)],
  })
}
const baseMarker = makeMarker('#2563eb', 30, 'rgba(37,99,235,0.18)')
const highlightMarker = makeMarker('#0ea5e9', 34, 'rgba(14,165,233,0.22)')

function MapFocus({ location, bounds, focusVersion }) {
  const map = useMap()
  useEffect(() => {
    if (bounds && bounds.length > 0 && !location) {
      map.fitBounds(bounds, { padding: [40, 40] })
      return
    }
    if (!location?.hasCoords) return
    map.setView([location.lat, location.lng], 15, { animate: true })
  }, [location, bounds, map, focusVersion])
  return null
}

// â”€â”€ Premium Screen Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ScreenCard({ screen, isActive, isHovered, onFocus, onView, onMouseEnter, onMouseLeave, cardRef, index }) {
  const price = Number(screen.base_price || 0)

  return (
    <motion.div
      variants={cascadeItem}
      ref={cardRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onFocus}
      layout
      className={`group relative overflow-hidden rounded-[22px] cursor-pointer transition-all duration-300 bg-white ${isActive || isHovered
          ? 'ring-2 ring-violet-500 shadow-[0_16px_48px_rgba(124,58,237,0.22)] -translate-y-1'
          : 'border border-slate-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)]'
        }`}
    >
      {/* Left accent border on active */}
      {(isActive || isHovered) && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[22px] z-10"
          style={{ background: 'linear-gradient(180deg, #7c3aed, #6366f1)' }} />
      )}

      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-slate-100">
        {screen.image_url ? (
          <img
            src={screen.image_url}
            alt={screen.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <Monitor className="h-12 w-12 text-slate-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        {/* Price strip at bottom of image */}
        <div className="absolute bottom-0 inset-x-0 px-4 py-3 flex items-end justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/60">Base Rate</p>
            <p className="flex items-center text-base font-black text-white leading-none mt-0.5">
              <IndianRupee className="h-3.5 w-3.5 mr-0.5" />
              {price > 0 ? price.toLocaleString('en-IN') : 'â€”'}
              <span className="ml-1 text-[11px] font-medium text-white/70 capitalize">/ {screen.price_unit || 'day'}</span>
            </p>
          </div>
          {(isActive || isHovered) && (
            <div className="h-2.5 w-2.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.9)]" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-5">
        <h3 className="font-bold text-slate-900 text-base leading-tight group-hover:text-violet-700 transition-colors line-clamp-1">
          {screen.name}
        </h3>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 text-violet-400 shrink-0" />
          <span className="truncate">{screen.area}</span>
        </div>

        {screen.footfall && (
          <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-violet-600">
            <Users className="h-3 w-3" />
            {screen.footfall} footfall
          </div>
        )}

        {screen.description && (
          <p className="mt-2.5 text-xs text-slate-400 leading-relaxed line-clamp-2">{screen.description}</p>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onView() }}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 py-2.5 text-[12px] font-bold text-white hover:bg-violet-600 transition-colors"
        >
          View & Book Slot
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

function MobileScreenCard({ screen, isActive, onFocus, cardRef }) {
  const price = Number(screen.base_price || 0)

  return (
    <motion.div
      variants={cascadeItem}
      ref={cardRef}
      onClick={onFocus}
      layout
      className={`group relative w-[82vw] max-w-[310px] shrink-0 snap-center overflow-hidden rounded-[24px] cursor-pointer bg-white transition-all duration-300 ${
        isActive
          ? 'ring-2 ring-violet-500 shadow-[0_18px_40px_rgba(124,58,237,0.22)]'
          : 'border border-slate-200/70 shadow-[0_10px_24px_rgba(15,23,42,0.08)]'
      }`}
    >
      {/* Image */}
      <div className="relative h-36 overflow-hidden bg-slate-100">
        {screen.image_url ? (
          <img
            src={screen.image_url}
            alt={screen.name}
            className="h-full w-full object-cover transition-transform duration-700 group-active:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <Monitor className="h-10 w-10 text-slate-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

        {/* Selection indicator */}
        <div className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full transition-all ${
          isActive ? 'bg-violet-500 shadow-[0_0_12px_rgba(124,58,237,0.6)]' : 'bg-white/80'
        }`}>
          {isActive
            ? <CheckCircle2 className="h-4 w-4 text-white" />
            : <div className="h-3 w-3 rounded-full border-2 border-slate-400" />
          }
        </div>

        {/* Price */}
        <div className="absolute inset-x-0 bottom-0 px-3 py-2.5">
          <p className="flex items-center text-sm font-black text-white">
            <IndianRupee className="mr-0.5 h-3 w-3" />
            {price > 0 ? price.toLocaleString('en-IN') : '—'}
            <span className="ml-1 text-[10px] font-medium capitalize text-white/70">/ {screen.price_unit || 'day'}</span>
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className={`line-clamp-1 text-sm font-bold transition-colors ${isActive ? 'text-violet-700' : 'text-slate-900'}`}>
          {screen.name}
        </h3>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="h-3 w-3 shrink-0 text-violet-400" />
          <span className="truncate">{screen.area}</span>
        </div>
        <p className={`mt-2 text-[11px] font-semibold transition-colors ${isActive ? 'text-violet-600' : 'text-slate-400'}`}>
          {isActive ? '✓ Selected — tap Book below' : 'Tap to select'}
        </p>
      </div>
    </motion.div>
  )
}

function MobileBookBar({ screen, onBook, onDismiss }) {
  const price = Number(screen?.base_price || 0)
  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 120, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 lg:hidden"
      style={{ background: 'linear-gradient(to top, rgba(248,248,251,1) 70%, rgba(248,248,251,0))' }}
    >
      <div className="rounded-[22px] border border-violet-200 bg-white px-4 py-4 shadow-[0_-6px_32px_rgba(124,58,237,0.18)]">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">Selected Screen</p>
            <p className="mt-0.5 truncate text-sm font-black text-slate-900">{screen.name}</p>
            <p className="text-[11px] text-slate-400">
              {screen.area} · Rs {price > 0 ? price.toLocaleString('en-IN') : '—'}/{screen.price_unit || 'day'}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={onBook}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-[18px] py-3.5 text-sm font-black text-white shadow-[0_6px_20px_rgba(124,58,237,0.38)] transition active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}
        >
          Book This Screen
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  )
}

// â”€â”€ Skeleton Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SkeletonCard() {
  return (
    <div className="rounded-[22px] overflow-hidden bg-white border border-slate-100 animate-pulse">
      <div className="h-48 bg-slate-100" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-slate-100 rounded-full w-3/4" />
        <div className="h-3 bg-slate-100 rounded-full w-1/2" />
        <div className="h-3 bg-slate-100 rounded-full w-2/3" />
        <div className="h-9 bg-slate-100 rounded-full mt-4" />
      </div>
    </div>
  )
}

function MobileSkeletonCard() {
  return (
    <div className="w-[82vw] max-w-[310px] shrink-0 snap-center overflow-hidden rounded-[24px] border border-slate-100 bg-white animate-pulse">
      <div className="h-36 bg-slate-100" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-2/3 rounded-full bg-slate-100" />
        <div className="h-3 w-1/2 rounded-full bg-slate-100" />
        <div className="mt-4 h-9 rounded-full bg-slate-100" />
      </div>
    </div>
  )
}

export default function Locations() {
  const navigate = useNavigate()
  const [screens, setScreens] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [hoveredId, setHoveredId] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [focusVersion, setFocusVersion] = useState(0)
  const desktopCardRefs = useRef({})
  const mobileCardRefs = useRef({})

  useEffect(() => {
    api.get('/screens')
      .then(res => { setScreens(res.data); setError('') })
      .catch(err => setError(err.response?.data?.detail || 'Could not load locations.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = screens.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.area.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const mapLocations = useMemo(() => filtered.map(s => {
    const lat = Number(s.latitude)
    const lng = Number(s.longitude)
    return { ...s, lat, lng, hasCoords: Number.isFinite(lat) && Number.isFinite(lng) }
  }), [filtered])

  const locationsWithCoords = useMemo(() => mapLocations.filter(l => l.hasCoords), [mapLocations])
  const activeLocation = useMemo(() => locationsWithCoords.find(l => l.id === activeId) || null, [locationsWithCoords, activeId])
  const mapBounds = useMemo(() => locationsWithCoords.map(l => [l.lat, l.lng]), [locationsWithCoords])
  const defaultCenter = useMemo(() => {
    if (locationsWithCoords.length > 0) return { lat: locationsWithCoords[0].lat, lng: locationsWithCoords[0].lng }
    return { lat: 12.9716, lng: 77.5946 }
  }, [locationsWithCoords])
  const quickAreas = useMemo(
    () => [...new Set(filtered.map(screen => screen.area).filter(Boolean))].slice(0, 4),
    [filtered],
  )
  const activeMobileScreen = useMemo(() => filtered.find(s => s.id === activeId) || null, [filtered, activeId])

  const focusOnLocation = (loc) => {
    if (!loc) return
    setActiveId(loc.id)
    setFocusVersion(p => p + 1)
  }

  useEffect(() => {
    if (!activeId) return
    const desktopTarget = desktopCardRefs.current[activeId]
    const mobileTarget = mobileCardRefs.current[activeId]
    if (desktopTarget) desktopTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (mobileTarget) mobileTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeId])

  useEffect(() => {
    setActiveId(null)
    setFocusVersion(p => p + 1)
  }, [search])

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-[#f8f8fb]"
    >
      {/* â”€â”€ Hero / Search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#f5fbff_0%,#eef4ff_46%,#fff4e6_100%)]">
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            animate={{ scale: [1, 1.08, 1], opacity: [0.16, 0.24, 0.16] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute left-[-6%] top-[-14%] h-[360px] w-[360px] rounded-full bg-sky-300/60 blur-[110px]"
          />
          <motion.div
            animate={{ scale: [1.08, 1, 1.08], opacity: [0.14, 0.2, 0.14] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1.6 }}
            className="absolute right-[-8%] top-[6%] h-[320px] w-[320px] rounded-full bg-blue-200/70 blur-[100px]"
          />
          <motion.div
            animate={{ y: [0, -10, 0], opacity: [0.2, 0.28, 0.2] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
            className="absolute bottom-[-22%] left-[28%] h-[300px] w-[300px] rounded-full bg-amber-200/80 blur-[100px]"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 lg:py-20">
          <div className="grid gap-6 lg:gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE_OUT }}
                className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-white/80 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.28em] text-sky-700 shadow-[0_12px_30px_rgba(59,130,246,0.08)] backdrop-blur"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                City-ready screen network
              </motion.div>

              <motion.h1
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.75, ease: EASE_OUT, delay: 0.08 }}
                className="mt-5 max-w-3xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-[3rem] lg:leading-[1.08]"
              >
                Place your brand{' '}
                <span className="block">where the city already looks at an affordable price.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: EASE_OUT }}
                className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base"
              >
                Explore premium digital displays, compare prime areas, and move from discovery to quotation in one clean flow.
              </motion.p>

              {!loading && screens.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.5 }}
                  className="mt-5 flex flex-wrap gap-2"
                >
                  {[
                    `${screens.length} live screens`,
                    `${locationsWithCoords.length} mapped points`,
                    'Rs 99/day starting',
                  ].map((label) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-white/80 bg-white/75 px-3 py-2 text-xs font-semibold text-slate-700 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur sm:px-4 sm:py-3 sm:text-sm"
                    >
                      {label}
                    </div>
                  ))}
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.28, ease: EASE_OUT }}
                className="mt-5 max-w-xl relative"
              >
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                <input
                  type="text"
                  placeholder="Search by location, area, or keyword..."
                  className="w-full rounded-[22px] border border-white/80 bg-white/90 py-4 pl-11 pr-10 text-sm text-slate-700 shadow-[0_18px_40px_rgba(15,23,42,0.1)] outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </motion.div>

              {quickAreas.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.42, duration: 0.5 }}
                  className="mt-4 flex flex-wrap gap-2"
                >
                  {quickAreas.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setSearch(area)}
                      className="rounded-full border border-sky-200/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-700"
                    >
                      {area}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.65, delay: 0.22, ease: EASE_OUT }}
              className="relative hidden lg:block"
            >
              <div className="rounded-[32px] border border-white/80 bg-white/[0.82] p-5 shadow-[0_28px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-sky-700">Live Map Preview</p>
                    <h2 className="mt-2 text-2xl font-black text-slate-950">High-attention zones at a glance</h2>
                  </div>
                  <div className="rounded-2xl bg-slate-950 px-3 py-2 text-right text-white shadow-lg">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">Pinned</p>
                    <p className="text-lg font-black">{locationsWithCoords.length}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    { label: 'Prime areas', value: quickAreas.length > 0 ? quickAreas.join(' • ') : 'Ready to explore' },
                    { label: 'Discovery speed', value: 'Search, focus, quote, and book from one page' },
                    { label: 'Map feel', value: 'Light streets, clearer roads, calmer blue location pins' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-[28px] border border-sky-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_100%)] p-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Suggested next step</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {activeLocation ? activeLocation.name : 'Tap any pin or card to focus that location'}
                      </p>
                    </div>
                    <div className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-700">
                      {filtered.length} available now
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* â”€â”€ Results â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="bg-[#f8f8fb]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-10 sm:pt-8 sm:pb-16">
          {/* Toolbar */}
          <div className="mb-4 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              <span className="font-bold text-slate-900">{filtered.length}</span>{' '}
              location{filtered.length !== 1 ? 's' : ''} found
            </p>
            <div className="flex items-center gap-2 sm:justify-end">
              <button
                onClick={() => { setActiveId(null); setFocusVersion(p => p + 1) }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
              >
                Show All
              </button>
            </div>
          </div>

          {loading ? (
            <>
              <div className="space-y-4 lg:hidden">
                <div className="sticky top-[72px] z-20 -mx-4 bg-[#f8f8fb]/96 px-4 pb-4 backdrop-blur-xl">
                  <div className="relative">
                    <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full border border-white/80 bg-white/92 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur">
                      City Map
                    </div>
                    <div className="pointer-events-none absolute right-4 top-4 z-10 rounded-full border border-white/80 bg-white/92 px-3 py-2 text-xs font-bold text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur">
                      Loading
                    </div>
                    <div className="h-[38vh] min-h-[280px] rounded-[32px] border border-white/80 bg-slate-100 animate-pulse" />
                  </div>
                </div>

                <div className="relative z-10 -mt-8 overflow-hidden rounded-[30px] border border-white/80 bg-white/80 p-4 shadow-[0_22px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl">
                  <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-500">Browse Locations</p>
                      <p className="mt-0.5 text-sm font-semibold text-slate-700">Loading inventory...</p>
                    </div>
                  </div>
                  <div className="locations-mobile-scroll flex snap-x snap-mandatory gap-4 overflow-x-auto px-[9vw] pb-2 pt-1">
                    {[1, 2, 3].map(i => <MobileSkeletonCard key={i} />)}
                  </div>
                </div>
              </div>

              <div className="hidden gap-6 lg:grid lg:grid-cols-[1.8fr_3.2fr] lg:items-start">
                <div className="order-1 h-[38vh] min-h-[320px] rounded-[28px] bg-slate-100 animate-pulse lg:order-2 lg:h-[calc(100vh-120px)]" />
                <div className="order-2 grid grid-cols-1 gap-5 lg:order-1">
                  {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                </div>
              </div>
            </>
          ) : error ? (
            <div className="text-center py-24">
              <Monitor className="h-14 w-14 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-500">Locations unavailable</h3>
              <p className="text-sm text-slate-400 mt-2">{error}</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 lg:hidden">
                <div className="sticky top-[72px] z-20 -mx-4 bg-[#f8f8fb]/96 px-4 pb-4 backdrop-blur-xl">
                  <div className="relative">
                    <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full border border-white/80 bg-white/92 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur">
                      City Map
                    </div>
                    <div className="pointer-events-none absolute right-4 top-4 z-10 rounded-full border border-white/80 bg-white/92 px-3 py-2 text-xs font-bold text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur">
                      {locationsWithCoords.length}/{filtered.length} pinned
                    </div>

                    {activeLocation && (
                      <div className="absolute bottom-4 left-4 right-20 z-10 rounded-[24px] border border-white/85 bg-white/94 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">Focused location</p>
                        <h3 className="mt-1.5 line-clamp-1 text-base font-black text-slate-950">{activeLocation.name}</h3>
                        <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-500">
                          <span className="truncate">{activeLocation.area}</span>
                          <span className="shrink-0 font-bold text-slate-900">
                            Rs {Number(activeLocation.base_price || 0).toLocaleString('en-IN')}/{activeLocation.price_unit || 'day'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div
                      className="h-[38vh] min-h-[280px] w-full overflow-hidden rounded-[32px] border border-white/80"
                      style={{ boxShadow: '0 24px 70px rgba(15,23,42,0.16)' }}
                    >
                      <MapContainer
                        center={[defaultCenter.lat, defaultCenter.lng]}
                        zoom={13}
                        scrollWheelZoom
                        zoomControl={false}
                        style={{ width: '100%', height: '100%' }}
                      >
                        <TileLayer
                          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        />
                        <MapFocus location={activeLocation} bounds={mapBounds} focusVersion={focusVersion} />
                        {locationsWithCoords.map((loc) => (
                          <Marker
                            key={loc.id}
                            position={[loc.lat, loc.lng]}
                            icon={activeId === loc.id || hoveredId === loc.id ? highlightMarker : baseMarker}
                            eventHandlers={{
                              mouseover: () => setHoveredId(loc.id),
                              mouseout: () => setHoveredId(null),
                              click: () => focusOnLocation(loc),
                            }}
                          >
                            <Popup>
                              <div className="min-w-[190px]">
                                <p className="text-sm font-bold text-slate-900">{loc.name}</p>
                                <p className="mt-1 text-xs text-slate-500">{loc.area}</p>
                                <button
                                  onClick={() => navigate(`/location/${loc.id}`)}
                                  className="mt-3 inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-violet-700"
                                >
                                  View Location
                                  <ArrowRight className="h-3 w-3" />
                                </button>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                      </MapContainer>
                    </div>
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <div className="relative z-10 -mt-8 rounded-[30px] border border-white/80 bg-white/80 px-6 py-12 text-center shadow-[0_22px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl">
                    <Monitor className="mx-auto mb-4 h-12 w-12 text-slate-200" />
                    <h3 className="text-base font-bold text-slate-500">
                      {search ? 'No locations match your search' : 'No locations available'}
                    </h3>
                    {search && (
                      <button onClick={() => setSearch('')} className="mt-4 text-sm font-semibold text-violet-600 hover:underline">
                        Clear Search
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="relative z-10 -mt-8 overflow-hidden rounded-[30px] border border-white/80 bg-white/80 p-4 shadow-[0_22px_60px_rgba(15,23,42,0.1)] backdrop-blur-xl">
                    <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-500">Browse Locations</p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-700">Swipe to explore, tap to focus map.</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500">
                        {filtered.length}
                      </span>
                    </div>

                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                      className={`locations-mobile-scroll flex snap-x snap-mandatory gap-4 overflow-x-auto px-[9vw] pt-1 ${activeMobileScreen ? 'pb-36' : 'pb-2'}`}
                    >
                      <AnimatePresence mode="popLayout">
                        {filtered.map((screen, index) => (
                          <MobileScreenCard
                            key={screen.id}
                            screen={screen}
                            index={index}
                            isActive={activeId === screen.id}
                            cardRef={(el) => { mobileCardRefs.current[screen.id] = el }}
                            onFocus={() => focusOnLocation(mapLocations.find(l => l.id === screen.id))}
                          />
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                )}
              </div>

              <div className="hidden gap-6 lg:grid lg:grid-cols-[1.8fr_3.2fr] lg:items-start">
                {/* Map */}
                <div className="relative order-1 lg:order-2 lg:sticky lg:top-20">
                  <div className="relative">
                    {/* Map overlays */}
                    <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full border border-white/80 bg-white/92 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur">
                      City Map
                    </div>
                    <div className="pointer-events-none absolute right-4 top-4 z-10 rounded-full border border-white/80 bg-white/92 px-3 py-2 text-xs font-bold text-slate-500 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur">
                      {locationsWithCoords.length}/{filtered.length} pinned
                    </div>

                    {activeLocation && (
                      <div className="absolute left-4 bottom-20 z-10 hidden max-w-[280px] rounded-[26px] border border-white/85 bg-white/94 p-4 shadow-[0_20px_45px_rgba(15,23,42,0.16)] backdrop-blur lg:block">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">Focused location</p>
                        <h3 className="mt-2 text-lg font-black text-slate-950">{activeLocation.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">{activeLocation.area}</p>
                        <div className="mt-3 flex items-center justify-between text-sm">
                          <span className="text-slate-400">Base rate</span>
                          <span className="font-bold text-slate-900">
                            Rs {Number(activeLocation.base_price || 0).toLocaleString('en-IN')}/{activeLocation.price_unit || 'day'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div
                      className="h-[38vh] min-h-[320px] w-full overflow-hidden rounded-[32px] border border-white/80 sm:h-[52vh] lg:h-[calc(100vh-120px)]"
                      style={{ boxShadow: '0 24px 70px rgba(15,23,42,0.16)' }}
                    >
                      <MapContainer
                        center={[defaultCenter.lat, defaultCenter.lng]}
                        zoom={13}
                        scrollWheelZoom
                        zoomControl={false}
                        style={{ width: '100%', height: '100%' }}
                      >
                        <TileLayer
                          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        />
                        <MapFocus location={activeLocation} bounds={mapBounds} focusVersion={focusVersion} />
                        {locationsWithCoords.map((loc) => (
                          <Marker
                            key={loc.id}
                            position={[loc.lat, loc.lng]}
                            icon={activeId === loc.id || hoveredId === loc.id ? highlightMarker : baseMarker}
                            eventHandlers={{
                              mouseover: () => setHoveredId(loc.id),
                              mouseout: () => setHoveredId(null),
                              click: () => focusOnLocation(loc),
                            }}
                          >
                            <Popup>
                              <div className="min-w-[190px]">
                                <p className="text-sm font-bold text-slate-900">{loc.name}</p>
                                <p className="mt-1 text-xs text-slate-500">{loc.area}</p>
                                <button
                                  onClick={() => navigate(`/location/${loc.id}`)}
                                  className="mt-3 inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-violet-700"
                                >
                                  View Location
                                  <ArrowRight className="h-3 w-3" />
                                </button>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                      </MapContainer>
                    </div>
                  </div>
                </div>

                {/* Card list */}
                <div className="order-2 lg:order-1">
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 gap-5 lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto lg:pr-2"
                  >
                    <AnimatePresence mode="popLayout">
                      {filtered.map((screen, index) => (
                        <ScreenCard
                          key={screen.id}
                          screen={screen}
                          index={index}
                          isActive={activeId === screen.id}
                          isHovered={hoveredId === screen.id}
                          cardRef={(el) => { desktopCardRefs.current[screen.id] = el }}
                          onMouseEnter={() => setHoveredId(screen.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          onFocus={() => focusOnLocation(mapLocations.find(l => l.id === screen.id))}
                          onView={() => {
                            track('screen_viewed', { screen_id: screen.id, screen_name: screen.name, area: screen.area })
                            navigate(`/location/${screen.id}`)
                          }}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Mobile Sticky Book Bar ─────────────────────── */}
      <AnimatePresence>
        {activeMobileScreen && (
          <MobileBookBar
            screen={activeMobileScreen}
            onBook={() => {
              track('screen_viewed', { screen_id: activeMobileScreen.id, screen_name: activeMobileScreen.name, area: activeMobileScreen.area })
              navigate(`/location/${activeMobileScreen.id}`)
            }}
            onDismiss={() => { setActiveId(null); setFocusVersion(p => p + 1) }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
