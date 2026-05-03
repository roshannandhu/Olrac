import { useNavigate } from 'react-router-dom'
import { Flame, MapPin, Monitor, TrendingUp, Zap } from 'lucide-react'

import { SCREEN_PRICING_TIERS } from '../utils/screenPricing'
import { getLocationPath } from '../utils/locationSlugs'

export default function ScreenCard({ screen, index = 0 }) {
  const navigate = useNavigate()

  const isTrending = screen.footfall > 10000 || false

  const handleBook = () => {
    navigate(getLocationPath(screen))
  }

  return (
    <div
      className="group overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_50px_rgba(15,23,42,0.12)] animate-slide-up"
      style={{ animationDelay: `${index * 0.08}s`, animationFillMode: 'both' }}
    >
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-primary-400">
        {screen.image_url ? (
          <img
            src={screen.image_url}
            alt={screen.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Monitor className="h-16 w-16 text-white/20" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent" />

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold shadow-sm bg-emerald-500 text-white">
            <Zap className="h-3 w-3" />
            Active Display
          </span>

          {isTrending ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-semibold text-slate-950 shadow-sm">
              <Flame className="h-3 w-3" />
              Trending Location
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-xl font-black text-slate-900">{screen.name}</h3>
            <div className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
              <MapPin className="h-4 w-4 text-primary-500" />
              {screen.area}
            </div>
          </div>
        </div>

        {screen.description ? (
          <p className="mt-4 line-clamp-2 text-sm leading-7 text-slate-600">{screen.description}</p>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3">
          {SCREEN_PRICING_TIERS.map((tier, tierIndex) => (
            <div
              key={tier.key}
              className={`rounded-2xl border p-3 ${
                tierIndex === 0
                  ? 'border-primary-200 bg-primary-50'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
                tierIndex === 0 ? 'text-primary-600' : 'text-slate-400'
              }`}>
                {tier.shortLabel}
              </p>
              <p className={`mt-2 text-sm font-black ${
                tierIndex === 0 ? 'text-primary-700' : 'text-slate-900'
              }`}>
                Rs {Number(screen[`price_${tier.key}`] || 0).toLocaleString('en-IN')}
              </p>
            </div>
          ))}
        </div>



        <button
          onClick={handleBook}
          className="mt-5 inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-bold transition-all bg-slate-900 text-white shadow-md hover:bg-black"
        >
          View Details
        </button>
      </div>
    </div>
  )
}
