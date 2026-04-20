import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Monitor,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react'

import api from '../api/axios'
import { usePublicSettings } from '../context/PublicSettingsContext'
import { getBillingLabel, SCREEN_PRICING_TIERS } from '../utils/screenPricing'
import { DEFAULT_WHATSAPP_TEMPLATE, fillWhatsAppTemplate } from '../utils/whatsappTemplate'

function getAvailableSlots(screen) {
  if (typeof screen?.available_slots === 'number') return screen.available_slots
  return Math.max(0, Number(screen?.total_slots || 0) - Number(screen?.booked_slots || 0))
}

function getScreenUnitPrice(screen, billingCycle) {
  if (!screen) return 0

  const prices = {
    daily: Number(screen.price_daily) || 0,
    weekly: Number(screen.price_weekly) || 0,
    monthly: Number(screen.price_monthly) || 0,
    yearly: Number(screen.price_yearly) || 0,
  }

  return prices[billingCycle] || 0
}

function uniqueStrings(values) {
  return values.filter((value, index) => value && values.indexOf(value) === index)
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const OTP_LENGTH = 6

function isValidEmail(value) {
  return EMAIL_REGEX.test(String(value || '').trim())
}

function formatCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, '0')
  const seconds = String(safeSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function createInitialEmailVerification(targetEmail = '') {
  return {
    status: 'idle',
    targetEmail,
    code: '',
    verificationToken: '',
    resendReadyAt: null,
    expiresAt: null,
    message: '',
  }
}

function parseLocationIds(searchParams) {
  return String(searchParams.get('locations') || '')
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value, index, array) => Number.isInteger(value) && value > 0 && array.indexOf(value) === index)
}

function StepPill({ number, label, active, complete, onClick }) {
  const toneClass = complete
    ? 'border-slate-800 bg-slate-900 text-white shadow-sm cursor-pointer hover:bg-slate-800 transition'
    : active
      ? 'border-primary-200 bg-primary-50 text-primary-700 shadow-sm'
      : 'border-slate-200 bg-white text-slate-400'

  const Component = onClick && complete ? 'button' : 'div'

  return (
    <Component 
      onClick={onClick && complete ? onClick : undefined}
      className={`inline-flex items-center gap-2.5 rounded-lg border px-4 py-2 text-sm font-medium ${toneClass}`}
    >
      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-sm text-xs font-bold ${
        complete ? 'bg-white/20 text-white' : active ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'
      }`}>
        {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : number}
      </span>
      {label}
    </Component>
  )
}

function SummaryStat({ label, value, tone = 'slate' }) {
  const toneClass = tone === 'primary'
    ? 'border-primary-100 bg-primary-50 text-primary-700'
    : 'border-slate-200 bg-white text-slate-900'

  return (
    <div className={`rounded-lg border px-4 py-3 shadow-sm ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  )
}

