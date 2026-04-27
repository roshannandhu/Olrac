import { useState, useEffect } from 'react'
import {
  Settings, Save, Loader2, MessageSquare, LayoutTemplate,
  Bell, Brain, Calendar, FileText, Image as ImageIcon, Briefcase, Server, Clock, MapPin, ShieldCheck, Trash2, Film,
  Plus, PencilLine, UserCog, X, AlertTriangle, Key, Eye, EyeOff, RefreshCw, Plug, ExternalLink, Activity, Link2,
} from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/auth-context'
import { usePublicSettings } from '../context/PublicSettingsContext'
import { normalizeBookingDurations, resolveDefaultBookingDurationId } from '../utils/bookingDurations'
import { DEFAULT_WHATSAPP_TEMPLATE, WHATSAPP_TEMPLATE_VARIABLES, fillWhatsAppTemplate } from '../utils/whatsappTemplate'

const defaultConfig = {
  general_app_name: 'OLRAC Advertising',
  general_contact_phone: '',
  general_logo_url: '',
  general_brand_images: [],
  hero_billboard_video: '',
  hero_billboard_media: [],
  landing_card_1_videos: [],
  landing_card_2_videos: [],
  landing_card_3_videos: [],
  whatsapp_enable: true,
  whatsapp_template: DEFAULT_WHATSAPP_TEMPLATE,
  notifications_enable: true,
  smtp_host: '',
  smtp_port: '587',
  smtp_user: '',
  smtp_password: '',
  smtp_from_name: '',
  notifications_template_created: 'Your booking {booking_id} has been received and is pending approval.',
  notifications_template_approved: 'Great news! Your booking {booking_id} has been approved.',
  notifications_template_rejected: 'Unfortunately, your booking {booking_id} could not be approved at this time.',
  ai_enable: true,
  ai_api_key: '',
  ai_model: 'gpt-4',
  ai_feature_improver: true,
  ai_feature_summary: true,
  ai_feature_classification: true,
  booking_default_status: 'pending',
  booking_min_budget: '500',
  booking_slot_duration: '1',
  booking_base_slot_duration_seconds: 20,
  booking_max_per_day: '10',
  booking_allow_overlap: false,
  booking_method_whatsapp: true,
  booking_method_email: true,
  booking_default_duration_id: 'd3',
  booking_durations: [
    { id: 'd1', label: '1 Day', days: 1, hours: 24 },
    { id: 'd2', label: '1 Week', days: 7, hours: 168 },
    { id: 'd3', label: '1 Month', days: 30, hours: 720 },
    { id: 'd4', label: '6 Months', days: 180, hours: 4320 },
    { id: 'd5', label: '1 Year', days: 365, hours: 8760 },
  ],
  security_token_expiry: '24',
  security_session_timeout: '60',
  security_ip_restriction: '',
  security_otp_booking_enable: true,
  security_otp_admin_reset_enable: true,
  security_2fa_login_enable: false,
  security_otp_expiry_minutes: '5',
  security_otp_max_attempts: '5',
  invoice_company_name: 'OLRAC Advertising Pvt Ltd',
  invoice_address: '',
  invoice_gst: '',
  invoice_logo_url: '',
  invoice_seal_url: '',
  invoice_title: 'ADVERTISING QUOTATION',
  quotation_default_slot_duration: '20 Sec',
  quotation_default_service_description: 'Digital Ad Placement',
  quotation_default_terms_payment: 'All payments are required upfront before the campaign launch. Campaign will not be scheduled without confirmed remittance.',
  quotation_default_terms_content: 'Olrac reserves the right to review all material and reject or remove any content deemed inappropriate, offensive, or in violation of local standards.',
  quotation_default_terms_downtime: 'Screen downtime due to power failure, internet issues, or routine maintenance will not be considered a breach of contract, and no compensation or extension will be applicable.',
  quotation_default_terms_branding: 'Client must ensure that all ad creatives adhere strictly to the dimensions, file size, and extension parameters outlined by the Olrac Advertising formatting rules. Any deviation may result in delayed campaign launch or reduced broadcast quality, for which Olrac cannot be held liable.',
  quotation_send_copy_to_admin: false,
  quotation_company_name: 'OLRAC Advertising Pvt Ltd',
  quotation_address: '',
  quotation_gst: '',
  quotation_logo_url: '',
  quotation_tax_rate: '18',
  quotation_bank_name: '',
  quotation_account_name: '',
  quotation_account_number: '',
  quotation_ifsc: '',
  quotation_upi: '',
  quotation_primary_color: '#334155',
  quotation_show_seal: true,
  quotation_show_slot_details: true,
  quotation_signature_name: '',
  quotation_signature_title: 'Authorized Signatory',
  quotation_payment_terms: '',
  quotation_notes: '',
  quotation_footer_note: '',
  posthog_public_key: '',
  posthog_personal_api_key: '',
  posthog_project_id: '',
  posthog_host: 'https://us.posthog.com',
  contact_instagram_url: 'https://www.instagram.com/olracadvertise?igsh=MWlhNHVnb2J1cmFwMg==',
  contact_facebook_url: 'https://www.facebook.com/share/14egZ1762Hm/',
  contact_linkedin_url: 'https://www.linkedin.com/in/olrac-advertise-b32917405?utm_source=share_via&utm_content=profile&utm_medium=member_ios',
  contact_map_url: '',
}

const createAdminFormState = () => ({
  name: '',
  email: '',
  password: '',
})

const buildSettingsState = (rawSettings = {}) => {
  const config = { ...defaultConfig, ...(rawSettings.config || {}) }
  config.booking_default_duration_id = resolveDefaultBookingDurationId(config)

  return {
    whatsapp_number: rawSettings.whatsapp_number || '',
    contact_email: rawSettings.contact_email || '',
    config,
  }
}

