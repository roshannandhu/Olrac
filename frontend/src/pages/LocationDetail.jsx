import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  IndianRupee,
  Loader2,
  MapPin,
  Monitor,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react'

import api from '../api/axios'
import { getBillingLabel, SCREEN_PRICING_TIERS } from '../utils/screenPricing'

function DetailMeta({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 break-words text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  )
}

export default function LocationDetail() {
  const { screenId } = useParams()
  const navigate = useNavigate()

  const [screen, setScreen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState('')
  const [billingCycle, setBillingCycle] = useState('daily')

  useEffect(() => {
    api.get(`/screens/${screenId}`)
      .then((res) => {
        setScreen(res.data)
        setSelectedImage(res.data.image_url || res.data.additional_images?.[0] || '')
      })
      .catch(() => {
        toast.error('Location not found')
        navigate('/locations')
      })
      .finally(() => setLoading(false))
  }, [screenId, navigate])

  const galleryImages = useMemo(() => {
    if (!screen) return []
    return [screen.image_url, ...(screen.additional_images || [])].filter(Boolean)
  }, [screen])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!screen) return null

  const available = screen.available_slots ?? (screen.total_slots - screen.booked_slots)
  const usagePercent = screen.total_slots > 0 ? Math.round((screen.booked_slots / screen.total_slots) * 100) : 0
  const selectedPlanPrice = Number(screen[`price_${billingCycle}`] || 0)

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.05),_transparent_26%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
      <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_26%),linear-gradient(135deg,#0f172a,#172554,#1e293b)]">
        {screen.image_url ? (
          <img
            src={screen.image_url}
            alt={screen.name}
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        ) : null}
        <div className="absolute inset-0 opacity-60">
          <div className="absolute right-10 top-10 h-40 w-40 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-fuchsia-400/10 blur-3xl" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-slate-900/50" />

        <div className="page-container relative py-10 lg:py-12">
          <button
            onClick={() => navigate('/locations')}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
            Back To Locations
          </button>

          <div className="mt-8 grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                <Zap className="h-3.5 w-3.5" />
                {available > 0 ? `${available} slots available` : 'Fully booked'}
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">{screen.name}</h1>
              <p className="mt-4 flex items-center gap-4 text-base text-slate-200">
                <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-sky-300" />{screen.area}</span>
                {screen.footfall && <span className="flex items-center gap-2 border-l border-white/20 pl-4"><Users className="h-4 w-4 text-primary-300" />{screen.footfall} footfalls</span>}
              </p>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                {screen.description || 'Premium advertising inventory positioned in a high-attention area for long-duration brand visibility and stronger brand recall.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Capacity</p>
                <p className="mt-3 text-3xl font-black">{screen.total_slots}</p>
                <p className="mt-2 text-sm text-slate-300">total advertising units</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-white backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Booked</p>
                <p className="mt-3 text-3xl font-black">{screen.booked_slots}</p>
                <p className="mt-2 text-sm text-slate-300">currently occupied slots</p>
              </div>
              <div className="col-span-2 rounded-3xl border border-white/10 bg-white/5 p-5 text-white backdrop-blur-sm">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Occupancy</span>
                  <span>{usagePercent}%</span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-400" style={{ width: `${usagePercent}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-container py-10">
        <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="card overflow-hidden border border-slate-200/80">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_170px]">
                <div className="aspect-[16/10] bg-slate-100">
                  {selectedImage ? (
                    <img src={selectedImage} alt={screen.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <Monitor className="h-20 w-20" />
                    </div>
                  )}
                </div>

                {galleryImages.length > 0 ? (
                  <div className="border-t border-slate-200 bg-slate-50 p-4 lg:border-l lg:border-t-0">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Gallery</p>
                    <div className="grid grid-cols-4 gap-3 lg:grid-cols-2">
                      {galleryImages.map((image, index) => (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          onClick={() => setSelectedImage(image)}
                          className={`aspect-square overflow-hidden rounded-2xl border-2 transition ${
                            selectedImage === image ? 'border-primary-500 shadow-sm' : 'border-transparent hover:border-slate-300'
                          }`}
                        >
                          <img src={image} alt={`${screen.name} view ${index + 1}`} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DetailMeta icon={MapPin} label="Location" value={screen.area} />
              {screen.footfall ? (
                 <DetailMeta icon={Users} label="Daily/Monthly Footfall" value={screen.footfall} />
              ) : (
                 <DetailMeta icon={CheckCircle2} label="Availability" value={available > 0 ? `${available} slots open` : 'Currently fully booked'} />
              )}
            </div>

            <div className="card border border-slate-200/80 p-6">
              <h2 className="text-xl font-bold text-slate-900">Choose A Slot Plan</h2>
              <p className="mt-2 text-sm text-slate-500">
                Review pricing here, then continue to the instant quotation page to submit one request for this location or many locations together.
              </p>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {SCREEN_PRICING_TIERS.map((tier) => (
                  <button
                    key={tier.key}
                    type="button"
                    onClick={() => setBillingCycle(tier.key)}
                    className={`rounded-3xl border p-5 text-left transition-all ${
                      billingCycle === tier.key
                        ? 'border-primary-500 bg-primary-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${billingCycle === tier.key ? 'text-primary-600' : 'text-slate-400'}`}>
                      {tier.shortLabel}
                    </p>
                    <p className={`mt-3 text-2xl font-black ${billingCycle === tier.key ? 'text-primary-700' : 'text-slate-900'}`}>
                      Rs {Number(screen[`price_${tier.key}`] || 0).toLocaleString('en-IN')}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">{tier.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="card border border-slate-200/80 p-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary-600" />
                <h2 className="text-xl font-bold text-slate-900">Availability Snapshot</h2>
              </div>
              <div className="mt-5 flex items-center justify-between text-sm text-slate-600">
                <span>Booked vs capacity</span>
                <span className="font-semibold text-slate-900">{screen.booked_slots} / {screen.total_slots}</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-sky-500" style={{ width: `${usagePercent}%` }} />
              </div>
              <p className="mt-3 text-sm text-slate-500">
                {available > 0 ? `${available} slots remain open for this screen.` : 'This inventory is currently fully booked.'}
              </p>
            </div>
          </div>

          <div className="space-y-6 xl:sticky xl:top-24">
            <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-950 px-6 py-5 text-white">
                <h2 className="text-2xl font-black">Instant Quotation</h2>
                <p className="mt-2 text-sm text-slate-300">
                  The booking form now lives on a dedicated page so you can select multiple locations in one request.
                </p>
              </div>

              <div className="space-y-5 p-6">
                <div className="rounded-3xl border border-primary-100 bg-primary-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-600">Current Plan Preview</p>
                  <div className="mt-3 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-base font-black text-slate-900">{getBillingLabel(billingCycle)}</p>
                      <p className="mt-1 text-sm text-slate-500">This location will be preselected on the next page.</p>
                    </div>
                    <p className="text-2xl font-black text-primary-700">Rs {selectedPlanPrice.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-primary-700 shadow-sm">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">What changes now</p>
                      <p className="text-sm text-slate-500">One form can cover one or many locations.</p>
                    </div>
                  </div>
                  <DetailMeta icon={CheckCircle2} label="Selected Location" value={screen.name} />
                  <DetailMeta icon={IndianRupee} label="Starting Price" value={`Rs ${selectedPlanPrice.toLocaleString('en-IN')}`} />
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/booking?locations=${screen.id}`)}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#25D366] py-4 text-base font-bold text-white shadow-lg transition-all duration-300 hover:bg-[#20BD5A] hover:shadow-xl"
                >
                  <Sparkles className="h-5 w-5" />
                  Continue To Instant Quotation
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/booking')}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-4 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Browse All Locations In Quote
                </button>
              </div>
            </div>

            <div className="rounded-[30px] border border-emerald-100 bg-emerald-50/70 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cleaner Booking Flow</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Use the quotation page to submit campaign details once, add more locations before sending, and let the admin team review the full multi-location request together.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
