import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Home,
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
  Building2,
} from 'lucide-react'

import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

import api from '../api/axios'
import { usePublicSettings } from '../context/PublicSettingsContext'

import { getSelectedBookingDuration, normalizeBookingDurations, resolveDefaultBookingDurationId } from '../utils/bookingDurations'
import { track } from '../utils/analytics'
import { DEFAULT_WHATSAPP_TEMPLATE, fillWhatsAppTemplate } from '../utils/whatsappTemplate'
import { pageTransition } from '../utils/animations'

const EASE_OUT = [0.0, 0.0, 0.2, 1.0]

function getAvailableSlots(screen) {
  return Number(screen?.total_slots || 0)
}

function getCampaignScreenUnitPrice(screen, duration) {
  if (!screen || !duration) return 0
  const rate = Number(screen.base_price) || 0
  if (screen.price_unit === 'hour') {
    return rate * Number(duration.hours || 0)
  }
  if (screen.price_unit === 'month') {
    // Convert duration days to months (30 days = 1 month)
    const months = Math.max(1, Math.round((duration.days || 0) / 30))
    return rate * months
  }
  // Default: day-based pricing
  return rate * Number(duration.days || 1)
}

function getInventoryScreenUnitPrice(screen) {
  return Number(screen?.base_price || 0)
}

function getScreenPriceUnitLabel(screen) {
  const unit = String(screen?.price_unit || 'day').trim().toLowerCase()
  if (unit === 'hour') return 'hour'
  if (unit === 'month') return 'month'
  return 'day'
}

function formatSlotLabel(count) {
  return `${count} Slot${count > 1 ? 's' : ''}`
}