export default function AdminSettings() {
  const { user, updateStoredUser } = useAuth()
  const { refreshSettings } = usePublicSettings()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [adminsLoading, setAdminsLoading] = useState(false)
  const [savingAdmin, setSavingAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [admins, setAdmins] = useState([])
  const [editingAdminId, setEditingAdminId] = useState(null)
  const [confirmDeleteAdminId, setConfirmDeleteAdminId] = useState(null)
  const [deletingAdminId, setDeletingAdminId] = useState(null)
  const [showProfilePassword, setShowProfilePassword] = useState(false)
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [showSmtpPassword, setShowSmtpPassword] = useState(false)
  const [testingSmtp, setTestingSmtp] = useState(false)
  const [smtpStatus, setSmtpStatus] = useState(null)

  // Global Settings State (matches SettingsUpdate schema)
  const [settings, setSettings] = useState({
    whatsapp_number: '',
    contact_email: '',
    config: defaultConfig
  })

  // Security Profile State (for the separate endpoint)
  const [profile, setProfile] = useState({ name: '', email: '', password: '' })
  const [adminForm, setAdminForm] = useState(createAdminFormState())
  const sortedBookingDurations = normalizeBookingDurations(settings.config.booking_durations || [])
  const defaultBookingDurationId = resolveDefaultBookingDurationId(settings.config)
  const defaultBookingDuration = sortedBookingDurations.find((duration) => duration.id === defaultBookingDurationId) || null

  const TABS = [
    { id: 'general', label: 'General', icon: LayoutTemplate },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'ai', label: 'AI Configuration', icon: Brain },
    { id: 'booking', label: 'Booking Logic', icon: Calendar },
    { id: 'security', label: 'Security Controls', icon: ShieldCheck },
    { id: 'quotation', label: 'Quotation Settings', icon: FileText },
    { id: 'integrations', label: 'Integrations', icon: Plug },
  ]

  useEffect(() => {
    fetchSettings()
    fetchAdmins({ silent: true })
    fetchSmtpStatus()
  }, [])

  useEffect(() => {
    if (user) {
      setProfile((prev) => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
      }))
    }
  }, [user])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/settings')
      setSettings(buildSettingsState(res.data))
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to load platform settings')
    } finally {
      setLoading(false)
    }
  }

  const fetchSmtpStatus = async () => {
    try {
      const res = await api.get('/admin/settings/smtp-status')
      setSmtpStatus(res.data)
    } catch {
      setSmtpStatus(null)
    }
  }

  const fetchAdmins = async ({ silent = false } = {}) => {
    setAdminsLoading(true)
    try {
      const res = await api.get('/admin/users')
      setAdmins(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      if (!silent) {
        toast.error(err.response?.data?.detail || err.message || 'Failed to load admin accounts')
      }
    } finally {
      setAdminsLoading(false)
    }
  }

  const resetAdminForm = () => {
    setAdminForm(createAdminFormState())
    setEditingAdminId(null)
  }

  const updateConfig = (key, value) => {
    setSettings(prev => ({
      ...prev,
      config: { ...prev.config, [key]: value }
    }))
  }

  const setBookingDurations = (durations) => {
    setSettings((prev) => {
      const nextConfig = { ...prev.config, booking_durations: durations }

      return {
        ...prev,
        config: {
          ...nextConfig,
          booking_default_duration_id: resolveDefaultBookingDurationId(nextConfig),
        },
      }
    })
  }

  const updateBookingDuration = (durationId, updater) => {
    const nextDurations = (settings.config.booking_durations || []).map((duration) =>
      duration.id === durationId ? updater(duration) : duration
    )
    setBookingDurations(nextDurations)
  }

  const persistSettingsState = async (nextSettings, successMessage = 'Settings published successfully') => {
    const payload = buildSettingsState(nextSettings)
    const res = await api.put('/admin/settings', payload)
    const normalizedSettings = buildSettingsState(res.data)
    setSettings(normalizedSettings)
    await refreshSettings()
    window.dispatchEvent(new CustomEvent('olrac-settings-updated'))
    if (successMessage) {
      toast.success(successMessage)
    }
    return normalizedSettings
  }

  const handleSettingsSubmit = async (e, { silent = false } = {}) => {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      await persistSettingsState(buildSettingsState(settings), silent ? '' : 'Settings published successfully')
      fetchSmtpStatus()
      return true
    } catch (err) {
      if (!silent) {
        toast.error(err.response?.data?.detail || err.message || 'Failed to update settings')
      }
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleProfileSubmit = async (e) => {
    if (e) e.preventDefault()
    setSavingProfile(true)
    try {
      const payload = { ...profile }
      if (!payload.password) delete payload.password
      payload.name = payload.name?.trim()
      payload.email = payload.email?.trim()
      if (!payload.name) delete payload.name
      if (!payload.email) delete payload.email

      await api.put('/admin/profile', payload)
      const nextUser = {
        ...user,
        name: payload.name ?? user?.name,
        email: payload.email ?? user?.email,
      }
      updateStoredUser(nextUser)
      setProfile((prev) => ({ ...prev, password: '' }))

      const settingsSaved = await handleSettingsSubmit(null, { silent: true })
      if (settingsSaved) {
        toast.success('Admin profile and security settings updated')
      } else {
        toast.error('Profile updated, but security settings could not be saved')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleAdminFormSubmit = async (e) => {
    if (e) e.preventDefault()

    const payload = {
      name: adminForm.name.trim(),
      email: adminForm.email.trim().toLowerCase(),
      password: adminForm.password,
    }

    if (!payload.name || !payload.email) {
      toast.error('Admin name and email are required')
      return
    }

    if (!editingAdminId && !payload.password) {
      toast.error('Set a password for the new admin account')
      return
    }

    if (!payload.password) {
      delete payload.password
    }

    setSavingAdmin(true)
    try {
      const res = editingAdminId
        ? await api.put(`/admin/users/${editingAdminId}`, payload)
        : await api.post('/admin/users', payload)

      const savedAdmin = res.data
      await fetchAdmins({ silent: true })

      if (user?.id === savedAdmin.id) {
        const nextUser = {
          ...user,
          name: savedAdmin.name,
          email: savedAdmin.email,
        }
        updateStoredUser(nextUser)
        setProfile((prev) => ({
          ...prev,
          name: savedAdmin.name,
          email: savedAdmin.email,
          password: '',
        }))
      }

      resetAdminForm()
      toast.success(editingAdminId ? 'Admin updated successfully' : 'New admin added successfully')
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to save admin account')
    } finally {
      setSavingAdmin(false)
    }
  }

  const startEditingAdmin = (adminRecord) => {
    setEditingAdminId(adminRecord.id)
    setAdminForm({
      name: adminRecord.name || '',
      email: adminRecord.email || '',
      password: '',
    })
  }

  const handleDeleteAdmin = async (adminId) => {
    setDeletingAdminId(adminId)
    try {
      await api.delete(`/admin/users/${adminId}`)
      await fetchAdmins({ silent: true })
      setConfirmDeleteAdminId(null)
      toast.success('Admin account removed')
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to delete admin account')
    } finally {
      setDeletingAdminId(null)
    }
  }

  const handleConfigImageUpload = async (event, key) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      setSaving(true)
      const res = await api.post('/admin/screens/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      updateConfig(key, res.data.url)
      toast.success('Image uploaded. Save settings to persist it.')
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Image upload failed')
    } finally {
      setSaving(false)
      event.target.value = ''
    }
  }

  const handleConfigMultiImageUpload = async (event, key) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    try {
      setSaving(true)
      const uploadedUrls = []

      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await api.post('/admin/screens/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        uploadedUrls.push(res.data.url)
      }

      const nextSettings = {
        ...settings,
        config: {
          ...settings.config,
          [key]: [...(settings.config[key] || []), ...uploadedUrls],
        }
      }

      setSettings(nextSettings)
      await persistSettingsState(nextSettings, `${uploadedUrls.length} image${uploadedUrls.length > 1 ? 's' : ''} uploaded and published.`)
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Image upload failed')
    } finally {
      setSaving(false)
      event.target.value = ''
    }
  }

  const removeConfigGalleryImage = async (key, indexToRemove) => {
    const nextSettings = {
      ...settings,
      config: {
        ...settings.config,
        [key]: (settings.config[key] || []).filter((_, index) => index !== indexToRemove),
      }
    }

    setSettings(nextSettings)
    try {
      setSaving(true)
      await persistSettingsState(nextSettings, 'Brand image removed and published.')
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to remove image')
    } finally {
      setSaving(false)
    }
  }

  const moveConfigGalleryImage = async (key, fromIndex, toIndex) => {
    const nextImages = [...(settings.config[key] || [])]
    if (toIndex < 0 || toIndex >= nextImages.length) return
    const [moved] = nextImages.splice(fromIndex, 1)
    nextImages.splice(toIndex, 0, moved)

    const nextSettings = {
      ...settings,
      config: {
        ...settings.config,
        [key]: nextImages,
      }
    }

    setSettings(nextSettings)
    try {
      setSaving(true)
      await persistSettingsState(nextSettings, 'Brand image order updated.')
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to reorder images')
    } finally {
      setSaving(false)
    }
  }

  const renderDurationConfiguration = () => (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-amber-50/40 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Dynamic Booking Durations</p>
              <p className="text-xs text-slate-500">Create packages and manually choose which one is preselected on the client booking page.</p>
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold text-slate-600">
            Client default: <span className="text-slate-900">{defaultBookingDuration?.label || 'No package configured yet'}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Slot Duration (Sec)</label>
            <input
              type="number"
              min="1"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              value={settings.config.booking_base_slot_duration_seconds || 20}
              onChange={(e) => updateConfig('booking_base_slot_duration_seconds', Number(e.target.value) || 20)}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const nextId = `dur_${Date.now()}`
              setBookingDurations([
                ...(settings.config.booking_durations || []),
                { id: nextId, label: '', days: 0, hours: 0 },
              ])
            }}
            className="inline-flex h-[38px] items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition hover:bg-black"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Package
          </button>
        </div>
      </div>

      <div className="p-5">
        {sortedBookingDurations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
            <p className="text-sm font-semibold text-slate-700">No booking packages yet</p>
            <p className="mt-1 text-xs text-slate-500">Add your first duration package and it will become the client default automatically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedBookingDurations.map((dur) => {
              const isDefault = dur.id === defaultBookingDurationId
              const storedDays = dur.days || 0
              const months = Math.floor(storedDays / 30)
              const weeks = Math.floor((storedDays % 30) / 7)
              const days = (storedDays % 30) % 7

              const updateDurationBreakdown = (patch) => {
                updateBookingDuration(dur.id, (current) => {
                  const currentDays = Number(current.days) || 0
                  const nextMonths = patch.months ?? Math.floor(currentDays / 30)
                  const nextWeeks = patch.weeks ?? Math.floor((currentDays % 30) / 7)
                  const nextDays = patch.days_ ?? ((currentDays % 30) % 7)

                  return {
                    ...current,
                    days: (nextMonths * 30) + (nextWeeks * 7) + nextDays,
                  }
                })
              }

              return (
                <div
                  key={dur.id}
                  className={`rounded-2xl border p-4 shadow-sm transition-all ${
                    isDefault
                      ? 'border-violet-300 bg-violet-50/40 shadow-[0_12px_32px_rgba(124,58,237,0.12)]'
                      : 'border-slate-200 bg-white hover:border-violet-200 hover:shadow-md'
                  }`}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] ${
                        isDefault ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isDefault ? 'Default Package' : 'Client Option'}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateConfig('booking_default_duration_id', dur.id)}
                        className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                          isDefault
                            ? 'border-violet-200 bg-white text-violet-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700'
                        }`}
                      >
                        {isDefault ? 'Selected on client' : 'Set as default'}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setBookingDurations((settings.config.booking_durations || []).filter((duration) => duration.id !== dur.id))}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Delete ${dur.label || 'booking package'}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mb-4">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">Package Name</label>
                    <input
                      type="text"
                      value={dur.label}
                      placeholder="e.g. 1 Month, 15 Days"
                      onChange={(e) => updateBookingDuration(dur.id, (current) => ({ ...current, label: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Months</label>
                      <input
                        type="number"
                        min="0"
                        value={months}
                        onChange={(e) => updateDurationBreakdown({ months: Number(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-1 focus:ring-violet-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Weeks</label>
                      <input
                        type="number"
                        min="0"
                        value={weeks}
                        onChange={(e) => updateDurationBreakdown({ weeks: Number(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-1 focus:ring-violet-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Days</label>
                      <input
                        type="number"
                        min="0"
                        max="6"
                        value={days}
                        onChange={(e) => updateDurationBreakdown({ days_: Number(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-1 focus:ring-violet-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Hours</label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={dur.hours || 0}
                        onChange={(e) => updateBookingDuration(dur.id, (current) => ({ ...current, hours: Number(e.target.value) || 0 }))}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-1 focus:ring-violet-500"
                      />
                    </div>
                  </div>

                  <p className="mt-3 text-right text-[10px] font-semibold text-slate-400">
                    = {dur.days || 0} days {dur.hours || 0} hrs total
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
           <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
           <p className="text-sm font-medium text-gray-500 animate-pulse">Loading platform settings...</p>
        </div>
      </div>
    )
  }

  // Segment Renderers
  const renderGeneral = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="label">Application Name</label>
          <input
            type="text"
            className="input-field"
            value={settings.config.general_app_name}
            onChange={(e) => updateConfig('general_app_name', e.target.value)}
          />
        </div>
        <div>
          <label className="label">Contact Phone</label>
          <input
            type="text"
            className="input-field"
            value={settings.config.general_contact_phone}
            onChange={(e) => updateConfig('general_contact_phone', e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="label">Support Email (Global)</label>
          <input
            type="email"
            className="input-field"
            value={settings.contact_email}
            onChange={(e) => setSettings({...settings, contact_email: e.target.value})}
          />
          <p className="text-[11px] text-gray-500 mt-1">Universal support contact for platform-wide alerts.</p>
        </div>
        <div className="md:col-span-2">
          <label className="label flex items-center gap-1.5">
            <Link2 className="w-4 h-4 text-gray-400" /> Contact &amp; Social Links
          </label>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="text-xs text-slate-500">
              These links appear in the public footer. Leave a field blank to hide that link from the site.
            </p>

            {/* Instagram */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: 'linear-gradient(135deg, #e1306c, #833ab4)' }}>
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </div>
              <input
                type="url"
                className="input-field flex-1"
                placeholder="https://instagram.com/yourprofile"
                value={settings.config.contact_instagram_url}
                onChange={(e) => updateConfig('contact_instagram_url', e.target.value)}
              />
              {settings.config.contact_instagram_url && (
                <a href={settings.config.contact_instagram_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Facebook */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1877f2]">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <input
                type="url"
                className="input-field flex-1"
                placeholder="https://facebook.com/yourpage"
                value={settings.config.contact_facebook_url}
                onChange={(e) => updateConfig('contact_facebook_url', e.target.value)}
              />
              {settings.config.contact_facebook_url && (
                <a href={settings.config.contact_facebook_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* LinkedIn */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0a66c2]">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </div>
              <input
                type="url"
                className="input-field flex-1"
                placeholder="https://linkedin.com/company/yourcompany"
                value={settings.config.contact_linkedin_url}
                onChange={(e) => updateConfig('contact_linkedin_url', e.target.value)}
              />
              {settings.config.contact_linkedin_url && (
                <a href={settings.config.contact_linkedin_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Map / Location */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <input
                type="url"
                className="input-field flex-1"
                placeholder="https://maps.google.com/?q=your+office+address"
                value={settings.config.contact_map_url}
                onChange={(e) => updateConfig('contact_map_url', e.target.value)}
              />
              {settings.config.contact_map_url && (
                <a href={settings.config.contact_map_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <p className="text-[11px] text-slate-400 pt-1">Map URL: paste a Google Maps link so visitors can find your office. Shows as a clickable "India" location button in the footer.</p>
          </div>
        </div>

        <div className="md:col-span-2">
           <label className="label">Platform Logo</label>
           <div className="flex items-center gap-4 p-4 border border-dashed border-gray-300 rounded-xl bg-gray-50">
             <div className="w-16 h-16 bg-white rounded-lg shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
               {settings.config.general_logo_url ? (
                 <img src={settings.config.general_logo_url} alt="Platform logo" className="w-full h-full object-cover" />
               ) : (
                 <ImageIcon className="w-5 h-5 text-gray-400" />
               )}
             </div>
             <label className="btn-ghost text-sm px-4 py-2 cursor-pointer">
               Upload New Image
               <input type="file" className="hidden" accept="image/*" onChange={(e) => handleConfigImageUpload(e, 'general_logo_url')} />
             </label>
           </div>
        </div>
        <div className="md:col-span-2">
          <label className="label flex items-center gap-1.5"><Film className="w-4 h-4 text-gray-400" /> Hero Billboard Media</label>
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Advertising Screen Content</p>
                <p className="mt-1 text-xs text-slate-500">
                  Upload videos and images for the hero digital billboard. Images rotate every 3 seconds.
                </p>
              </div>
              <label className="btn-ghost text-sm px-4 py-2 cursor-pointer">
                Add Media
                <input type="file" className="hidden" accept="image/*,video/*" multiple onChange={(e) => handleConfigMultiImageUpload(e, 'hero_billboard_media')} />
              </label>
            </div>

            {(settings.config.hero_billboard_media || []).length > 0 ? (
              <div className="mt-4 flex flex-col gap-3">
                {(settings.config.hero_billboard_media || []).map((mediaUrl, index) => {
                  const isVid = mediaUrl.match(/\.(mp4|webm|mov|ogg)$/i)
                  return (
                    <div key={`${mediaUrl}-${index}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                      {isVid ? (
                        <video src={mediaUrl} className="h-12 w-20 rounded bg-black object-cover" muted />
                      ) : (
                        <img src={mediaUrl} className="h-12 w-20 rounded bg-black object-cover" alt={`Billboard media ${index + 1}`} />
                      )}
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-xs font-medium text-slate-700">Media {index + 1}</p>
                        <div className="mt-1 flex gap-1">
                          <button type="button" onClick={() => moveConfigGalleryImage('hero_billboard_media', index, index - 1)} disabled={index === 0} className="text-[10px] text-slate-500 hover:text-slate-800 disabled:opacity-30">Up</button>
                          <span className="text-slate-300">|</span>
                          <button type="button" onClick={() => moveConfigGalleryImage('hero_billboard_media', index, index + 1)} disabled={index === (settings.config.hero_billboard_media || []).length - 1} className="text-[10px] text-slate-500 hover:text-slate-800 disabled:opacity-30">Down</button>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeConfigGalleryImage('hero_billboard_media', index)} className="mr-1 text-slate-400 hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white py-6 text-center">
                <Film className="mx-auto h-6 w-6 text-slate-300" />
                <p className="mt-2 text-xs font-medium text-slate-500">No billboard media uploaded yet</p>
              </div>
            )}
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="label">Homepage Brand Images</label>
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Unlimited carousel images</p>
                <p className="mt-1 text-xs text-slate-500">
                  These images power the client homepage "Brands in Motion" section.
                </p>
              </div>
              <label className="btn-ghost text-sm px-4 py-2 cursor-pointer">
                Upload Images
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleConfigMultiImageUpload(e, 'general_brand_images')}
                />
              </label>
            </div>

            {(settings.config.general_brand_images || []).length > 0 ? (
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {(settings.config.general_brand_images || []).map((imageUrl, index) => (
                  <div key={`${imageUrl}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="h-32 bg-slate-100">
                      <img src={imageUrl} alt={`Brand visual ${index + 1}`} className="h-full w-full object-cover" />
                    </div>
                    <div className="space-y-3 p-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => moveConfigGalleryImage('general_brand_images', index, index - 1)}
                          disabled={index === 0}
                          className="inline-flex rounded-xl border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Left
                        </button>
                        <button
                          type="button"
                          onClick={() => moveConfigGalleryImage('general_brand_images', index, index + 1)}
                          disabled={index === (settings.config.general_brand_images || []).length - 1}
                          className="inline-flex rounded-xl border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Right
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-xs font-medium text-slate-500">Image {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeConfigGalleryImage('general_brand_images', index)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-center">
                <ImageIcon className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-600">No brand images uploaded yet</p>
                <p className="mt-1 text-xs text-slate-500">Upload as many carousel images as you want.</p>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 mt-8">
          <div className="border-b border-slate-200 pb-4 mb-6">
            <h3 className="text-lg font-bold text-slate-900">Homepage Media Cards</h3>
            <p className="mt-1 text-sm text-slate-500">
              Manage the looping media for the 3 visual cards on the landing page. Upload multiple images (5s) or videos to a card to loop them sequentially.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[1, 2, 3].map((cardNum) => {
              const fieldName = `landing_card_${cardNum}_videos`
              const vids = settings.config[fieldName] || []
              return (
                <div key={cardNum} className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-800">Card {cardNum} Media</p>
                      <label className="btn-ghost text-[11px] px-3 py-1 cursor-pointer">
                        Add Media
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,video/*"
                          multiple
                          onChange={(e) => handleConfigMultiImageUpload(e, fieldName)}
                        />
                      </label>
                    </div>

                    {vids.length > 0 ? (
                      <div className="mt-2 flex flex-col gap-3">
                        {vids.map((mediaUrl, index) => {
                          const isVideo = mediaUrl.match(/\.(mp4|webm|mov|ogg)$/i)
                          return (
                          <div key={`${mediaUrl}-${index}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                            {isVideo ? (
                              <video src={mediaUrl} className="h-12 w-16 rounded bg-black object-cover" />
                            ) : (
                              <img src={mediaUrl} className="h-12 w-16 rounded bg-black object-cover" />
                            )}
                            <div className="flex-1 overflow-hidden">
                              <p className="truncate text-xs font-medium text-slate-700">Media {index + 1}</p>
                              <div className="mt-1 flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => moveConfigGalleryImage(fieldName, index, index - 1)}
                                  disabled={index === 0}
                                  className="text-[10px] text-slate-500 hover:text-slate-800 disabled:opacity-30"
                                >
                                  Up
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => moveConfigGalleryImage(fieldName, index, index + 1)}
                                  disabled={index === vids.length - 1}
                                  className="text-[10px] text-slate-500 hover:text-slate-800 disabled:opacity-30"
                                >
                                  Down
                                </button>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeConfigGalleryImage(fieldName, index)}
                              className="mr-1 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )})}
                      </div>
                    ) : (
                      <div className="mt-2 rounded-xl border border-slate-200 bg-white py-6 text-center">
                        <p className="text-xs font-medium text-slate-500">No media uploaded</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
      </div>

      </div>
    </div>
  )

  const renderWhatsApp = () => (
    <div className="space-y-6">
      {(() => {
        const previewMessage = fillWhatsAppTemplate(settings.config.whatsapp_template, {
          booking_id: 'OLRAC1024',
          name: 'Rohan Kumar',
          company: 'Vision Media',
          email: 'rohan@example.com',
          phone: '+91 98765 43210',
          location: 'MG Road Digital Display',
          area: 'Bengaluru CBD',
          billing: '3 Months Slot',
          slots: '2',
          budget: 'Rs 25,000',
          total_price: 'Rs 48,000',
          description: 'Launch campaign for a premium retail promotion.',
        })

        return (
          <>
      <div className="flex items-center justify-between p-4 rounded-xl border border-primary-100 bg-primary-50/30">
        <div>
          <h4 className="font-semibold text-gray-900 text-sm">WhatsApp Engine Status</h4>
          <p className="text-xs text-gray-500">Enable or disable global direct-to-WhatsApp booking generation.</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={settings.config.whatsapp_enable} onChange={(e) => updateConfig('whatsapp_enable', e.target.checked)} />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white">
          <div>
            <h4 className="font-semibold text-gray-900 text-sm">WhatsApp Message Format</h4>
            <p className="text-xs text-gray-500">Choose what the client sends when they click the WhatsApp button.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => updateConfig('whatsapp_message_format', 'text')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${settings.config.whatsapp_message_format !== 'pdf_link' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Text Summary
            </button>
            <button
              type="button"
              onClick={() => updateConfig('whatsapp_message_format', 'pdf_link')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${settings.config.whatsapp_message_format === 'pdf_link' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              PDF Link
            </button>
          </div>
        </div>
        <div>
          <label className="label">Admin WhatsApp Target Number</label>
          <input
            type="text"
            className="input-field"
            value={settings.whatsapp_number}
            onChange={(e) => setSettings({...settings, whatsapp_number: e.target.value})}
            placeholder="Include country code (e.g. 919876543210)"
          />
        </div>
        <div>
          <label className="label">Default Message Template</label>
          <textarea
            className="input-field font-mono text-sm leading-relaxed"
            rows={14}
            value={settings.config.whatsapp_template}
            onChange={(e) => updateConfig('whatsapp_template', e.target.value)}
          />
          <p className="text-[11px] text-gray-500 mt-1">Available variables: {WHATSAPP_TEMPLATE_VARIABLES.join(', ')}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Live Message Preview</h4>
              <p className="text-xs text-slate-500">This is the exact style the client booking flow will send through WhatsApp.</p>
            </div>
            <button
              type="button"
              onClick={() => updateConfig('whatsapp_template', DEFAULT_WHATSAPP_TEMPLATE)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white"
            >
              Reset Default
            </button>
          </div>

          <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-white p-4 font-mono text-xs leading-6 text-slate-700 border border-slate-200">
            {previewMessage}
          </pre>
        </div>
      </div>
      <button type="button" onClick={() => toast.success('WhatsApp template is ready. Save settings to publish changes.')} className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">Test WhatsApp Message</button>
          </>
        )
      })()}
    </div>
  )

  const handleTestSmtp = async () => {
    setTestingSmtp(true)
    try {
      const res = await api.post('/admin/settings/test-smtp')
      toast.success(`Test email sent to ${res.data.to}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send test email')
    } finally {
      setTestingSmtp(false)
    }
  }

  const renderNotifications = () => (
    <div className="space-y-6">
      {/* Currently running SMTP status */}
      {smtpStatus && (
        <div className={`p-4 rounded-xl border ${smtpStatus.configured ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-2 h-2 rounded-full ${smtpStatus.configured ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            <h4 className="font-semibold text-sm text-gray-900">Currently Running Email Configuration</h4>
          </div>
          {smtpStatus.configured ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs">
              <div>
                <span className="text-gray-500 font-medium uppercase tracking-wide">From</span>
                <p className="font-mono text-gray-800 mt-0.5">{smtpStatus.user}</p>
              </div>
              <div>
                <span className="text-gray-500 font-medium uppercase tracking-wide">Server</span>
                <p className="font-mono text-gray-800 mt-0.5">{smtpStatus.host}:{smtpStatus.port}</p>
              </div>
              <div>
                <span className="text-gray-500 font-medium uppercase tracking-wide">Display Name</span>
                <p className="font-mono text-gray-800 mt-0.5">{smtpStatus.from_name || '—'}</p>
              </div>
              <div>
                <span className="text-gray-500 font-medium uppercase tracking-wide">API Key / Password</span>
                <p className="font-mono text-gray-800 mt-0.5">{smtpStatus.password_masked || '—'}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-amber-700">SMTP is not configured. Add your credentials below and save.</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50">
        <div>
          <h4 className="font-semibold text-gray-900 text-sm">Email Notifications</h4>
          <p className="text-xs text-gray-500">Enable system-wide email sending — OTP verification, quotation PDFs, booking confirmations.</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={settings.config.notifications_enable} onChange={(e) => updateConfig('notifications_enable', e.target.checked)} />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
        </label>
      </div>

      <div>
        <label className="label">Admin Notification Email</label>
        <input type="email" className="input-field" placeholder="admin@example.com" value={settings.config.admin_email || ''} onChange={e => updateConfig('admin_email', e.target.value)} />
        <p className="mt-1 text-[11px] text-gray-500">Quotation PDFs are automatically copied to this address when sent to clients.</p>
      </div>

      <div className="space-y-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-gray-400" />
          <h4 className="font-semibold text-sm text-gray-900">SMTP Configuration</h4>
        </div>
        <p className="text-xs text-gray-500 -mt-2">Override server environment variables. Save first, then test.</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">SMTP Host</label>
            <input type="text" className="input-field" placeholder="smtp.gmail.com" value={settings.config.smtp_host || ''} onChange={e => updateConfig('smtp_host', e.target.value)} />
          </div>
          <div>
            <label className="label">SMTP Port</label>
            <input type="number" className="input-field" placeholder="587" value={settings.config.smtp_port || ''} onChange={e => updateConfig('smtp_port', e.target.value)} />
          </div>
          <div>
            <label className="label">SMTP Email Address</label>
            <input type="email" className="input-field" placeholder="you@gmail.com" value={settings.config.smtp_user || ''} onChange={e => updateConfig('smtp_user', e.target.value)} />
          </div>
          <div>
            <label className="label">API Key / App Password</label>
            <p className="text-[11px] text-gray-400 mb-1">This key authorises sending OTP and quotation PDFs to clients.</p>
            <div className="relative">
              <input
                type={showSmtpPassword ? 'text' : 'password'}
                className="input-field pr-10"
                placeholder="Gmail app password or SMTP API key"
                value={settings.config.smtp_password || ''}
                onChange={e => updateConfig('smtp_password', e.target.value)}
              />
              <button type="button" onClick={() => setShowSmtpPassword(v => !v)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="label">From Name</label>
            <input type="text" className="input-field" placeholder="Olrac Advertising" value={settings.config.smtp_from_name || ''} onChange={e => updateConfig('smtp_from_name', e.target.value)} />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleTestSmtp}
            disabled={testingSmtp}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            {testingSmtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            {testingSmtp ? 'Sending…' : 'Send Test Email'}
          </button>
          <p className="text-[11px] text-gray-400">Sends a test email to your admin account. Save settings first.</p>
        </div>
      </div>
    </div>
  )

  const renderAI = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 rounded-xl border border-indigo-100 bg-indigo-50/30">
        <div>
          <h4 className="font-semibold text-gray-900 text-sm">Automated Intelligence Active</h4>
          <p className="text-xs text-gray-500">Govern AI routing modules and data augmentation.</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={settings.config.ai_enable} onChange={(e) => updateConfig('ai_enable', e.target.checked)} />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="label">Master API Token</label>
          <input type="password" placeholder="sk-..." className="input-field" value={settings.config.ai_api_key} onChange={e => updateConfig('ai_api_key', e.target.value)} />
        </div>
        <div>
          <label className="label">Preferred Matrix Model</label>
          <select className="input-field" value={settings.config.ai_model} onChange={e => updateConfig('ai_model', e.target.value)}>
            <option value="gpt-4">GPT-4 Turbo</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Ultra</option>
            <option value="claude-3">Claude 3 Opus</option>
          </select>
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-gray-100">
         <h4 className="font-semibold text-sm text-gray-900 pb-2">Active Augmentations</h4>
         
         <label className="flex items-center gap-3">
            <input type="checkbox" className="w-4 h-4 text-primary-600 rounded border-gray-300" checked={settings.config.ai_feature_improver} onChange={e => updateConfig('ai_feature_improver', e.target.checked)} />
            <span className="text-sm font-medium text-gray-700">Description Improver (Context refinement)</span>
         </label>
         <label className="flex items-center gap-3">
            <input type="checkbox" className="w-4 h-4 text-primary-600 rounded border-gray-300" checked={settings.config.ai_feature_summary} onChange={e => updateConfig('ai_feature_summary', e.target.checked)} />
            <span className="text-sm font-medium text-gray-700">Auto Summary Injection</span>
         </label>
         <label className="flex items-center gap-3">
            <input type="checkbox" className="w-4 h-4 text-primary-600 rounded border-gray-300" checked={settings.config.ai_feature_classification} onChange={e => updateConfig('ai_feature_classification', e.target.checked)} />
            <span className="text-sm font-medium text-gray-700">Campaign Structural Classification</span>
         </label>
      </div>
      <button type="button" onClick={() => toast.success('AI configuration updated locally. Save settings to publish changes.')} className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-sm font-medium transition-colors">Test AI Response Network</button>
    </div>
  )

  const renderBooking = () => (
    <div className="space-y-6">
      {renderDurationConfiguration()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div>
          <label className="label">Default Incoming Matrix Status</label>
          <select className="input-field" value={settings.config.booking_default_status} onChange={e => updateConfig('booking_default_status', e.target.value)}>
            <option value="pending">Hold / Pending Verification</option>
            <option value="approved">Auto-Approve Immediately</option>
          </select>
        </div>
        <div>
          <label className="label">Minimum Threshold Budget (Rs.)</label>
          <input type="number" className="input-field" value={settings.config.booking_min_budget} onChange={e => updateConfig('booking_min_budget', e.target.value)} />
        </div>
        <div>
          <label className="label text-red-700 flex items-center gap-1.5">Max Ingests/Day (Cap)</label>
          <input type="number" className="input-field" value={settings.config.booking_max_per_day} onChange={e => updateConfig('booking_max_per_day', e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50 mt-4">
        <div>
          <h4 className="font-semibold text-gray-900 text-sm">Allow Temporal Overlapping</h4>
          <p className="text-xs text-gray-500">Will allow concurrent campaigns to lock identical geographic nodes simultaneously.</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={settings.config.booking_allow_overlap} onChange={(e) => updateConfig('booking_allow_overlap', e.target.checked)} />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
        </label>
      </div>

      <div className="space-y-3 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="w-4 h-4 text-gray-400" />
          <h4 className="font-semibold text-sm text-gray-900">Booking Submission Methods</h4>
        </div>
        <p className="text-xs text-gray-500 -mt-1">Control which submit buttons appear on the client booking page. At least one should be enabled.</p>
        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50">
          <div>
            <h4 className="font-semibold text-gray-900 text-sm">WhatsApp</h4>
            <p className="text-xs text-gray-500">Client can send quotation via WhatsApp message.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={settings.config.booking_method_whatsapp !== false} onChange={(e) => updateConfig('booking_method_whatsapp', e.target.checked)} />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>
        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50">
          <div>
            <h4 className="font-semibold text-gray-900 text-sm">Email PDF</h4>
            <p className="text-xs text-gray-500">Client can receive quotation PDF via email.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={settings.config.booking_method_email !== false} onChange={(e) => updateConfig('booking_method_email', e.target.checked)} />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
          </label>
        </div>
      </div>
    </div>
  )

  const renderSecurity = () => {
    const otpOn = settings.config.security_otp_booking_enable
    const resetOtpOn = settings.config.security_otp_admin_reset_enable
    const tfaOn = settings.config.security_2fa_login_enable
    const ipOn = !!(settings.config.security_ip_restriction || '').trim()
    const anyOtpOn = otpOn || resetOtpOn || tfaOn

    const scoreFeatures = [
      { label: 'OTP', active: otpOn || resetOtpOn },
      { label: '2FA', active: tfaOn },
      { label: 'Rate Limit', active: true },
      { label: 'IP Filter', active: ipOn },
    ]
    const activeCount = scoreFeatures.filter(f => f.active).length
    const scorePalette =
      activeCount === 4 ? { bg: 'from-emerald-50 to-teal-50/50', border: 'border-emerald-200', icon: 'bg-emerald-100', iconColor: 'text-emerald-600', chip: 'bg-emerald-600', label: 'All protections active — fully secured' } :
      activeCount === 3 ? { bg: 'from-blue-50 to-indigo-50/50', border: 'border-blue-200', icon: 'bg-blue-100', iconColor: 'text-blue-600', chip: 'bg-blue-600', label: 'Good — one more protection available' } :
      activeCount === 2 ? { bg: 'from-amber-50 to-yellow-50/50', border: 'border-amber-200', icon: 'bg-amber-100', iconColor: 'text-amber-600', chip: 'bg-amber-500', label: 'Fair — enable more protections below' } :
                          { bg: 'from-rose-50 to-red-50/50', border: 'border-rose-200', icon: 'bg-rose-100', iconColor: 'text-rose-600', chip: 'bg-rose-500', label: 'Weak — several protections are off' }

    const toggleRow = (label, description, configKey, badge) => {
      const isOn = !!settings.config[configKey]
      return (
        <div key={configKey} className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition-all duration-200 ${isOn ? 'border-violet-200 bg-violet-50/60' : 'border-slate-200 bg-slate-50'}`}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-slate-800">{label}</p>
              {badge && <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-violet-700">{badge}</span>}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center shrink-0">
            <input type="checkbox" className="sr-only peer" checked={isOn} onChange={e => updateConfig(configKey, e.target.checked)} />
            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600" />
          </label>
        </div>
      )
    }

    return (
      <div className="space-y-6">

        {/* ── Security Score Banner ──────────────────────────────── */}
        <div className={`rounded-2xl border p-5 bg-gradient-to-r ${scorePalette.bg} ${scorePalette.border}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${scorePalette.icon}`}>
                <ShieldCheck className={`h-5 w-5 ${scorePalette.iconColor}`} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Security Status</p>
                <p className="text-xs text-slate-500 mt-0.5">{scorePalette.label}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {scoreFeatures.map(f => (
                <span key={f.label} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${f.active ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-slate-200 bg-white text-slate-400'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${f.active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  {f.label}
                </span>
              ))}
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold text-white ${scorePalette.chip}`}>
                {activeCount} / 4 active
              </span>
            </div>
          </div>
        </div>

        {/* ── Admin Profile + Access Manager ────────────────────── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-violet-50/40">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
                  <ShieldCheck className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Your Admin Profile</p>
                  <p className="text-xs text-slate-500">Update your name, email and password</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Admin Name</label>
                <input type="text" className="input-field" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} />
              </div>
              <div>
                <label className="label">Admin Email</label>
                <input type="email" className="input-field" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} />
              </div>
              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <input
                    type={showProfilePassword ? 'text' : 'password'}
                    placeholder="Leave blank to keep current"
                    className="input-field pr-10"
                    value={profile.password}
                    onChange={e => setProfile({...profile, password: e.target.value})}
                  />
                  <button type="button" onClick={() => setShowProfilePassword(v => !v)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                    {showProfilePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button type="button" onClick={handleProfileSubmit} disabled={savingProfile || saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50">
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Update Profile
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/40">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
                  <UserCog className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Admin Access Manager</p>
                  <p className="text-xs text-slate-500">{editingAdminId ? 'Editing existing admin account' : 'Add a new admin login'}</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Admin Name</label>
                <input type="text" className="input-field" value={adminForm.name} onChange={e => setAdminForm({ ...adminForm, name: e.target.value })} placeholder="Operations Admin" />
              </div>
              <div>
                <label className="label">Admin Email</label>
                <input type="email" className="input-field" value={adminForm.email} onChange={e => setAdminForm({ ...adminForm, email: e.target.value })} placeholder="admin@olrac.com" />
              </div>
              <div>
                <label className="label">{editingAdminId ? 'New Password' : 'Password'}</label>
                <div className="relative">
                  <input type={showAdminPassword ? 'text' : 'password'} className="input-field pr-10" value={adminForm.password} onChange={e => setAdminForm({ ...adminForm, password: e.target.value })} placeholder={editingAdminId ? 'Leave blank to keep current' : 'Minimum 6 characters'} />
                  <button type="button" onClick={() => setShowAdminPassword(v => !v)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                    {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={handleAdminFormSubmit} disabled={savingAdmin} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 ${editingAdminId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-black'}`}>
                  {savingAdmin ? <Loader2 className="h-4 w-4 animate-spin" /> : editingAdminId ? <PencilLine className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editingAdminId ? 'Save Changes' : 'Add Admin'}
                </button>
                {editingAdminId && (
                  <button type="button" onClick={resetAdminForm} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                    <X className="h-4 w-4" /> Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Admin Accounts List ────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-emerald-50/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Admin Accounts</p>
                <p className="text-xs text-slate-500">{admins.length} admin{admins.length !== 1 ? 's' : ''} registered</p>
              </div>
            </div>
            <button type="button" onClick={() => fetchAdmins()} disabled={adminsLoading} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${adminsLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
          <div className="p-5">
            {adminsLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading admin accounts...</div>
            ) : admins.length ? (
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {admins.map(adminRecord => {
                  const isCurrentAdmin = user?.id === adminRecord.id
                  const isConfirmingDelete = confirmDeleteAdminId === adminRecord.id
                  return (
                    <div key={adminRecord.id} className={`rounded-2xl border p-4 transition-all ${isConfirmingDelete ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${isCurrentAdmin ? 'bg-violet-100 text-violet-700' : 'bg-slate-200 text-slate-600'}`}>
                            {(adminRecord.name || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900 truncate">{adminRecord.name}</p>
                              {isCurrentAdmin && <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-700">You</span>}
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500 truncate">{adminRecord.email}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {isConfirmingDelete ? (
                            <>
                              <button type="button" onClick={() => handleDeleteAdmin(adminRecord.id)} disabled={deletingAdminId === adminRecord.id} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50">
                                {deletingAdminId === adminRecord.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Confirm
                              </button>
                              <button type="button" onClick={() => setConfirmDeleteAdminId(null)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => startEditingAdmin(adminRecord)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
                                <PencilLine className="h-3.5 w-3.5" /> Edit
                              </button>
                              {!isCurrentAdmin && (
                                <button type="button" onClick={() => setConfirmDeleteAdminId(adminRecord.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-100 bg-white px-2.5 py-2 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 hover:border-rose-200">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      {isConfirmingDelete && (
                        <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-100 px-3 py-2">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                          <p className="text-xs font-medium text-rose-700">This will permanently remove this admin account.</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="py-4 text-sm text-slate-500">No admin accounts available yet.</p>
            )}
          </div>
        </div>

        {/* ── Authentication Controls ────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-violet-50/40">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
                <Key className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Authentication Controls</p>
                <p className="text-xs text-slate-500">OTP verification and two-factor enforcement</p>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-3">
            {toggleRow('Booking OTP Verification', 'Require email OTP to confirm client bookings.', 'security_otp_booking_enable')}
            {toggleRow('Admin Password Reset OTP', 'Allow admins to reset passwords via email OTP.', 'security_otp_admin_reset_enable')}
            {toggleRow('Two-Factor Login (2FA)', 'Require OTP on every admin login session.', 'security_2fa_login_enable', 'Recommended')}

            {anyOtpOn && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-4 mt-1 border-t border-slate-100">
                <div>
                  <label className="label">OTP Expiry (Minutes)</label>
                  <input type="number" className="input-field" min="1" max="60" value={settings.config.security_otp_expiry_minutes} onChange={e => updateConfig('security_otp_expiry_minutes', e.target.value)} />
                  <p className="mt-1 text-[11px] text-slate-500">How long the OTP code remains valid.</p>
                </div>
                <div>
                  <label className="label">OTP Max Attempts</label>
                  <input type="number" className="input-field" min="1" max="10" value={settings.config.security_otp_max_attempts} onChange={e => updateConfig('security_otp_max_attempts', e.target.value)} />
                  <p className="mt-1 text-[11px] text-slate-500">Failed attempts before OTP is invalidated.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Rate Limiter · Session · Network ──────────────────── */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* Rate Limiter — always-on */}
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/60 to-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
                  <Activity className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Login Rate Limiter</p>
                  <p className="text-xs text-slate-500">Brute-force protection</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>
            <div className="p-5 space-y-3">
              {[['Max attempts', '5 tries'], ['Lockout duration', '15 minutes'], ['Tracks by', 'Email + IP']].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-bold text-slate-800">{v}</span>
                </div>
              ))}
              <p className="pt-2 border-t border-emerald-100 text-[11px] text-slate-400">Always-on server protection. Cannot be disabled from this panel.</p>
            </div>
          </div>

          {/* Session & Token */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/60">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200">
                  <Clock className="h-4 w-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Session & Token</p>
                  <p className="text-xs text-slate-500">Token lifetime and idle timeout</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Token Expiry (Hours)</label>
                <input type="number" className="input-field" value={settings.config.security_token_expiry} onChange={e => updateConfig('security_token_expiry', e.target.value)} />
                <p className="mt-1 text-[11px] text-slate-500">How long login sessions stay valid.</p>
              </div>
              <div>
                <label className="label">Session Timeout (Minutes)</label>
                <input type="number" className="input-field" value={settings.config.security_session_timeout} onChange={e => updateConfig('security_session_timeout', e.target.value)} />
                <p className="mt-1 text-[11px] text-slate-500">Auto-logout after this idle period.</p>
              </div>
            </div>
          </div>

          {/* Network Access */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-100/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200">
                  <MapPin className="h-4 w-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Network Access</p>
                  <p className="text-xs text-slate-500">IP range restrictions</p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-600">UI only</span>
            </div>
            <div className="p-5">
              <label className="label">Allowed IP Ranges</label>
              <input type="text" placeholder="e.g. 192.168.1.0/24" className="input-field" value={settings.config.security_ip_restriction} onChange={e => updateConfig('security_ip_restriction', e.target.value)} />
              <p className="mt-2 text-[11px] text-slate-500">Comma-separated CIDR blocks. Leave empty to allow all. Backend enforcement coming soon.</p>
            </div>
          </div>

        </div>
      </div>
    )
  }

  const renderQuotation = () => (
    <div className="space-y-6">
      {/* Quotation Company Identity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Briefcase className="h-4 w-4 text-slate-400" />
            Company Identity
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Company Name</label>
              <input type="text" className="input-field" value={settings.config.quotation_company_name} onChange={e => updateConfig('quotation_company_name', e.target.value)} />
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" /> Address</label>
              <textarea className="input-field" rows={3} value={settings.config.quotation_address} onChange={e => updateConfig('quotation_address', e.target.value)} />
            </div>
            <div>
              <label className="label">GST / VAT Registration</label>
              <input type="text" className="input-field uppercase" value={settings.config.quotation_gst} onChange={e => updateConfig('quotation_gst', e.target.value)} placeholder="29ABCDE1234F1Z5" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Enable Tax Calculation</label>
                <button
                  type="button"
                  onClick={() => updateConfig('quotation_tax_enabled', !(settings.config.quotation_tax_enabled ?? true))}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    (settings.config.quotation_tax_enabled ?? true) ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${(settings.config.quotation_tax_enabled ?? true) ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
              <label className="label text-slate-400">Default Tax Rate (%)</label>
              <input type="number" className="input-field" value={settings.config.quotation_tax_rate} onChange={e => updateConfig('quotation_tax_rate', e.target.value)} placeholder="18" disabled={!(settings.config.quotation_tax_enabled ?? true)} />
            </div>
          </div>
        </div>

        {/* Financial & Bank Details */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <FileText className="h-4 w-4 text-slate-400" />
            Bank & Remittance Details
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Bank Name</label>
              <input type="text" className="input-field" value={settings.config.quotation_bank_name} onChange={e => updateConfig('quotation_bank_name', e.target.value)} placeholder="e.g. HDFC Bank" />
            </div>
            <div>
              <label className="label">Account Holder Name</label>
              <input type="text" className="input-field" value={settings.config.quotation_account_name} onChange={e => updateConfig('quotation_account_name', e.target.value)} placeholder="OLRAC Advertising" />
            </div>
            <div>
              <label className="label">Account Number</label>
              <input type="text" className="input-field" value={settings.config.quotation_account_number} onChange={e => updateConfig('quotation_account_number', e.target.value)} placeholder="50200012345678" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">IFSC Code</label>
                <input type="text" className="input-field uppercase" value={settings.config.quotation_ifsc} onChange={e => updateConfig('quotation_ifsc', e.target.value)} placeholder="HDFC0001234" />
              </div>
              <div>
                <label className="label">UPI ID</label>
                <input type="text" className="input-field" value={settings.config.quotation_upi} onChange={e => updateConfig('quotation_upi', e.target.value)} placeholder="olrac@upi" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logo */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <ImageIcon className="h-4 w-4 text-slate-400" />
          Quotation Header Logo
        </div>
        <div className="flex items-center gap-4 p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50">
          <div className="w-16 h-16 bg-white rounded-lg shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
            {settings.config.quotation_logo_url ? (
              <img src={settings.config.quotation_logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <label className="btn-ghost text-sm px-4 py-2 flex-1 text-center hover:bg-gray-200 cursor-pointer">
            Upload Logo
            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleConfigImageUpload(e, 'quotation_logo_url')} />
          </label>
        </div>
        <p className="text-[11px] text-gray-500 mt-2">Shown top-left of every quotation. Falls back to the platform logo if empty.</p>
      </div>

      {/* Quotation Seal */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <ImageIcon className="h-4 w-4 text-slate-400" />
          Quotation Authorized Seal
        </div>
        <div className="flex items-center gap-4 p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50">
          <div className="w-16 h-16 bg-white rounded-lg shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
            {settings.config.quotation_seal_url ? (
              <img src={settings.config.quotation_seal_url} alt="Seal" className="w-full h-full object-contain" />
            ) : (
              <ImageIcon className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <label className="btn-ghost text-sm px-4 py-2 text-center hover:bg-gray-200 cursor-pointer">
              Upload Seal
              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleConfigImageUpload(e, 'quotation_seal_url')} />
            </label>
            {settings.config.quotation_seal_url && (
              <button type="button" className="text-xs text-red-500 hover:text-red-700 text-center" onClick={() => updateConfig('quotation_seal_url', '')}>
                Remove Seal
              </button>
            )}
          </div>
        </div>
        <p className="text-[11px] text-gray-500 mt-2">Stamp/seal shown near the authorized signatory on every quotation. Falls back to invoice seal if empty.</p>
      </div>

      {/* Quotation Defaults */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-amber-50/40">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
              <FileText className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Quotation Defaults</p>
              <p className="text-xs text-slate-500">Pre-fill values that appear when opening a new quotation editor</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Default Slot Duration</label>
              <input type="text" className="input-field" value={settings.config.quotation_default_slot_duration} onChange={e => updateConfig('quotation_default_slot_duration', e.target.value)} placeholder="e.g. 20 Sec" />
            </div>
            <div>
              <label className="label">Default Service Description</label>
              <input type="text" className="input-field" value={settings.config.quotation_default_service_description} onChange={e => updateConfig('quotation_default_service_description', e.target.value)} placeholder="Digital Ad Placement" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Auto-copy Quotation to Admin Email</p>
              <p className="text-xs text-slate-500">Automatically send a copy to the admin email whenever a quotation is sent to a client.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
              <input type="checkbox" className="sr-only peer" checked={settings.config.quotation_send_copy_to_admin} onChange={e => updateConfig('quotation_send_copy_to_admin', e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <div className="space-y-4 pt-3 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.14em]">Default Terms & Conditions Text</p>
            <div>
              <label className="label">01. Payment Terms</label>
              <textarea className="input-field" rows={3} value={settings.config.quotation_default_terms_payment} onChange={e => updateConfig('quotation_default_terms_payment', e.target.value)} />
            </div>
            <div>
              <label className="label">02. Content Policy</label>
              <textarea className="input-field" rows={3} value={settings.config.quotation_default_terms_content} onChange={e => updateConfig('quotation_default_terms_content', e.target.value)} />
            </div>
            <div>
              <label className="label">03. Downtime Policy</label>
              <textarea className="input-field" rows={3} value={settings.config.quotation_default_terms_downtime} onChange={e => updateConfig('quotation_default_terms_downtime', e.target.value)} />
            </div>
            <div>
              <label className="label">Brand Priming Statement</label>
              <textarea className="input-field" rows={3} value={settings.config.quotation_default_terms_branding} onChange={e => updateConfig('quotation_default_terms_branding', e.target.value)} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderIntegrations = () => (
    <div className="space-y-6">
      {/* PostHog */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-orange-50/40">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100">
              <Plug className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-900">PostHog Analytics</p>
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 rounded-full">PostHog</span>
              </div>
              <p className="text-xs text-slate-500">Track visitors, booking funnels, and website behaviour on your client site.</p>
            </div>
            <a
              href="https://posthog.com"
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
            >
              posthog.com <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
            <strong>How to connect:</strong> Create a project at posthog.com → copy the <em>Project API Key</em> (public, for tracking) and a <em>Personal API Key</em> (private, for the Insights dashboard query). Find your Project ID in the project URL.
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Project API Key <span className="text-slate-400 font-normal">(public · for tracking)</span></label>
              <input
                type="text"
                className="input-field font-mono text-xs"
                placeholder="phc_xxxxxxxxxxxxxxxxxxxx"
                value={settings.config.posthog_public_key || ''}
                onChange={e => updateConfig('posthog_public_key', e.target.value)}
              />
              <p className="mt-1 text-[11px] text-slate-400">Embedded in the client site JS bundle. Used to send events to PostHog.</p>
            </div>
            <div>
              <label className="label">Project ID</label>
              <input
                type="text"
                className="input-field font-mono text-xs"
                placeholder="12345"
                value={settings.config.posthog_project_id || ''}
                onChange={e => updateConfig('posthog_project_id', e.target.value)}
              />
              <p className="mt-1 text-[11px] text-slate-400">Found in your PostHog project URL: /project/<strong>12345</strong>/…</p>
            </div>
            <div>
              <label className="label">Personal API Key <span className="text-slate-400 font-normal">(secret · for Insights queries)</span></label>
              <input
                type="password"
                className="input-field font-mono text-xs"
                placeholder="phx_xxxxxxxxxxxxxxxxxxxx"
                value={settings.config.posthog_personal_api_key || ''}
                onChange={e => updateConfig('posthog_personal_api_key', e.target.value)}
              />
              <p className="mt-1 text-[11px] text-slate-400">Never shared publicly. Used server-side to query analytics in the Insights page.</p>
            </div>
            <div>
              <label className="label">PostHog Host</label>
              <input
                type="text"
                className="input-field font-mono text-xs"
                placeholder="https://us.posthog.com"
                value={settings.config.posthog_host || 'https://us.posthog.com'}
                onChange={e => updateConfig('posthog_host', e.target.value)}
              />
              <p className="mt-1 text-[11px] text-slate-400">US cloud: us.posthog.com · EU cloud: eu.posthog.com · or your self-hosted URL.</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold text-slate-700 mb-2">Events tracked automatically after setup</p>
            <div className="flex flex-wrap gap-2">
              {['$pageview', 'cta_clicked', 'screen_viewed', 'book_now_clicked', 'booking_started', 'booking_submitted'].map(ev => (
                <span key={ev} className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-mono font-medium text-slate-200">{ev}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-5 lg:px-8">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white shrink-0" style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}>
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Platform Settings</h1>
              <p className="text-sm text-slate-500 mt-0.5">Manage branding, integrations, booking rules and invoices.</p>
            </div>
          </div>
          <button
            onClick={handleSettingsSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)' }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 py-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar nav */}
          <div className="lg:w-52 shrink-0">
            <div className="rounded-2xl border border-slate-200 bg-white p-2 sticky top-[88px] shadow-sm">
              <nav className="space-y-0.5">
                {TABS.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all text-left ${
                        isActive
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="text-sm font-semibold">{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden min-h-[500px]">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/60">
                <h2 className="text-base font-bold text-slate-900">
                  {TABS.find(t => t.id === activeTab)?.label}
                </h2>
              </div>
              <div className="p-6 lg:p-8">
                <form onSubmit={handleSettingsSubmit}>
                  {activeTab === 'general' && renderGeneral()}
                  {activeTab === 'whatsapp' && renderWhatsApp()}
                  {activeTab === 'notifications' && renderNotifications()}
                  {activeTab === 'ai' && renderAI()}
                  {activeTab === 'booking' && renderBooking()}
                  {activeTab === 'security' && renderSecurity()}
                  {activeTab === 'quotation' && renderQuotation()}
                  {activeTab === 'integrations' && renderIntegrations()}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