function LocationCard({ screen, selected, billingCycle, onToggle, currentSlots = 1, onSlotsChange }) {
  const availableSlots = getAvailableSlots(screen)
  const price = getScreenUnitPrice(screen, billingCycle)

  return (
    <div
      className={`group relative flex w-full flex-col overflow-hidden rounded-xl border bg-white text-left transition-all duration-200 ${
        selected
          ? 'border-primary-500 ring-1 ring-primary-500 shadow-md'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(screen.id)}
        className="w-full text-left"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
          {screen.image_url ? (
            <img
              src={screen.image_url}
              alt={screen.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-300">
              <Monitor className="h-10 w-10" />
            </div>
          )}
          <div className="absolute left-3 top-3 rounded bg-slate-900/80 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-md">
            {availableSlots > 0 ? `${availableSlots} slots available` : 'Booked'}
          </div>
          <div className={`absolute right-3 top-3 flex items-center gap-1.5 rounded bg-white px-2 py-1 text-[11px] font-semibold shadow-sm transition-colors ${
            selected ? 'text-primary-600' : 'text-slate-600'
          }`}>
            {selected ? <CheckCircle2 className="h-3.5 w-3.5 fill-primary-600 text-white" /> : 'Select'}
          </div>
        </div>
        <div className="flex flex-1 flex-col p-4 pb-2">
          <h3 className="text-base font-bold text-slate-900 line-clamp-1">{screen.name}</h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{screen.area}</span>
          </p>
          {screen.footfall && (
            <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-primary-600">
               <Users className="h-3 w-3" />
               {screen.footfall}
            </p>
          )}
        </div>
      </button>

      <div className="px-4 pb-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <div>
          <p className="text-[10px] font-medium uppercase text-slate-400">Price ({getBillingLabel(billingCycle)})</p>
          <p className="text-sm font-bold text-slate-900">Rs {(price * currentSlots).toLocaleString('en-IN')}</p>
        </div>
        {selected && availableSlots > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold text-slate-500">SLOTS</label>
            <select
              value={currentSlots}
              onChange={(e) => onSlotsChange(screen.id, Number(e.target.value))}
              className="rounded-lg border border-slate-300 py-1 pl-2 pr-6 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              {Array.from({ length: Math.min(availableSlots, 50) }, (_, i) => i + 1).map((num) => (
                <option key={num} value={num}>
                  {num} Slot{num > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Booking() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { settings: publicSettings } = usePublicSettings()

  const [stage, setStage] = useState('select')
  const [screens, setScreens] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [polishing, setPolishing] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [bookingInfo, setBookingInfo] = useState(null)
  const [form, setForm] = useState({
    budget: '',
    ad_description: '',
    polished_description: '',
    billing_cycle: 'daily',
    client_name: '',
    company: '',
    email: '',
    phone: '',
  })
  const [slotQuantities, setSlotQuantities] = useState({})
  const [emailVerification, setEmailVerification] = useState(() => createInitialEmailVerification())
  const [otpTick, setOtpTick] = useState(Date.now())
  const latestEmailRef = useRef('')

  const normalizedEmail = form.email.trim().toLowerCase()
  const emailIsValid = isValidEmail(normalizedEmail)

  useEffect(() => {
    api.get('/screens')
      .then((res) => {
        setScreens(Array.isArray(res.data) ? res.data : [])
      })
      .catch(() => {
        toast.error('Failed to load locations')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!screens.length) {
      setSelectedIds([])
      return
    }

    const screenIds = new Set(screens.map((screen) => screen.id))
    const requestedIds = parseLocationIds(searchParams).filter((id) => screenIds.has(id))

    setSelectedIds((current) => {
      const currentValid = current.filter((id) => screenIds.has(id))
      if (currentValid.length > 0) {
        if (currentValid.length === current.length) return current
        return currentValid
      }
      if (
        current.length === requestedIds.length
        && current.every((id, index) => id === requestedIds[index])
      ) {
        return current
      }
      return requestedIds
    })
  }, [screens, searchParams])

  useEffect(() => {
    latestEmailRef.current = normalizedEmail
  }, [normalizedEmail])

  useEffect(() => {
    if (!normalizedEmail || !emailIsValid) return undefined
    if (emailVerification.targetEmail !== normalizedEmail || emailVerification.status !== 'idle') return undefined

    const timeoutId = window.setTimeout(() => {
      requestEmailOtp()
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [emailIsValid, emailVerification.status, emailVerification.targetEmail, normalizedEmail])

  useEffect(() => {
    if (!selectedIds.length && stage === 'details') {
      setStage('select')
    }
  }, [selectedIds, stage])

  useEffect(() => {
    if (!emailVerification.resendReadyAt && !emailVerification.expiresAt) return undefined

    const intervalId = window.setInterval(() => {
      setOtpTick(Date.now())
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [emailVerification.expiresAt, emailVerification.resendReadyAt])

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleEmailChange = (event) => {
    const nextValue = event.target.value
    const nextEmail = nextValue.trim().toLowerCase()

    update('email', nextValue)
    setBookingInfo(null)

    setEmailVerification((current) => {
      if (!nextEmail) return createInitialEmailVerification()
      if (nextEmail === current.targetEmail) return current
      return createInitialEmailVerification(nextEmail)
    })
  }

  const requestEmailOtp = async ({ manual = false } = {}) => {
    const targetEmail = form.email.trim().toLowerCase()

    if (!targetEmail) {
      setEmailVerification(createInitialEmailVerification())
      return
    }

    if (!isValidEmail(targetEmail)) {
      setEmailVerification({
        ...createInitialEmailVerification(targetEmail),
        status: 'invalid',
        message: 'Enter a valid email address to receive the OTP.',
      })
      return
    }

    if (emailVerification.status === 'sending' && emailVerification.targetEmail === targetEmail) {
      return
    }

    setEmailVerification((current) => ({
      ...createInitialEmailVerification(targetEmail),
      code: current.targetEmail === targetEmail ? current.code : '',
      status: 'sending',
      message: manual ? 'Sending a fresh OTP to your email...' : 'Sending OTP to your email...',
    }))

    try {
      const res = await api.post('/bookings/otp/send', { email: targetEmail })
      if (latestEmailRef.current !== targetEmail) return

      const now = Date.now()
      setEmailVerification({
        status: 'sent',
        targetEmail,
        code: '',
        verificationToken: '',
        resendReadyAt: now + Number(res.data.resend_in_seconds || 0) * 1000,
        expiresAt: now + Number(res.data.expires_in_seconds || 0) * 1000,
        message: res.data.detail || 'Verification code sent to your email.',
      })
      toast.success(res.data.detail || 'Verification code sent to your email.')
    } catch (err) {
      if (latestEmailRef.current !== targetEmail) return

      const detail = err.response?.data?.detail || 'Failed to send verification code.'
      setEmailVerification({
        ...createInitialEmailVerification(targetEmail),
        status: 'error',
        message: detail,
      })
      toast.error(detail)
    }
  }

  const handleOtpChange = (event) => {
    const value = event.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH)
    setEmailVerification((current) => ({
      ...current,
      code: value,
      message: current.status === 'invalid' ? '' : current.message,
    }))
  }

  const handleVerifyOtp = async () => {
    const targetEmail = form.email.trim().toLowerCase()
    const otp = emailVerification.code.trim()

    if (!isValidEmail(targetEmail)) {
      toast.error('Enter a valid email address first.')
      return
    }

    if (otp.length !== OTP_LENGTH) {
      toast.error('Enter the 6-digit OTP.')
      return
    }

    setEmailVerification((current) => ({
      ...current,
      status: 'verifying',
      message: 'Verifying your email...',
    }))

    try {
      const res = await api.post('/bookings/otp/verify', {
        email: targetEmail,
        otp,
      })

      if (latestEmailRef.current !== targetEmail) return

      setEmailVerification({
        status: 'verified',
        targetEmail,
        code: '',
        verificationToken: res.data.verification_token,
        resendReadyAt: null,
        expiresAt: null,
        message: res.data.detail || 'Email verified successfully.',
      })
      toast.success(res.data.detail || 'Email verified successfully.')
    } catch (err) {
      if (latestEmailRef.current !== targetEmail) return

      const detail = err.response?.data?.detail || 'OTP verification failed.'
      setEmailVerification((current) => ({
        ...current,
        status: current.expiresAt && Date.now() >= current.expiresAt ? 'expired' : 'sent',
        verificationToken: '',
        message: detail,
      }))
      toast.error(detail)
    }
  }

  const screenMap = useMemo(
    () => new Map(screens.map((screen) => [screen.id, screen])),
    [screens]
  )

  const selectedScreens = useMemo(
    () => selectedIds.map((id) => screenMap.get(id)).filter(Boolean),
    [screenMap, selectedIds]
  )

  const selectedAreas = useMemo(
    () => uniqueStrings(selectedScreens.map((screen) => screen.area)),
    [selectedScreens]
  )

  const resendRemainingSeconds = useMemo(() => {
    if (!emailVerification.resendReadyAt) return 0
    return Math.max(0, Math.ceil((emailVerification.resendReadyAt - otpTick) / 1000))
  }, [emailVerification.resendReadyAt, otpTick])

  const otpExpiryRemainingSeconds = useMemo(() => {
    if (!emailVerification.expiresAt) return 0
    return Math.max(0, Math.ceil((emailVerification.expiresAt - otpTick) / 1000))
  }, [emailVerification.expiresAt, otpTick])

  const isEmailVerified = Boolean(
    normalizedEmail
    && emailVerification.status === 'verified'
    && emailVerification.targetEmail === normalizedEmail
    && emailVerification.verificationToken
  )
  const showEmailVerificationCard = Boolean(form.email.trim())
  const otpEntryOpen = Boolean(emailVerification.expiresAt) && otpExpiryRemainingSeconds > 0
  const verificationBadge = isEmailVerified
    ? 'Verified'
    : emailVerification.status === 'sending'
      ? 'Sending OTP...'
      : !emailIsValid
        ? 'Enter a valid email'
        : otpEntryOpen
          ? `OTP expires in ${formatCountdown(otpExpiryRemainingSeconds)}`
          : resendRemainingSeconds > 0
            ? `Resend in ${formatCountdown(resendRemainingSeconds)}`
            : emailVerification.status === 'error'
              ? 'Could not send OTP'
              : 'Ready to send'
  const verificationDescription = isEmailVerified
    ? 'Your email has been verified. The WhatsApp quote button is now unlocked.'
    : !emailIsValid
      ? 'Type a valid email address and we will automatically send a 6-digit OTP here.'
      : emailVerification.status === 'sending'
        ? `Sending a verification code to ${normalizedEmail}. This usually takes a few seconds.`
        : emailVerification.message
          || (otpEntryOpen
            ? `Enter the 6-digit code sent to ${normalizedEmail}. The code stays valid for 2 minutes.`
            : `We will send a fresh code to ${normalizedEmail} as soon as you request it.`)

  useEffect(() => {
    if (!emailVerification.expiresAt || otpExpiryRemainingSeconds > 0) return

    setEmailVerification((current) => {
      if (!current.expiresAt || current.status === 'verified') return current
      if (Date.now() < current.expiresAt) return current
      return {
        ...current,
        status: 'expired',
        message: 'This OTP expired. Resend a fresh code to continue.',
      }
    })
  }, [emailVerification.expiresAt, otpExpiryRemainingSeconds])

  const filteredScreens = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    const selectedSet = new Set(selectedIds)

    return screens
      .filter((screen) => {
        if (!normalizedSearch) return true
        const haystack = `${screen.name} ${screen.area} ${screen.description || ''}`.toLowerCase()
        return haystack.includes(normalizedSearch)
      })
      .sort((a, b) => {
        const aSelected = selectedSet.has(a.id) ? 1 : 0
        const bSelected = selectedSet.has(b.id) ? 1 : 0
        if (aSelected !== bSelected) return bSelected - aSelected
        return a.id - b.id
      })
  }, [screens, search, selectedIds])

  const totalPrice = useMemo(() => (
    selectedScreens.reduce(
      (sum, screen) => sum + getScreenUnitPrice(screen, form.billing_cycle) * (slotQuantities[screen.id] || 1),
      0
    )
  ), [form.billing_cycle, slotQuantities, selectedScreens])

  const whatsappNumber = useMemo(() => (
    String(publicSettings.whatsapp_number || publicSettings.config.general_contact_phone || '').replace(/[^\d]/g, '')
  ), [publicSettings])

  const canOpenWhatsapp = Boolean(publicSettings.config.whatsapp_enable && whatsappNumber)

  const toggleLocation = (screenId) => {
    setBookingInfo(null)
    setSelectedIds((current) => (
      current.includes(screenId)
        ? current.filter((id) => id !== screenId)
        : [...current, screenId]
    ))
    if (!selectedIds.includes(screenId)) {
       setSlotQuantities((prev) => ({ ...prev, [screenId]: 1 }))
    } else {
       setSlotQuantities((prev) => {
         const next = { ...prev }
         delete next[screenId]
         return next
       })
    }
  }

  const handleSlotQuantityChange = (screenId, quantity) => {
    setSlotQuantities((prev) => ({ ...prev, [screenId]: quantity }))
  }

  const handleContinueToDetails = () => {
    if (!selectedIds.length) {
      toast.error('Select at least one location')
      return
    }

    setStage('details')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBackToSelection = () => {
    setStage('select')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePolish = async () => {
    if (!form.ad_description.trim()) {
      toast.error('Write an ad description first')
      return
    }

    setPolishing(true)
    try {
      const res = await api.post('/ai/polish', { text: form.ad_description })
      update('polished_description', res.data.polished)
      toast.success('Ad copy polished by AI')
    } catch {
      toast.error('AI polish failed')
    } finally {
      setPolishing(false)
    }
  }

  const handleBooking = async (event) => {
    event.preventDefault()

    if (!selectedIds.length) {
      toast.error('Select at least one location')
      return
    }

    if (!normalizedEmail || !emailIsValid) {
      toast.error('Enter a valid email and verify it to continue.')
      return
    }

    if (!isEmailVerified || !emailVerification.verificationToken) {
      toast.error('Verify your email before requesting an instant quote.')
      return
    }

    setSubmitting(true)

    try {
      const payload = {
        screen_id: selectedIds[0],
        screen_ids: selectedIds,
        client_name: form.client_name.trim(),
        company: form.company || null,
        email: normalizedEmail,
        email_verification_token: emailVerification.verificationToken,
        phone: form.phone || null,
        budget: form.budget ? Number(form.budget) : null,
        ad_description: form.ad_description || null,
        polished_description: form.polished_description || null,
        billing_cycle: form.billing_cycle,
        screen_slots: slotQuantities,
        slot_quantity: 1,
      }

      const res = await api.post('/bookings', payload)
      const booking = res.data
      const bookingId = `OLRAC${booking.id}`
      const template = publicSettings.config.whatsapp_template || DEFAULT_WHATSAPP_TEMPLATE
      const locationLabel = selectedScreens.map((screen) => screen.name).join(', ') || 'N/A'
      const areaLabel = selectedAreas.join(', ') || 'N/A'

      let whatsappUrl = ''
      if (canOpenWhatsapp) {
        const templateMessage = fillWhatsAppTemplate(template, {
          booking_id: bookingId,
          name: form.client_name || 'N/A',
          company: form.company || 'N/A',
          email: form.email || 'N/A',
          phone: form.phone || 'N/A',
          location: locationLabel,
          area: areaLabel,
          billing: getBillingLabel(form.billing_cycle),
          slots: 'Custom configuration per screen',
          budget: form.budget ? `Rs ${Number(form.budget).toLocaleString('en-IN')}` : 'Not specified',
          total_price: `Rs ${totalPrice.toLocaleString('en-IN')}`,
          description: form.polished_description || form.ad_description || 'Not provided',
        })

        whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(templateMessage)}`
      }

      setBookingInfo({
        id: booking.id,
        whatsappUrl,
      })
      setEmailVerification(createInitialEmailVerification(normalizedEmail))

      if (whatsappUrl) {
        toast.success('Quotation created. Opening WhatsApp...')
        window.location.href = whatsappUrl
      } else {
        toast.success('Quotation request created and shared with admin')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Booking failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <section className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="page-container flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                if (stage === 'details') {
                  setStage('select')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                } else {
                  navigate(-1)
                }
              }}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Configure Quotation</h1>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <StepPill 
              number="1" 
              label="Locations" 
              active={stage === 'select'} 
              complete={stage === 'details'} 
              onClick={() => {
                setStage('select')
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
            <div className="h-px w-8 bg-slate-200"></div>
            <StepPill 
              number="2" 
              label="Campaign Details" 
              active={stage === 'details'} 
              complete={false} 
            />
          </div>
        </div>
      </section>

      {/* Stage 1: Select Locations */}
      {stage === 'select' && (
        <section className="page-container mt-8">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Screen Inventory</h2>
              <p className="text-sm text-slate-500">Pick the locations you want to include in your quotation.</p>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search screens by area or name..."
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
            <div className="lg:col-span-8 xl:col-span-9">
              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div key={item} className="h-64 animate-pulse rounded-xl bg-slate-200" />
                  ))}
                </div>
              ) : filteredScreens.length ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredScreens.map((screen) => (
                    <LocationCard
                      key={screen.id}
                      screen={screen}
                      selected={selectedIds.includes(screen.id)}
                      billingCycle={form.billing_cycle}
                      onToggle={toggleLocation}
                      currentSlots={slotQuantities[screen.id] || 1}
                      onSlotsChange={handleSlotQuantityChange}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center bg-white">
                  <Monitor className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm font-medium text-slate-900">No inventory matches your search.</p>
                  <p className="text-xs text-slate-500">Try adjusting your filters or area names.</p>
                </div>
              )}
            </div>

            {/* Sidebar for Selection */}
            <div className="lg:col-span-4 xl:col-span-3">
              <div className="sticky top-24 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-slate-900">Selection Summary</h3>
                <div className="mt-4 flex items-center justify-between border-b border-slate-100 pb-4">
                  <p className="text-sm text-slate-600">Screens Selected</p>
                  <p className="font-bold text-slate-900">{selectedScreens.length}</p>
                </div>
                
                {selectedScreens.length > 0 ? (
                  <div className="mt-4 max-h-[300px] space-y-2 overflow-y-auto pr-1">
                    {selectedScreens.map(screen => (
                      <div key={screen.id} className="flex items-start justify-between gap-2 rounded-md bg-slate-50 p-2.5 text-sm">
                        <span className="truncate flex-1 font-medium text-slate-700">{screen.name}</span>
                        <button
                          onClick={() => toggleLocation(screen.id)}
                          className="shrink-0 p-0.5 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-md bg-slate-50 p-4 text-center text-sm text-slate-500 border border-slate-100">
                    No screens selected yet. Add items to see your summary.
                  </div>
                )}

                <div className="mt-6 pt-5 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-5">
                    <span className="text-sm font-medium text-slate-600">Base Estimate</span>
                    <span className="font-bold text-slate-900">Rs {totalPrice.toLocaleString('en-IN')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleContinueToDetails}
                    disabled={selectedScreens.length === 0}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Proceed to Details
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Stage 2: Details */}
      {stage === 'details' && (
        <section className="page-container mt-8">
           <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
             {/* Main Form Left Column */}
             <div className="lg:col-span-8">
               <form id="booking-form" onSubmit={handleBooking} className="space-y-6">
                 {/* Email & OTP Section */}
                 <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                   <div className="flex items-center gap-2.5 border-b border-slate-100 pb-5">
                     <ShieldCheck className="h-5 w-5 text-slate-400" />
                     <h3 className="text-lg font-bold text-slate-900">Contact & Verification</h3>
                   </div>
                   
                   <div className="mt-6 grid gap-5 sm:grid-cols-2">
                     <div>
                       <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">Client Name *</label>
                       <input
                         type="text"
                         value={form.client_name}
                         onChange={(e) => update('client_name', e.target.value)}
                         required
                         className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                       />
                     </div>
                     <div>
                       <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">Company (Optional)</label>
                       <input
                         type="text"
                         value={form.company}
                         onChange={(e) => update('company', e.target.value)}
                         className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                       />
                     </div>
                     <div>
                       <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">Phone Number *</label>
                       <input
                         type="tel"
                         value={form.phone}
                         onChange={(e) => update('phone', e.target.value)}
                         required
                         className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                       />
                     </div>
                     <div>
                       <label className="mb-1.5 block text-xs font-semibold uppercase text-slate-500">Email Address *</label>
                       <div className="relative">
                         <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                         <input
                           type="email"
                           value={form.email}
                           onChange={handleEmailChange}
                           required
                           className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3.5 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                         />
                       </div>
                     </div>
                   </div>

                   {/* OTP Box */}
                   {showEmailVerificationCard && !isEmailVerified && (
                     <div className="mt-6 rounded-lg bg-slate-50 p-5 ring-1 ring-inset ring-slate-200">
                       <h4 className="text-sm font-semibold text-slate-900">Email Authentication Required</h4>
                       <p className="mt-1 text-xs text-slate-500">{verificationDescription}</p>
                       
                       <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                         <input
                           type="text"
                           inputMode="numeric"
                           maxLength={OTP_LENGTH}
                           value={emailVerification.code}
                           onChange={handleOtpChange}
                           placeholder="Enter 6-digit OTP"
                           disabled={!otpEntryOpen || emailVerification.status === 'verifying'}
                           className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-center text-lg font-bold tracking-widest outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-100 sm:w-56 sm:text-left"
                         />
                         <button
                           type="button"
                           onClick={handleVerifyOtp}
                           disabled={
                             !otpEntryOpen ||
                             emailVerification.status === 'sending' ||
                             emailVerification.status === 'verifying' ||
                             emailVerification.code.trim().length !== OTP_LENGTH
                           }
                           className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                         >
                           {emailVerification.status === 'verifying' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                           Verify OTP
                         </button>
                         <button
                           type="button"
                           onClick={() => requestEmailOtp({ manual: true })}
                           disabled={!emailIsValid || emailVerification.status === 'sending' || resendRemainingSeconds > 0}
                           className="flex shrink-0 items-center justify-center text-sm font-medium text-primary-600 transition hover:text-primary-700 disabled:cursor-not-allowed disabled:text-slate-400 sm:ml-auto"
                         >
                           {emailVerification.status === 'sending'
                             ? 'Sending...'
                             : resendRemainingSeconds > 0
                               ? `Resend in ${formatCountdown(resendRemainingSeconds)}`
                               : 'Resend OTP'}
                         </button>
                       </div>
                     </div>
                   )}
                   {isEmailVerified && (
                     <div className="mt-6 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3.5 text-sm font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
                       <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                       Email successfully verified.
                     </div>
                   )}
                 </div>

                 {/* Configuration Section */}
                 <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                   <div className="flex items-center gap-2.5 border-b border-slate-100 pb-5">
                     <Monitor className="h-5 w-5 text-slate-400" />
                     <h3 className="text-lg font-bold text-slate-900">Campaign Configuration</h3>
                   </div>
                   
                   <div className="mt-6 mb-6">
                      <label className="mb-3 block text-xs font-semibold uppercase text-slate-500">Billing Interval</label>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {SCREEN_PRICING_TIERS.map((tier) => (
                          <button
                            key={tier.key}
                            type="button"
                            onClick={() => update('billing_cycle', tier.key)}
                            className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all duration-200 ${
                              form.billing_cycle === tier.key
                                ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span className={`text-xs font-bold uppercase tracking-wider ${form.billing_cycle === tier.key ? 'text-primary-700' : 'text-slate-500'}`}>
                              {tier.shortLabel}
                            </span>
                            <span className={`mt-1 text-[11px] ${form.billing_cycle === tier.key ? 'text-primary-600' : 'text-slate-400'}`}>
                              {tier.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                 </div>

                 {/* Creative Section */}
                 <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                   <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                     <div className="flex items-center gap-2.5">
                       <MessageCircle className="h-5 w-5 text-slate-400" />
                       <h3 className="text-lg font-bold text-slate-900">Creative Brief</h3>
                     </div>
                     <button
                       type="button"
                       onClick={handlePolish}
                       disabled={polishing || !form.ad_description.trim()}
                       className="inline-flex items-center gap-1.5 rounded bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                     >
                       {polishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                       AI Polish
                     </button>
                   </div>
                   
                   <div className="mt-6">
                     <textarea
                       rows={4}
                       className="w-full rounded-lg border border-slate-300 p-4 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                       value={form.ad_description}
                       onChange={(event) => update('ad_description', event.target.value)}
                       placeholder="Detail your campaign focus, offer terms, or visual styling..."
                     />
                     
                     {form.polished_description && (
                       <div className="mt-4 rounded-lg bg-slate-50 p-5 ring-1 ring-inset ring-slate-200">
                         <div className="flex items-center justify-between mb-2">
                           <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">AI Rewritten Copy</p>
                           <button
                             type="button"
                             onClick={() => {
                               update('ad_description', form.polished_description)
                               toast.success('Applied AI polished text')
                             }}
                             className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                           >
                             Use this version
                           </button>
                         </div>
                         <p className="text-sm text-slate-700 leading-relaxed">{form.polished_description}</p>
                       </div>
                     )}
                   </div>
                 </div>
               </form>
             </div>

             {/* Sticky Right Sidebar (Summary) */}
             <div className="lg:col-span-4">
               <div className="sticky top-24 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                 <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
                   <h3 className="font-bold text-slate-900">Order Summary</h3>
                   <button 
                     onClick={handleBackToSelection}
                     className="text-xs font-semibold text-primary-600 hover:underline"
                   >
                     Edit Locations
                   </button>
                 </div>
                 
                 <div className="p-6">
                   <div className="flex items-center justify-between mb-5">
                      <p className="text-slate-600">Total Selection</p>
                      <p className="font-semibold text-slate-900">{selectedScreens.length} location{selectedScreens.length > 1 ? 's' : ''}</p>
                    </div>
                   
                   <div className="max-h-48 overflow-y-auto mb-5 pl-2 pr-2 mt-2 text-xs text-slate-600 space-y-1.5 py-2 border border-slate-100 bg-slate-50 rounded-lg">
                     {selectedScreens.map((s, idx) => (
                       <div key={idx} className="truncate select-none">&bull; {s.name}</div>
                     ))}
                   </div>

                   <div className="flex justify-between items-center mb-3">
                     <span className="text-sm font-medium text-slate-500">Billing Cycle</span>
                     <span className="font-bold text-slate-900">{getBillingLabel(form.billing_cycle)}</span>
                   </div>

                   {bookingInfo && bookingInfo.whatsappUrl && (
                     <div className="mb-5 rounded-lg bg-emerald-50 p-3 ring-1 ring-inset ring-emerald-200">
                       <p className="text-xs font-medium text-emerald-800 text-center">Quote #{bookingInfo.id} created.</p>
                       <a href={bookingInfo.whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block text-center text-xs font-bold text-emerald-700 hover:underline">
                         Open WhatsApp
                       </a>
                     </div>
                   )}

                   <div className="pt-5 border-t border-slate-100 flex justify-between items-end">
                     <span className="text-sm font-bold text-slate-900">Estimated Total</span>
                     <span className="text-2xl font-black text-slate-900">Rs {totalPrice.toLocaleString('en-IN')}</span>
                   </div>
                 </div>

                 <div className="p-6 bg-slate-50 border-t border-slate-100">
                   <button
                     form="booking-form"
                     type="submit"
                     disabled={submitting || !selectedScreens.length || !isEmailVerified}
                     className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                   >
                     {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : canOpenWhatsapp ? <MessageCircle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                     {submitting
                       ? 'Processing...'
                       : !isEmailVerified
                         ? 'Verify Email to Proceed'
                         : canOpenWhatsapp
                           ? 'Send Quote via WhatsApp'
                           : 'Submit Quotation'}
                   </button>
                   
                   {!isEmailVerified && (
                     <p className="mt-3 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
                       <ShieldCheck className="h-3.5 w-3.5" />
                       OTP required to submit
                     </p>
                   )}
                 </div>
               </div>
             </div>
           </div>
        </section>
      )}
    </div>
  )
}