function uniqueStrings(values) {
  return values.filter((v, i) => v && values.indexOf(v) === i)
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const OTP_LENGTH = 6

function isValidEmail(v) { return EMAIL_REGEX.test(String(v || '').trim()) }

function isValidPhone(v) {
  if (!v) return false
  if (!isValidPhoneNumber(v)) return false
  const digits = v.replace(/\D/g, '')
  if (/^(\d)\1{7,}$/.test(digits)) return false
  if (digits.endsWith('1234567890') || digits.endsWith('9876543210')) return false
  return true
}

function formatCountdown(totalSeconds) {
  const s = Math.max(0, totalSeconds)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function createInitialEmailVerification(targetEmail = '') {
  return { status: 'idle', targetEmail, code: '', verificationToken: '', resendReadyAt: null, expiresAt: null, message: '' }
}

function parseLocationIds(searchParams) {
  return String(searchParams.get('locations') || '')
    .split(',')
    .map(v => Number(v.trim()))
    .filter((v, i, arr) => Number.isInteger(v) && v > 0 && arr.indexOf(v) === i)
}

function StepPill({ number, label, active, complete, onClick }) {
  const Component = onClick && complete ? 'button' : 'div'
  return (
    <Component
      onClick={onClick && complete ? onClick : undefined}
      className={`inline-flex items-center gap-2.5 rounded-full border px-5 py-2.5 text-sm font-semibold transition-all ${
        complete
          ? 'border-violet-600 bg-violet-600 text-white cursor-pointer hover:bg-violet-700'
          : active
          ? 'border-violet-200 bg-violet-50 text-violet-700'
          : 'border-slate-200 bg-white text-slate-400'
      }`}
    >
      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-black ${
        complete ? 'bg-white/20 text-white' : active ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-400'
      }`}>
        {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : number}
      </span>
      {label}
    </Component>
  )
}

function LocationCard({ screen, selected, onToggle, onViewLocation, currentSlots = 1, onSlotsChange }) {
  const availableSlots = getAvailableSlots(screen)
  const slotCount = Math.max(1, Number(currentSlots) || 1)
  const unitPrice = getInventoryScreenUnitPrice(screen)
  const priceUnitLabel = getScreenPriceUnitLabel(screen)
  const displayPrice = selected ? unitPrice * slotCount : unitPrice

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`group relative flex flex-col overflow-hidden rounded-2xl bg-white transition-all duration-200 ${
        selected
          ? 'ring-2 ring-violet-500 shadow-[0_8px_32px_rgba(124,58,237,0.15)]'
          : 'border border-slate-200 hover:border-violet-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]'
      }`}
    >
      <button type="button" onClick={() => onToggle(screen.id)} className="w-full text-left">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          {screen.image_url ? (
            <img src={screen.image_url} alt={screen.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
              <Monitor className="h-10 w-10 text-slate-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Slots badge */}
          <div className="absolute left-3 top-3">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold backdrop-blur-sm ${
              availableSlots > 0 ? 'bg-white/90 text-slate-800' : 'bg-red-500/90 text-white'
            }`}>
              {availableSlots > 0 ? `${availableSlots} slots` : 'Fully Booked'}
            </span>
          </div>

          {/* Select badge */}
          <div className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full transition-all ${
            selected ? 'bg-violet-600 shadow-[0_0_12px_rgba(124,58,237,0.5)]' : 'bg-white/90'
          }`}>
            <AnimatePresence mode="wait">
              {selected
                ? <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </motion.span>
                : <motion.span key="empty" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                    className="h-3 w-3 rounded-full border-2 border-slate-400" />
              }
            </AnimatePresence>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className={`text-sm font-bold line-clamp-1 transition-colors ${selected ? 'text-violet-700' : 'text-slate-900 group-hover:text-violet-700'}`}>
            {screen.name}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
            <MapPin className="h-3 w-3 shrink-0 text-violet-400" />
            <span className="truncate">{screen.area}</span>
          </p>
          {screen.footfall && (
            <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-slate-400">
              <Users className="h-3 w-3" />{screen.footfall}
            </p>
          )}
        </div>
      </button>

      {/* Price + slot selector — all white */}
      <div className="mx-4 mb-3 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {selected ? `${formatSlotLabel(slotCount)} Selected` : `Per ${priceUnitLabel}`}
          </p>
          <p className="text-sm font-black text-slate-900">
            Rs {displayPrice.toLocaleString('en-IN')}
            <span className="ml-1 text-xs font-semibold capitalize text-slate-400">/ {priceUnitLabel}</span>
          </p>
        </div>
        {selected && availableSlots > 0 && (
          <select
            value={slotCount}
            onChange={e => onSlotsChange(screen.id, Number(e.target.value))}
            onClick={e => e.stopPropagation()}
            className="rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-6 text-xs font-semibold text-slate-700 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          >
            {Array.from({ length: Math.min(availableSlots, 50) }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{formatSlotLabel(n)}</option>
            ))}
          </select>
        )}
      </div>

      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onViewLocation(screen.id)
          }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 transition hover:text-violet-700"
        >
          View Location
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

export default function Booking() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { settings: publicSettings } = usePublicSettings()

  const [stage, setStage] = useState(() => { try { const s = sessionStorage.getItem('booking_state'); return s ? JSON.parse(s).stage || 'select' : 'select' } catch { return 'select' } })
  const [screens, setScreens] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitAction, setSubmitAction] = useState('whatsapp')
  const [polishing, setPolishing] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState(() => { try { const s = sessionStorage.getItem('booking_state'); return s ? JSON.parse(s).selectedIds || [] : [] } catch { return [] } })
  const [bookingInfo, setBookingInfo] = useState(null)
  const defaultForm = { budget: '', ad_description: '', polished_description: '', duration_id: '', client_name: '', company: '', email: '', phone: '' }
  const [form, setForm] = useState(() => { try { const s = sessionStorage.getItem('booking_state'); return s ? JSON.parse(s).form || defaultForm : defaultForm } catch { return defaultForm } })
  const [slotQuantities, setSlotQuantities] = useState(() => { try { const s = sessionStorage.getItem('booking_state'); return s ? JSON.parse(s).slotQuantities || {} : {} } catch { return {} } })
  const [emailVerification, setEmailVerification] = useState(() => {
    try { 
      const s = sessionStorage.getItem('booking_state'); 
      const ev = s ? JSON.parse(s).emailVerification : null;
      if (ev) {
        if (ev.expiresAt && Date.now() >= ev.expiresAt) { ev.status = 'expired'; ev.message = 'OTP expired. Resend a fresh code.'; }
        return ev;
      }
      return createInitialEmailVerification() 
    } catch { return createInitialEmailVerification() }
  })
  const [mobileSelectionOpen, setMobileSelectionOpen] = useState(false)
  const [mobileSlotInfoOpen, setMobileSlotInfoOpen] = useState(false)
  
  useEffect(() => {
    if (stage === 'confirmed') {
      sessionStorage.removeItem('booking_state')
      return
    }
    sessionStorage.setItem('booking_state', JSON.stringify({ stage, selectedIds, form, slotQuantities, emailVerification }))
  }, [stage, selectedIds, form, slotQuantities, emailVerification])
  const [otpTick, setOtpTick] = useState(Date.now())
  const latestEmailRef = useRef('')

  const normalizedEmail = form.email.trim().toLowerCase()
  const emailIsValid = isValidEmail(normalizedEmail)

  useEffect(() => {
    track('booking_started')
    api.get('/screens')
      .then(res => setScreens(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error('Failed to load locations'))
      .finally(() => setLoading(false))
  }, [])

  const availableDurations = useMemo(
    () => normalizeBookingDurations(publicSettings?.config?.booking_durations || []),
    [publicSettings]
  )
  const defaultDurationId = useMemo(
    () => resolveDefaultBookingDurationId(publicSettings?.config || {}),
    [publicSettings]
  )

  useEffect(() => {
    if (!availableDurations.length) return

    const selectedExists = availableDurations.some((duration) => duration.id === form.duration_id)
    const nextDurationId = selectedExists
      ? form.duration_id
      : (defaultDurationId || availableDurations[0]?.id || '')

    if (nextDurationId && nextDurationId !== form.duration_id) {
      update('duration_id', nextDurationId)
    }
  }, [availableDurations, defaultDurationId, form.duration_id])

  const selectedDuration = useMemo(() => {
    return getSelectedBookingDuration(publicSettings?.config || {}, form.duration_id)
  }, [publicSettings, form.duration_id])

  useEffect(() => {
    if (loading) return
    if (!screens.length) { setSelectedIds([]); return }
    const screenIds = new Set(screens.map(s => s.id))
    const requestedIds = parseLocationIds(searchParams).filter(id => screenIds.has(id))
    setSelectedIds(current => {
      // If URL specifies locations (e.g. from LocationDetail), always use those
      if (requestedIds.length > 0) return requestedIds
      // No URL params — preserve valid selections from sessionStorage (resume draft)
      const valid = current.filter(id => screenIds.has(id))
      return valid
    })
  }, [loading, screens, searchParams])

  useEffect(() => { latestEmailRef.current = normalizedEmail }, [normalizedEmail])

  // Auto-send OTP effect removed. User must click "Send OTP" button.

  useEffect(() => {
    if (loading) return
    if (!selectedIds.length && stage === 'details') setStage('select')
    // Guard: if confirmed stage loaded from stale storage (no bookingInfo), reset to select
    if (stage === 'confirmed' && !bookingInfo) setStage('select')
  }, [loading, selectedIds, stage, bookingInfo])

  // Auto-redirect home after confirmation; cleanup cancels it if user navigates away first
  useEffect(() => {
    if (stage !== 'confirmed') return
    const timer = setTimeout(() => navigate('/'), 4000)
    return () => clearTimeout(timer)
  }, [stage, navigate])

  useEffect(() => {
    if (!emailVerification.resendReadyAt && !emailVerification.expiresAt) return
    const id = window.setInterval(() => setOtpTick(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [emailVerification.expiresAt, emailVerification.resendReadyAt])

  const update = (key, value) => setForm(c => ({ ...c, [key]: value }))

  const handleEmailChange = (e) => {
    const next = e.target.value
    const nextEmail = next.trim().toLowerCase()
    update('email', next)
    setBookingInfo(null)
    setEmailVerification(c => {
      if (!nextEmail) return createInitialEmailVerification()
      if (nextEmail === c.targetEmail) return c
      return createInitialEmailVerification(nextEmail)
    })
  }

  const requestEmailOtp = async ({ manual = false } = {}) => {
    const targetEmail = form.email.trim().toLowerCase()
    if (!targetEmail) { setEmailVerification(createInitialEmailVerification()); return }
    if (!isValidEmail(targetEmail)) {
      setEmailVerification({ ...createInitialEmailVerification(targetEmail), status: 'invalid', message: 'Enter a valid email address.' })
      return
    }
    if (emailVerification.status === 'verified' && emailVerification.targetEmail === targetEmail) return
    if (emailVerification.status === 'sending' && emailVerification.targetEmail === targetEmail) return
    setEmailVerification(c => ({ ...createInitialEmailVerification(targetEmail), code: c.targetEmail === targetEmail ? c.code : '', status: 'sending', message: 'Sending OTP to your email...' }))
    try {
      const res = await api.post('/bookings/otp/send', { email: targetEmail })
      if (latestEmailRef.current !== targetEmail) return
      const now = Date.now()
      setEmailVerification({ status: 'sent', targetEmail, code: '', verificationToken: '', resendReadyAt: now + Number(res.data.resend_in_seconds || 0) * 1000, expiresAt: now + Number(res.data.expires_in_seconds || 0) * 1000, message: res.data.detail || 'Code sent.' })
      toast.success(res.data.detail || 'Verification code sent.')
    } catch (err) {
      if (latestEmailRef.current !== targetEmail) return
      const resData = err.response?.data?.detail
      const detail = typeof resData === 'string' ? resData : (resData?.message || 'Failed to send code.')
      const retryAfter = resData?.retry_after_seconds
      
      setEmailVerification(c => ({
        ...c,
        status: err.response?.status === 429 ? c.status : 'error',
        message: detail,
        resendReadyAt: retryAfter ? Date.now() + retryAfter * 1000 : c.resendReadyAt
      }))
      toast.error(detail)
    }
  }

  const handleOtpChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH)
    setEmailVerification(c => ({ ...c, code: v, message: c.status === 'invalid' ? '' : c.message }))
  }

  const handleVerifyOtp = async () => {
    const targetEmail = form.email.trim().toLowerCase()
    const otp = emailVerification.code.trim()
    if (!isValidEmail(targetEmail)) { toast.error('Enter a valid email first.'); return }
    if (otp.length !== OTP_LENGTH) { toast.error('Enter the 6-digit OTP.'); return }
    setEmailVerification(c => ({ ...c, status: 'verifying', message: 'Verifying...' }))
    try {
      const res = await api.post('/bookings/otp/verify', { email: targetEmail, otp })
      if (latestEmailRef.current !== targetEmail) return
      setEmailVerification({ status: 'verified', targetEmail, code: '', verificationToken: res.data.verification_token, resendReadyAt: null, expiresAt: null, message: res.data.detail || 'Verified.' })
      toast.success(res.data.detail || 'Email verified successfully.')
    } catch (err) {
      if (latestEmailRef.current !== targetEmail) return
      const detail = err.response?.data?.detail || 'OTP verification failed.'
      setEmailVerification(c => ({ ...c, status: c.expiresAt && Date.now() >= c.expiresAt ? 'expired' : 'sent', verificationToken: '', message: detail }))
      toast.error(detail)
    }
  }

  const screenMap = useMemo(() => new Map(screens.map(s => [s.id, s])), [screens])
  const selectedScreens = useMemo(() => selectedIds.map(id => screenMap.get(id)).filter(Boolean), [screenMap, selectedIds])
  const selectedAreas = useMemo(() => uniqueStrings(selectedScreens.map(s => s.area)), [selectedScreens])

  const resendRemainingSeconds = useMemo(() => {
    if (!emailVerification.resendReadyAt) return 0
    return Math.max(0, Math.ceil((emailVerification.resendReadyAt - otpTick) / 1000))
  }, [emailVerification.resendReadyAt, otpTick])

  const otpExpiryRemainingSeconds = useMemo(() => {
    if (!emailVerification.expiresAt) return 0
    return Math.max(0, Math.ceil((emailVerification.expiresAt - otpTick) / 1000))
  }, [emailVerification.expiresAt, otpTick])

  const otpRequired = publicSettings.config.security_otp_booking_enable !== false
  const isEmailVerified = !otpRequired || Boolean(normalizedEmail && emailVerification.status === 'verified' && emailVerification.targetEmail === normalizedEmail && emailVerification.verificationToken)
  const showEmailVerificationCard = Boolean(form.email.trim())
  const otpEntryOpen = Boolean(emailVerification.expiresAt) && otpExpiryRemainingSeconds > 0

  const verificationDescription = isEmailVerified
    ? 'Your email has been verified.'
    : !emailIsValid
    ? 'Enter a valid email and we will automatically send a 6-digit OTP.'
    : emailVerification.status === 'sending'
    ? `Sending code to ${normalizedEmail}...`
    : emailVerification.message || (otpEntryOpen ? `Enter the 6-digit code sent to ${normalizedEmail}.` : `We will send a fresh code to ${normalizedEmail}.`)

  useEffect(() => {
    if (!emailVerification.expiresAt || otpExpiryRemainingSeconds > 0) return
    setEmailVerification(c => {
      if (!c.expiresAt || c.status === 'verified' || Date.now() < c.expiresAt) return c
      return { ...c, status: 'expired', message: 'OTP expired. Resend a fresh code.' }
    })
  }, [emailVerification.expiresAt, otpExpiryRemainingSeconds])

  const filteredScreens = useMemo(() => {
    const q = search.trim().toLowerCase()
    return screens
      .filter(s => !q || `${s.name} ${s.area} ${s.description || ''}`.toLowerCase().includes(q))
  }, [screens, search])

  const inventoryTotalPrice = useMemo(
    () => selectedScreens.reduce((sum, screen) => sum + (getInventoryScreenUnitPrice(screen) * (slotQuantities[screen.id] || 1)), 0),
    [slotQuantities, selectedScreens]
  )
  const totalPrice = useMemo(
    () => selectedScreens.reduce((sum, screen) => sum + getCampaignScreenUnitPrice(screen, selectedDuration) * (slotQuantities[screen.id] || 1), 0),
    [selectedDuration, slotQuantities, selectedScreens]
  )

  const whatsappNumber = useMemo(() => String(publicSettings.whatsapp_number || publicSettings.config.general_contact_phone || '').replace(/[^\d]/g, ''), [publicSettings])
  const canOpenWhatsapp = Boolean(publicSettings.config.whatsapp_enable && whatsappNumber && publicSettings.config.booking_method_whatsapp !== false)
  const canSendEmail = publicSettings.config.booking_method_email !== false

  const toggleLocation = (screenId) => {
    setBookingInfo(null)
    const willSelect = !selectedIds.includes(screenId)
    setSelectedIds(c => willSelect ? [...c, screenId] : c.filter(id => id !== screenId))
    if (willSelect) setSlotQuantities(p => ({ ...p, [screenId]: 1 }))
    else setSlotQuantities(p => { const n = { ...p }; delete n[screenId]; return n })
  }

  const handleSlotQuantityChange = (id, qty) => setSlotQuantities(p => ({ ...p, [id]: qty }))
  const handleContinueToDetails = () => {
    if (!selectedIds.length) { toast.error('Select at least one location'); return }
    setStage('details')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const handleBackToSelection = () => { setStage('select'); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const handlePolish = async () => {
    if (!form.client_name.trim() || !form.company.trim() || !form.email.trim() || !form.phone) {
      toast.error('Name, Company, Email, and Phone are required.')
      return false
    }
    if (!isValidPhone(form.phone)) {
      toast.error('Enter a valid phone number.')
      return false
    }
    if (!form.ad_description.trim()) { toast.error('Write an ad description first'); return }
    setPolishing(true)
    try {
      const res = await api.post('/ai/polish', { text: form.ad_description })
      update('polished_description', res.data.polished)
      toast.success('Ad copy polished by AI')
    } catch { toast.error('AI polish failed') }
    finally { setPolishing(false) }
  }

  const handleBooking = async (e) => {
    e.preventDefault()
    if (!selectedIds.length) { toast.error('Select at least one location'); return }
    if (!isValidPhone(form.phone)) { toast.error('Enter a valid phone number.'); return }
    if (!normalizedEmail || !emailIsValid) { toast.error('Enter a valid email.'); return }
    if (otpRequired && (!isEmailVerified || !emailVerification.verificationToken)) { toast.error('Verify your email before submitting.'); return }
    setSubmitting(true)
    try {
      const payload = {
        screen_id: selectedIds[0], screen_ids: selectedIds,
        client_name: form.client_name.trim(), company: form.company || null,
        email: normalizedEmail, email_verification_token: emailVerification.verificationToken,
        phone: form.phone || null, budget: form.budget ? Number(form.budget) : null,
        ad_description: form.ad_description || null, polished_description: form.polished_description || null,
        slot_quantity: 1, screen_slots: slotQuantities,
        duration_label: selectedDuration.label, duration_days: selectedDuration.days, duration_hours: selectedDuration.hours
      }
      const res = await api.post('/bookings', payload)
      const booking = res.data
      const bookingId = `OLRAC${booking.id}`
      track('booking_submitted', {
        booking_id: booking.id,
        screen_ids: selectedIds,
        duration_label: selectedDuration?.label,
        total_price: booking.total_price,
        screens_count: selectedIds.length,
      })
      const template = publicSettings.config.whatsapp_template || DEFAULT_WHATSAPP_TEMPLATE
      const locationLabel = selectedScreens.map(s => s.name).join(', ') || 'N/A'
      const areaLabel = selectedAreas.join(', ') || 'N/A'
      let whatsappUrl = ''
      
      // If client clicked WhatsApp button
      if (submitAction === 'whatsapp' && canOpenWhatsapp) {
        let msg = ''
        if (publicSettings.config.whatsapp_message_format === 'pdf_link') {
            const pdfUrl = `${window.location.origin}/api/bookings/${booking.id}/quotation/pdf?token=${booking.quotation_token}`
            msg = `Hello, I just generated a quotation on your website.\n\nHere is my quotation link: ${pdfUrl}\n\nCan we discuss this further?`
        } else {
            msg = fillWhatsAppTemplate(template, {
              booking_id: bookingId, name: form.client_name || 'N/A', company: form.company || 'N/A',
              email: form.email || 'N/A', phone: form.phone || 'N/A', location: locationLabel, area: areaLabel,
              billing: selectedDuration.label, slots: 'Custom configuration per screen',
              budget: form.budget ? `Rs ${Number(form.budget).toLocaleString('en-IN')}` : 'Not specified',
              total_price: `Rs ${(booking.quotation_data?.grand_total || totalPrice).toLocaleString('en-IN')}`,
              description: form.polished_description || form.ad_description || 'Not provided',
            })
        }
        whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(msg)}`
      }
      
      sessionStorage.removeItem('booking_state')
      setEmailVerification(createInitialEmailVerification(''))
      setForm(defaultForm)
      setSelectedIds([])
      setSlotQuantities({})
      setBookingInfo({ id: booking.id, whatsappUrl, submitAction })
      setStage('confirmed')

      if (submitAction === 'whatsapp' && whatsappUrl) {
        setTimeout(() => window.open(whatsappUrl, '_blank'), 600)
      }
    } catch (err) {
      const detail = err.response?.data?.detail || 'Booking failed. Please try again.'
      const isExpiredToken = typeof detail === 'string' && detail.toLowerCase().includes('verification expired')
      if (isExpiredToken) {
        setEmailVerification(createInitialEmailVerification(normalizedEmail))
        toast.error('Your email verification expired. Please verify your email again.')
      } else {
        toast.error(detail)
      }
    } finally { setSubmitting(false) }
  }

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-[#f8f8fb] pb-32 lg:pb-24"
    >
      {/* ── Sticky Header ─────────────────────────── */}
      <div className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-[68px]">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => stage === 'confirmed' ? navigate('/') : stage === 'details' ? handleBackToSelection() : navigate(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
            >
              {stage === 'confirmed' ? <Home className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            </button>
            <div>
              <p className="text-base font-black text-slate-900">
                {stage === 'confirmed' ? 'Booking Confirmed' : 'Configure Quotation'}
              </p>
              <p className="text-[11px] text-slate-400">
                {stage === 'confirmed' ? `OLRAC${bookingInfo?.id}` : stage === 'select' ? 'Step 1 of 2 — Choose Locations' : 'Step 2 of 2 — Campaign Details'}
              </p>
            </div>
          </div>

          {stage !== 'confirmed' && (
            <div className="hidden items-center gap-2 md:flex">
              <StepPill number="1" label="Locations" active={stage === 'select'} complete={stage === 'details'} onClick={handleBackToSelection} />
              <div className="h-px w-6 bg-slate-200" />
              <StepPill number="2" label="Campaign Details" active={stage === 'details'} complete={false} />
            </div>
          )}
        </div>
        <div className="border-t border-slate-100/80 md:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className={stage === 'details' ? 'text-violet-700' : 'text-slate-900'}>
                {stage === 'select' ? 'Locations' : 'Campaign Details'}
              </span>
              <span className="text-slate-400">{stage === 'select' ? '1 of 2' : '2 of 2'}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[linear-gradient(135deg,#7c3aed,#6366f1)] transition-all duration-300"
                style={{ width: stage === 'details' ? '100%' : '50%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Stage: Confirmed ──────────────────────── */}
      {stage === 'confirmed' && bookingInfo && (
        <motion.div
          key="confirmed"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex min-h-[calc(100vh-68px)] items-center justify-center px-4 py-16"
        >
          <div className="w-full max-w-md text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 border-2 border-emerald-200"
            >
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </motion.div>
            <h1 className="text-2xl font-black text-slate-900 mb-2">Booking Confirmed!</h1>
            <p className="text-slate-500 text-sm mb-1">Your quotation request has been received.</p>
            <p className="text-xs text-slate-400 mb-6">Booking ID: <span className="font-bold text-slate-600">OLRAC{bookingInfo.id}</span></p>

            <div className={`rounded-xl p-4 mb-6 ${bookingInfo.submitAction === 'whatsapp' ? 'bg-emerald-50 border border-emerald-200' : 'bg-violet-50 border border-violet-200'}`}>
              {bookingInfo.submitAction === 'whatsapp' ? (
                <>
                  <MessageCircle className="mx-auto h-5 w-5 text-emerald-600 mb-2" />
                  <p className="text-sm font-semibold text-emerald-800">WhatsApp is opening with your quotation details.</p>
                  <p className="text-xs text-emerald-600 mt-1">Our team will get back to you shortly.</p>
                  {bookingInfo.whatsappUrl && (
                    <a href={bookingInfo.whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs font-bold text-emerald-700 underline">
                      Open WhatsApp again
                    </a>
                  )}
                </>
              ) : (
                <>
                  <Mail className="mx-auto h-5 w-5 text-violet-600 mb-2" />
                  <p className="text-sm font-semibold text-violet-800">Quotation PDF sent to your email.</p>
                  <p className="text-xs text-violet-600 mt-1">Check your inbox — it may take a minute.</p>
                </>
              )}
            </div>

            <p className="mb-3 text-xs text-slate-400">Redirecting to home in a moment...</p>
            <button
              onClick={() => navigate('/')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-black text-white transition hover:bg-slate-700"
            >
              <Home className="h-4 w-4" /> Back to Home
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Stage 1: Select Locations ──────────────── */}
      <AnimatePresence mode="wait">
        {stage === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.32, ease: EASE_OUT }}
            className="max-w-7xl mx-auto mt-8 px-4 pb-28 sm:px-6 lg:px-8 lg:pb-0"
          >
            {/* Section header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Screen Inventory</h2>
                <p className="mt-0.5 text-sm text-slate-400">Pick the locations you want to include in your quotation.</p>
              </div>
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search screens..."
                  className="w-full rounded-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                />
              </div>
            </div>

            <div className="mb-4 space-y-3 lg:hidden">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.05)]">
                <button
                  type="button"
                  onClick={() => setMobileSelectionOpen(open => !open)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">Selection Snapshot</p>
                    <p className="mt-1 text-sm font-black text-slate-900">
                      {selectedScreens.length ? `${selectedScreens.length} screen${selectedScreens.length > 1 ? 's' : ''} selected` : 'No screens selected yet'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {inventoryTotalPrice > 0 ? `Inventory estimate Rs ${inventoryTotalPrice.toLocaleString('en-IN')}` : 'Choose screens to build your quotation.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-violet-600 px-2 text-xs font-black text-white">
                      {selectedScreens.length}
                    </span>
                    <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${mobileSelectionOpen ? 'rotate-90' : ''}`} />
                  </div>
                </button>
                <AnimatePresence initial={false}>
                  {mobileSelectionOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.24, ease: EASE_OUT }}
                      className="overflow-hidden border-t border-slate-100"
                    >
                      <div className="space-y-2 px-4 py-4">
                        {selectedScreens.length > 0 ? (
                          <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                            {selectedScreens.map(screen => (
                              <div
                                key={screen.id}
                                className="flex items-center justify-between gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2.5"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-semibold text-slate-700">{screen.name}</p>
                                  <p className="mt-0.5 truncate text-[11px] text-slate-400">{screen.area}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleLocation(screen.id)}
                                  className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-200 py-5 text-center">
                            <p className="text-xs text-slate-400">Selected screens will appear here.</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50">
                <button
                  type="button"
                  onClick={() => setMobileSlotInfoOpen(open => !open)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                >
                  <div>
                    <p className="text-xs font-bold text-indigo-900">What is a Slot?</p>
                    <p className="mt-1 text-[11px] text-indigo-700/80">
                      One slot equals {publicSettings?.config?.booking_base_slot_duration_seconds || 20} seconds of ad time.
                    </p>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-indigo-500 transition-transform ${mobileSlotInfoOpen ? 'rotate-90' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {mobileSlotInfoOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.24, ease: EASE_OUT }}
                      className="overflow-hidden border-t border-indigo-100"
                    >
                      <div className="px-4 pb-4 text-[11px] leading-relaxed text-indigo-700/80">
                        Selecting more slots increases the exposure and repetition of your advertisement throughout the day.
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
              {/* Cards grid */}
              <div className="lg:col-span-8 xl:col-span-9">
                {loading ? (
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                    {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-200" />)}
                  </div>
                ) : filteredScreens.length ? (
                  <AnimatePresence mode="popLayout">
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                      {filteredScreens.map(screen => (
                        <LocationCard
                          key={screen.id}
                          screen={screen}
                          selected={selectedIds.includes(screen.id)}
                          onToggle={toggleLocation}
                          onViewLocation={(screenId) => navigate(`/location/${screenId}`)}
                          currentSlots={slotQuantities[screen.id] || 1}
                          onSlotsChange={handleSlotQuantityChange}
                        />
                      ))}
                    </div>
                  </AnimatePresence>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
                    <Monitor className="mx-auto h-8 w-8 text-slate-200" />
                    <p className="mt-3 text-sm font-bold text-slate-500">No screens match your search</p>
                    <p className="mt-1 text-xs text-slate-400">Try different keywords</p>
                  </div>
                )}
              </div>

              {/* Sidebar summary */}
              <div className="hidden lg:col-span-4 lg:block xl:col-span-3">
                <div className="sticky top-24 space-y-4">

                  {/* Selection card */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                    {/* Header */}
                    <div className="border-b border-slate-100 px-5 py-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-black text-slate-900">Selection</h3>
                        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-violet-600 px-1.5 text-xs font-black text-white">
                          {selectedScreens.length}
                        </span>
                      </div>
                    </div>

                    <div className="p-5">
                      {selectedScreens.length > 0 ? (
                        <div className="max-h-[220px] space-y-1.5 overflow-y-auto">
                          <AnimatePresence>
                            {selectedScreens.map(screen => (
                              <motion.div
                                key={screen.id}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-center justify-between gap-2 rounded-xl bg-violet-50 border border-violet-100 p-2.5 text-sm"
                              >
                                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                                  <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                                  <span className="truncate text-xs font-semibold text-slate-700">{screen.name}</span>
                                </div>
                                <button
                                  onClick={() => toggleLocation(screen.id)}
                                  className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center">
                          <p className="text-xs text-slate-400">No screens selected yet</p>
                        </div>
                      )}

                      {/* Estimate */}
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs text-slate-500">Inventory Estimate</span>
                          <span className="text-lg font-black text-slate-900">
                            {inventoryTotalPrice > 0 ? `Rs ${inventoryTotalPrice.toLocaleString('en-IN')}` : '-'}
                          </span>
                        </div>
                        <motion.button
                          whileHover={{ scale: selectedScreens.length ? 1.02 : 1 }}
                          whileTap={{ scale: selectedScreens.length ? 0.97 : 1 }}
                          type="button"
                          onClick={handleContinueToDetails}
                          disabled={selectedScreens.length === 0}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white shadow-[0_4px_16px_rgba(124,58,237,0.3)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
                        >
                          Proceed to Details
                          <ChevronRight className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Slot Info Block */}
                  <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-indigo-100 p-1">
                        <svg className="h-3.5 w-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-indigo-900 mb-1">What is a Slot?</h4>
                        <p className="text-[11px] leading-relaxed text-indigo-700/80">
                          One slot equals <strong>{publicSettings?.config?.booking_base_slot_duration_seconds || 20} seconds</strong> of advertisement.
                          Selecting more slots increases the exposure and repetition of your advertisement throughout the day.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <div className="fixed inset-x-4 bottom-4 z-40 lg:hidden">
              <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_18px_40px_rgba(15,23,42,0.14)] backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">Ready to Continue</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">{selectedScreens.length} selected</span>
                      <span className="truncate text-xs text-slate-400">
                        {inventoryTotalPrice > 0 ? `Rs ${inventoryTotalPrice.toLocaleString('en-IN')}` : 'Select screens first'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleContinueToDetails}
                    disabled={selectedScreens.length === 0}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    Proceed
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Stage 2: Campaign Details ──────────── */}
        {stage === 'details' && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.32, ease: EASE_OUT }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8"
          >
            <div className="mb-4 lg:hidden sticky top-[118px] z-20">
              <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-500">Order Snapshot</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900">{selectedScreens.length} selected</span>
                      <span className="truncate text-xs text-slate-400">Rs {totalPrice.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleBackToSelection}
                    className="shrink-0 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-100"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>

            {bookingInfo && (
              <div className="mb-4 lg:hidden">
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                  {bookingInfo.whatsappUrl ? (
                    <div className="bg-emerald-50 p-3 text-center">
                      <p className="text-xs font-semibold text-emerald-800">Quote #{bookingInfo.id} created.</p>
                      <a
                        href={bookingInfo.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block text-xs font-black text-emerald-600 hover:underline"
                      >
                        Open WhatsApp to send
                      </a>
                    </div>
                  ) : (
                    <div className="bg-blue-50 p-3 text-center">
                      <p className="text-xs font-semibold text-blue-800">Quote #{bookingInfo.id} created.</p>
                      <p className="mt-0.5 text-xs text-blue-600">PDF emailed to {normalizedEmail}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-12 lg:items-start">

              {/* Main form */}
              <div className="lg:col-span-8 space-y-4">
                <form id="booking-form" onSubmit={handleBooking}>

                  {/* Contact & Verification */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center gap-3 mb-4 sm:mb-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                        <ShieldCheck className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900">Contact & Verification</h3>
                        <p className="text-xs text-slate-400">We'll use this to confirm your quotation</p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {[
                        { key: 'client_name', label: 'Client Name *', icon: User, type: 'text', required: true },
                        { key: 'company', label: 'Company *', icon: Building2, type: 'text', required: true },
                      ].map(({ key, label, icon: Icon, type, required }) => (
                        <div key={key}>
                          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</label>
                          <div className="relative">
                            {Icon && <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />}
                            <input
                              type={type}
                              value={form[key]}
                              onChange={e => update(key, e.target.value)}
                              required={required}
                              className={`w-full rounded-xl border border-slate-200 ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 text-sm bg-white outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder:text-slate-300`}
                            />
                          </div>
                        </div>
                      ))}

                      <div className="sm:col-span-2 sm:w-1/2">
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Phone Number *</label>
                        <PhoneInput
                          international
                          defaultCountry="IN"
                          value={form.phone}
                          onChange={v => update('phone', v || '')}
                          className={`phone-input-wrapper rounded-xl border px-3 py-2.5 text-sm bg-white transition ${
                            form.phone
                              ? isValidPhone(form.phone)
                                ? 'border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100'
                                : 'border-red-300 focus-within:ring-2 focus-within:ring-red-100'
                              : 'border-slate-200 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100'
                          }`}
                        />
                        {form.phone && !isValidPhone(form.phone) && (
                          <p className="mt-1 text-[11px] text-red-500">Enter a valid phone number for the selected country.</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Email Address *</label>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <div className="relative flex-1">
                            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                            <input
                              type="email"
                              value={form.email}
                              onChange={handleEmailChange}
                              required
                              className={`w-full rounded-xl border py-2.5 pl-10 pr-10 text-sm bg-white outline-none transition focus:ring-2 placeholder:text-slate-300 ${
                                isEmailVerified
                                  ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-100'
                                  : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100'
                              }`}
                            />
                            {isEmailVerified && (
                              <CheckCircle2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                            )}
                          </div>
                          {otpRequired && !isEmailVerified && emailIsValid && (emailVerification.status === 'idle' || emailVerification.status === 'error' || emailVerification.status === 'invalid') && (
                            <button
                              type="button"
                              onClick={() => requestEmailOtp({ manual: true })}
                              disabled={emailVerification.status === 'sending'}
                              className="w-full shrink-0 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-60 sm:w-auto"
                            >
                              {emailVerification.status === 'sending' ? 'Sending…' : 'Send OTP'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* OTP section */}
                    <AnimatePresence>
                      {otpRequired && showEmailVerificationCard && !isEmailVerified && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mt-4 overflow-hidden"
                        >
                          <div className="rounded-xl border border-slate-100 bg-slate-50 p-5">
                            <div className="flex items-center gap-2 mb-1">
                              <ShieldCheck className="h-4 w-4 text-violet-500" />
                              <h4 className="text-sm font-bold text-slate-900">Email Verification</h4>
                            </div>
                            <p className="text-xs text-slate-400 mb-4">{verificationDescription}</p>

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={OTP_LENGTH}
                                value={emailVerification.code}
                                onChange={handleOtpChange}
                                placeholder="• • • • • •"
                                disabled={!otpEntryOpen || emailVerification.status === 'verifying'}
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-lg font-black tracking-[0.5em] outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-100 disabled:cursor-not-allowed sm:w-48"
                              />
                              <button
                                type="button"
                                onClick={handleVerifyOtp}
                                disabled={!otpEntryOpen || emailVerification.status === 'sending' || emailVerification.status === 'verifying' || emailVerification.code.trim().length !== OTP_LENGTH}
                                className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                              >
                                {emailVerification.status === 'verifying' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                                Verify
                              </button>
                              <button
                                type="button"
                                onClick={() => requestEmailOtp({ manual: true })}
                                disabled={!emailIsValid || emailVerification.status === 'sending' || resendRemainingSeconds > 0}
                                className="shrink-0 text-sm font-semibold text-violet-600 hover:text-violet-700 transition disabled:text-slate-400 sm:ml-auto"
                              >
                                {emailVerification.status === 'sending' ? 'Sending...' : resendRemainingSeconds > 0 ? `Resend in ${formatCountdown(resendRemainingSeconds)}` : 'Resend OTP'}
                              </button>
                            </div>

                            {otpExpiryRemainingSeconds > 0 && (
                              <p className="mt-3 text-[11px] text-slate-400">
                                Code expires in <span className="font-bold text-amber-600">{formatCountdown(otpExpiryRemainingSeconds)}</span>
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {isEmailVerified && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-700"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          Email verified successfully
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Campaign Configuration */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center gap-3 mb-4 sm:mb-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                        <Zap className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900">Campaign Configuration</h3>
                        <p className="text-xs text-slate-400">Select your preferred billing interval</p>
                      </div>
                    </div>

                    <div className="max-w-md">
                      <div className="relative">
                        <select
                          value={form.duration_id || ''}
                          onChange={(e) => update('duration_id', e.target.value)}
                          className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-semibold text-slate-700 outline-none transition hover:border-violet-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                        >
                          {availableDurations.map(dur => {
                              const lbl = (dur.label || '').toLowerCase()
                              const showHrs = !lbl.includes('month') && !lbl.includes('week') && !lbl.includes('year')
                              return (
                                <option key={dur.id} value={dur.id}>
                                  {dur.label} - {dur.days} Days{showHrs ? ` / ${dur.hours} Hrs` : ''}
                                </option>
                              )
                            })}
                        </select>
                        <div className="pointer-events-none absolute right-4 top-1/2 flex -translate-y-1/2 items-center text-slate-400">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Creative Brief */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                    <div className="mb-4 sm:mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                          style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}>
                          <MessageCircle className="h-4.5 w-4.5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900">Creative Brief</h3>
                          <p className="text-xs text-slate-400">Optional — describe your campaign</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handlePolish}
                        disabled={polishing || !form.ad_description.trim()}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-100 disabled:opacity-40 sm:w-auto"
                      >
                        {polishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        AI Polish
                      </button>
                    </div>

                    <textarea
                      rows={4}
                      className="w-full rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none placeholder:text-slate-300"
                      value={form.ad_description}
                      onChange={e => update('ad_description', e.target.value)}
                      placeholder="Describe your campaign focus, offer, or visual styling..."
                    />

                    <AnimatePresence>
                      {form.polished_description && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="mt-4 rounded-xl bg-violet-50 border border-violet-100 p-5"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-500">AI Rewritten Copy</p>
                            <button
                              type="button"
                              onClick={() => { update('ad_description', form.polished_description); toast.success('Applied AI polished text') }}
                              className="text-xs font-bold text-violet-600 hover:text-violet-700 hover:underline"
                            >
                              Use this
                            </button>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">{form.polished_description}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="lg:hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                      <div>
                        <h3 className="font-black text-slate-900">Ready to Submit</h3>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {selectedScreens.length} selected • {selectedDuration?.label || 'Choose duration'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleBackToSelection}
                        className="text-xs font-bold text-violet-600 hover:text-violet-700 hover:underline transition"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="space-y-4 p-5">
                      <div className="flex items-end justify-between">
                        <span className="text-sm text-slate-500">Estimated Total</span>
                        <span className="text-2xl font-black text-slate-900">Rs {totalPrice.toLocaleString('en-IN')}</span>
                      </div>

                      {!isEmailVerified ? (
                        <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-5 py-3.5 text-sm font-bold text-slate-400">
                          <ShieldCheck className="h-4 w-4" /> Verify Email to Proceed
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {canOpenWhatsapp && (
                            <motion.button
                              whileHover={{ scale: !submitting ? 1.01 : 1 }}
                              whileTap={{ scale: 0.98 }}
                              form="booking-form"
                              type="submit"
                              disabled={submitting || !selectedScreens.length}
                              onClick={() => setSubmitAction('whatsapp')}
                              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
                            >
                              {submitting && submitAction === 'whatsapp'
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                                : <><MessageCircle className="h-4 w-4" /> WhatsApp</>
                              }
                            </motion.button>
                          )}
                          {canSendEmail && (
                            <motion.button
                              whileHover={{ scale: !submitting ? 1.01 : 1 }}
                              whileTap={{ scale: 0.98 }}
                              form="booking-form"
                              type="submit"
                              disabled={submitting || !selectedScreens.length}
                              onClick={() => setSubmitAction('email')}
                              className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white shadow-[0_4px_16px_rgba(124,58,237,0.25)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
                            >
                              {submitting && submitAction === 'email'
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                                : <><Mail className="h-4 w-4" /> Email PDF</>
                              }
                            </motion.button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </div>

              {/* Sticky order summary */}
              <div className="hidden lg:col-span-4 lg:block">
                <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.07)] overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
                    <h3 className="font-black text-slate-900">Order Summary</h3>
                    <button onClick={handleBackToSelection} className="text-xs font-bold text-violet-600 hover:text-violet-700 hover:underline transition">
                      Edit
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Locations */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Locations</span>
                        <span className="text-xs font-bold text-slate-900">{selectedScreens.length} selected</span>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 max-h-32 overflow-y-auto space-y-1.5">
                        {selectedScreens.map((s, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                            <span className="truncate font-medium text-slate-700">{s.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Duration Package</span>
                      <span className="font-bold text-slate-900">{selectedDuration.label}</span>
                    </div>

                    {/* Post-submission success notification */}
                    {bookingInfo && (
                      <div className="rounded-xl overflow-hidden border border-slate-200">
                        {bookingInfo.whatsappUrl ? (
                          <div className="bg-emerald-50 p-3 text-center">
                            <p className="text-xs font-semibold text-emerald-800">✅ Quote #{bookingInfo.id} created.</p>
                            <a href={bookingInfo.whatsappUrl} target="_blank" rel="noopener noreferrer"
                              className="mt-1 block text-xs font-black text-emerald-600 hover:underline">
                              Open WhatsApp to send →
                            </a>
                          </div>
                        ) : (
                          <div className="bg-blue-50 p-3 text-center">
                            <p className="text-xs font-semibold text-blue-800">✅ Quote #{bookingInfo.id} created.</p>
                            <p className="text-xs text-blue-600 mt-0.5">PDF emailed to {normalizedEmail}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex items-end justify-between border-t border-slate-100 pt-4">
                      <span className="text-sm text-slate-500">Estimated Total</span>
                      <span className="text-2xl font-black text-slate-900">Rs {totalPrice.toLocaleString('en-IN')}</span>
                    </div>

                    {/* Submit — Two Action Buttons */}
                    {!isEmailVerified ? (
                      <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-5 py-3.5 text-sm font-bold text-slate-400">
                        <ShieldCheck className="h-4 w-4" /> Verify Email to Proceed
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {/* WhatsApp Button */}
                        {canOpenWhatsapp && (
                          <motion.button
                            whileHover={{ scale: !submitting ? 1.02 : 1 }}
                            whileTap={{ scale: 0.97 }}
                            form="booking-form"
                            type="submit"
                            disabled={submitting || !selectedScreens.length}
                            onClick={() => setSubmitAction('whatsapp')}
                            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
                          >
                            {submitting && submitAction === 'whatsapp'
                              ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                              : <><MessageCircle className="h-4 w-4" /> WhatsApp</>
                            }
                          </motion.button>
                        )}

                        {/* Email Button */}
                        <motion.button
                          whileHover={{ scale: !submitting ? 1.02 : 1 }}
                          whileTap={{ scale: 0.97 }}
                          form="booking-form"
                          type="submit"
                          disabled={submitting || !selectedScreens.length}
                          onClick={() => setSubmitAction('email')}
                          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white shadow-[0_4px_16px_rgba(124,58,237,0.25)] transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none ${canOpenWhatsapp ? 'bg-violet-600 hover:bg-violet-700' : 'bg-violet-600 hover:bg-violet-700 sm:col-span-2'}`}
                        >
                          {submitting && submitAction === 'email'
                            ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                            : <><Mail className="h-4 w-4" /> Email PDF</>
                          }
                        </motion.button>
                      </div>
                    )}

                    <p className="text-center text-[11px] text-slate-400">
                      Quotation PDF auto-sent to your email after submission
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
