import { useMemo, useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import {
  MapPin, Monitor, Search, Zap, IndianRupee, SlidersHorizontal, Loader2, Users
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const baseMarker = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const highlightMarker = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

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

export default function Locations() {
  const navigate = useNavigate()
  const [screens, setScreens] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [hoveredId, setHoveredId] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [focusVersion, setFocusVersion] = useState(0)
  const cardRefs = useRef({})
  const mobileCardRefs = useRef({})
  const mobileScrollerRef = useRef(null)

  useEffect(() => {
    api.get('/screens')
      .then(res => {
        setScreens(res.data)
        setError('')
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'Could not load locations. Make sure backend is running on port 8000.')
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = screens.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.area.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const getMinPrice = (s) => {
    const prices = [s.price_daily, s.price_weekly, s.price_monthly, s.price_yearly].filter(p => p > 0)
    return prices.length > 0 ? Math.min(...prices) : 0
  }

  const mapLocations = useMemo(() => {
    return filtered.map((screen) => {
      const lat = Number(screen.latitude)
      const lng = Number(screen.longitude)
      const hasCoords = Number.isFinite(lat) && Number.isFinite(lng)
      return {
        ...screen,
        lat,
        lng,
        hasCoords,
      }
    })
  }, [filtered])

  const locationsWithCoords = useMemo(
    () => mapLocations.filter((location) => location.hasCoords),
    [mapLocations]
  )
  const activeLocation = useMemo(
    () => locationsWithCoords.find((location) => location.id === activeId) || null,
    [locationsWithCoords, activeId]
  )
  const mapBounds = useMemo(() => (
    locationsWithCoords.map((loc) => [loc.lat, loc.lng])
  ), [locationsWithCoords])

  const defaultCenter = useMemo(() => {
    if (locationsWithCoords.length > 0) {
      return { lat: locationsWithCoords[0].lat, lng: locationsWithCoords[0].lng }
    }
    return { lat: 12.9716, lng: 77.5946 }
  }, [locationsWithCoords])

  const focusOnLocation = (location) => {
    if (!location) return
    setActiveId(location.id)
    setFocusVersion((prev) => prev + 1)
  }

  useEffect(() => {
    if (!activeId) return
    const target = cardRefs.current[activeId]
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeId])

  useEffect(() => {
    setActiveId(null)
    setFocusVersion((prev) => prev + 1)
  }, [search])

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-purple-900 py-16">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full filter blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-0 right-10 w-96 h-96 bg-purple-300 rounded-full filter blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 animate-fade-in">
            Explore Ad Locations
          </h1>
          <p className="text-white/70 max-w-xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Browse premium digital screens across top locations. Select one to view full details and book instantly.
          </p>

          {/* Search Bar */}
          <div className="max-w-lg mx-auto relative animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by location, area, or keyword..."
              className="w-full pl-12 pr-4 py-3.5 bg-white/95 backdrop-blur-sm rounded-2xl text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="bg-slate-50/70">
        <div className="page-container pt-10 pb-16">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{filtered.length}</span> location{filtered.length !== 1 ? 's' : ''} found
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveId(null)
                setFocusVersion((prev) => prev + 1)
              }}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
            >
              Show All Locations
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <SlidersHorizontal className="w-4 h-4" />
              <span>All Locations</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <Monitor className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-500">Locations unavailable</h3>
            <p className="text-sm text-gray-400 mt-2">{error}</p>
          </div>
        ) : (
          <div className="mt-4 border-t border-slate-200/70 pt-6">
            

            <div className="hidden">
              <div className="mx-3 mb-3 rounded-2xl bg-white/95 shadow-2xl backdrop-blur border border-slate-200 h-[28vh] pointer-events-auto">
                <div className="flex items-center justify-center py-2">
                  <div className="h-1.5 w-10 rounded-full bg-slate-300" />
                </div>
                <div
                  ref={mobileScrollerRef}
                  className="flex gap-4 overflow-x-auto px-4 pb-4 pt-2 snap-x snap-mandatory"
                >
                  {filtered.length === 0 ? (
                    <div className="text-center py-8">
                      <Monitor className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <h3 className="text-base font-semibold text-gray-600">
                        {search ? 'No locations match your search' : 'No locations available'}
                      </h3>
                      <p className="text-sm text-gray-400 mt-2">
                        {search ? 'Try adjusting your search terms' : 'Check back soon for new advertising spots'}
                      </p>
                      {search && (
                        <button onClick={() => setSearch('')} className="btn-secondary text-sm mt-4">
                          Clear Search
                        </button>
                      )}
                    </div>
                  ) : filtered.map((screen) => {
                    const available = screen.available_slots ?? (screen.total_slots - screen.booked_slots)
                    const minPrice = getMinPrice(screen)
                    const isActive = activeId === screen.id
                    const isHovered = hoveredId === screen.id

                    return (
                      <div
                        key={screen.id}
                        ref={(el) => { mobileCardRefs.current[screen.id] = el }}
                        data-id={screen.id}
                        onClick={() => focusOnLocation(mapLocations.find((loc) => loc.id === screen.id))}
                        className={`min-w-[78%] max-w-[78%] snap-center overflow-hidden rounded-2xl border border-transparent bg-white shadow-[0_10px_24px_rgba(15,23,42,0.12)] transition ${
                          isActive || isHovered ? 'ring-2 ring-primary-500/70' : ''
                        }`}
                      >
                        <div className="h-24 bg-gradient-to-br from-primary-600 via-primary-500 to-purple-500 relative overflow-hidden">
                          {screen.image_url ? (
                            <img
                              src={screen.image_url}
                              alt={screen.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Monitor className="w-10 h-10 text-white/20" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                          <div className="absolute top-2 left-2">
                            <span className={`badge ${available > 0 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                              <Zap className="w-3 h-3 mr-1" />
                              {available > 0 ? `${available} slots open` : 'Fully Booked'}
                            </span>
                          </div>
                        </div>
                        <div className="p-3">
                          <h3 className="font-semibold text-gray-900">{screen.name}</h3>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                            <MapPin className="w-3.5 h-3.5 text-primary-500" />
                            {screen.area}
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900">
                              <IndianRupee className="w-4 h-4 inline-block mr-1 text-primary-600" />
                              {minPrice > 0 ? minPrice.toLocaleString('en-IN') : '—'}
                              <span className="ml-1 text-xs font-medium text-gray-400">/ month</span>
                            </p>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                              {available > 0 ? `${available} slots` : 'No slots'}
                            </span>
                          </div>
                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              {screen.footfall ? (
                                <><Users className="w-3 h-3" /> {screen.footfall}</>
                              ) : (
                                `${screen.total_slots} total slots`
                              )}
                            </span>
                            <button
                              onClick={(event) => {
                                event.stopPropagation()
                                navigate(`/location/${screen.id}`)
                              }}
                              className="text-xs font-semibold text-primary-600"
                            >
                              View Location {'->'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.8fr_3.2fr] lg:items-start">
              <div className="lg:block">
                <div className="grid grid-cols-1 gap-6 lg:max-h-[calc(100vh-160px)] lg:overflow-y-auto lg:pr-3">
                  {filtered.length === 0 ? (
                    <div className="text-center py-16">
                      <Monitor className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-500">
                        {search ? 'No locations match your search' : 'No locations available'}
                      </h3>
                      <p className="text-sm text-gray-400 mt-2">
                        {search ? 'Try adjusting your search terms' : 'Check back soon for new advertising spots'}
                      </p>
                      {search && (
                        <button onClick={() => setSearch('')} className="btn-secondary text-sm mt-4">
                          Clear Search
                        </button>
                      )}
                    </div>
                  ) : filtered.map((screen, i) => {
                    const available = screen.available_slots ?? (screen.total_slots - screen.booked_slots)
                    const minPrice = getMinPrice(screen)
                    const isActive = activeId === screen.id
                    const isHovered = hoveredId === screen.id

                    return (
                      <div
                        key={screen.id}
                        ref={(el) => { cardRefs.current[screen.id] = el }}
                        onMouseEnter={() => setHoveredId(screen.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => focusOnLocation(mapLocations.find((loc) => loc.id === screen.id))}
                        className={`card-hover overflow-hidden group cursor-pointer animate-slide-up border border-transparent transition-transform duration-300 ${
                          isActive || isHovered ? 'ring-2 ring-primary-500/70 shadow-[0_18px_40px_rgba(15,23,42,0.18)] -translate-y-1.5' : 'shadow-[0_12px_30px_rgba(15,23,42,0.08)]'
                        }`}
                        style={{ animationDelay: `${i * 0.08}s`, animationFillMode: 'both' }}
                      >
                        {/* Image */}
                        <div className="h-40 bg-gradient-to-br from-primary-600 via-primary-500 to-purple-500 relative overflow-hidden">
                          {screen.image_url ? (
                            <img
                              src={screen.image_url}
                              alt={screen.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Monitor className="w-16 h-16 text-white/20" />
                              <div className="absolute top-4 right-4">
                                <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse-slow" />
                              </div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
                          {/* Availability Badge */}
                          <div className="absolute top-3 left-3">
                            <span className={`badge ${available > 0 ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                              <Zap className="w-3 h-3 mr-1" />
                              {available > 0 ? `${available} slots open` : 'Fully Booked'}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-5">
                          <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-primary-600 transition-colors">
                            {screen.name}
                          </h3>
                          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
                            <MapPin className="w-3.5 h-3.5 text-primary-500" />
                            {screen.area}
                          </div>

                          {screen.description && (
                            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-5">
                              {screen.description}
                            </p>
                          )}

                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Starting at</p>
                              <p className="mt-1 flex items-center text-lg font-semibold text-gray-900">
                                <IndianRupee className="w-4 h-4 mr-1 text-primary-600" />
                                {minPrice > 0 ? minPrice.toLocaleString('en-IN') : '—'}
                                <span className="ml-1 text-xs font-medium text-gray-400">/ month</span>
                              </p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                              {available > 0 ? `${available} slots` : 'No slots'}
                            </span>
                          </div>

                          {/* CTA */}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-4">
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              {screen.footfall ? (
                                <><Users className="w-3.5 h-3.5" /> {screen.footfall} footfall</>
                              ) : (
                                `${screen.total_slots} total slots`
                              )}
                            </span>
                            <span
                              onClick={(event) => {
                                event.stopPropagation()
                                navigate(`/location/${screen.id}`)
                              }}
                              className="text-sm font-semibold text-primary-600 group-hover:translate-x-1 transition-transform"
                            >
                              View Location {'->'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="lg:block">
                <div className="lg:sticky lg:top-16">
                  <div className="relative">
                    <div className="pointer-events-none absolute left-5 top-5 z-10 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 shadow-md backdrop-blur">
                      Map View
                    </div>
                    <div className="pointer-events-none absolute right-5 top-5 z-10 rounded-full bg-white/80 px-3 py-2 text-xs font-semibold text-slate-500 shadow-md backdrop-blur">
                      {locationsWithCoords.length}/{filtered.length} pinned
                    </div>
                    <div className="h-[72vh] lg:h-[calc(100vh-120px)] w-full overflow-hidden rounded-2xl shadow-[0_30px_70px_rgba(15,23,42,0.22)]">
                      <MapContainer
                        center={[defaultCenter.lat, defaultCenter.lng]}
                        zoom={13}
                        scrollWheelZoom
                        zoomControl={false}
                        style={{ width: '100%', height: '100%' }}
                      >
                        <TileLayer
                          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        />
                        <MapFocus location={activeLocation} bounds={mapBounds} focusVersion={focusVersion} />
                        {locationsWithCoords.map((location) => {
                          const isActive = activeId === location.id
                          const isHovered = hoveredId === location.id
                          const icon = isActive || isHovered ? highlightMarker : baseMarker

                          return (
                            <Marker
                              key={location.id}
                              position={[location.lat, location.lng]}
                              icon={icon}
                              eventHandlers={{
                                mouseover: () => setHoveredId(location.id),
                                mouseout: () => setHoveredId(null),
                                click: () => focusOnLocation(location),
                              }}
                            >
                              <Popup>
                                <div className="min-w-[200px]">
                                  <p className="text-sm font-semibold text-gray-900">{location.name}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    from Rs {getMinPrice(location).toLocaleString('en-IN')}/month
                                  </p>
                                  <button
                                    onClick={() => navigate(`/location/${location.id}`)}
                                    className="mt-3 inline-flex items-center rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white"
                                  >
                                    View Location
                                  </button>
                                </div>
                              </Popup>
                            </Marker>
                          )
                        })}
                      </MapContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </section>
    </div>
  )
}
