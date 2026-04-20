import { useState, useEffect } from 'react'
import {
  Settings, Save, Loader2, MessageSquare, LayoutTemplate,
  Bell, Brain, Calendar, FileText, Image as ImageIcon, Briefcase, Server, Clock, MapPin, ShieldCheck, Trash2
} from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../context/auth-context'
import { usePublicSettings } from '../context/PublicSettingsContext'
import { DEFAULT_WHATSAPP_TEMPLATE, WHATSAPP_TEMPLATE_VARIABLES, fillWhatsAppTemplate } from '../utils/whatsappTemplate'

const defaultConfig = {
  general_app_name: 'OLRAC Advertising',
  general_contact_phone: '',
  general_logo_url: '',
  general_brand_images: [],
  landing_card_1_videos: [],
  landing_card_2_videos: [],
  landing_card_3_videos: [],
  whatsapp_enable: true,
  whatsapp_template: DEFAULT_WHATSAPP_TEMPLATE,
  notifications_enable: true,
  notifications_smtp: '',
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
  booking_max_per_day: '10',
  booking_allow_overlap: false,
  security_token_expiry: '24',
  security_session_timeout: '60',
  security_ip_restriction: '',
  invoice_company_name: 'OLRAC Advertising Pvt Ltd',
  invoice_address: '',
  invoice_gst: '',
  invoice_logo_url: '',
  invoice_seal_url: '',
  invoice_title: 'INVOICE',
  invoice_prefix: 'INV',
  invoice_primary_color: '#334155',
  invoice_show_seal: true,
  invoice_show_slot_details: true,
  invoice_signature_name: '',
  invoice_signature_title: 'Authorized Signatory',
  invoice_payment_terms: '',
  invoice_notes: '',
  invoice_footer_note: '',
  invoice_bank_name: '',
  invoice_account_name: '',
  invoice_account_number: '',
  invoice_ifsc: '',
  invoice_upi: '',
}

export default function AdminSettings() {
  const { user, updateStoredUser } = useAuth()
  const { refreshSettings } = usePublicSettings()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  // Global Settings State (matches SettingsUpdate schema)
  const [settings, setSettings] = useState({
    whatsapp_number: '',
    contact_email: '',
    config: defaultConfig
  })

  // Security Profile State (for the separate endpoint)
  const [profile, setProfile] = useState({ name: '', email: '', password: '' })

  const TABS = [
    { id: 'general', label: 'General', icon: LayoutTemplate },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'ai', label: 'AI Configuration', icon: Brain },
    { id: 'booking', label: 'Booking Logic', icon: Calendar },
    { id: 'security', label: 'Security', icon: ShieldCheck },
    { id: 'invoice', label: 'Invoice Format', icon: FileText },
  ]

  useEffect(() => {
    fetchSettings()
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
      setSettings({
        whatsapp_number: res.data.whatsapp_number || '',
        contact_email: res.data.contact_email || '',
        config: { ...defaultConfig, ...(res.data.config || {}) }
      })
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to load platform settings')
    } finally {
      setLoading(false)
    }
  }

  const updateConfig = (key, value) => {
    setSettings(prev => ({
      ...prev,
      config: { ...prev.config, [key]: value }
    }))
  }

  const persistSettingsState = async (nextSettings, successMessage = 'Settings published successfully') => {
    const res = await api.put('/admin/settings', nextSettings)
    const normalizedSettings = {
      whatsapp_number: res.data.whatsapp_number || '',
      contact_email: res.data.contact_email || '',
      config: { ...defaultConfig, ...(res.data.config || {}) }
    }
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
      await persistSettingsState(settings, silent ? '' : 'Settings published successfully')
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

  const renderNotifications = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50">
        <div>
          <h4 className="font-semibold text-gray-900 text-sm">SMTP / Email Relay</h4>
          <p className="text-xs text-gray-500">Enable system-wide email transactional notifications.</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={settings.config.notifications_enable} onChange={(e) => updateConfig('notifications_enable', e.target.checked)} />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
        </label>
      </div>

      <div>
        <label className="label flex items-center gap-1.5"><Server className="w-4 h-4 text-gray-400" /> SMTP Configuration String</label>
        <input type="text" className="input-field" placeholder="smtp://user:pass@host:port" value={settings.config.notifications_smtp} onChange={e => updateConfig('notifications_smtp', e.target.value)} />
      </div>

      <div className="space-y-4 pt-4 border-t border-gray-100">
        <h4 className="font-semibold text-sm text-gray-900 border-b border-gray-100 pb-2">Status Layout Templates</h4>
        <div>
          <label className="label">Booking Created Template</label>
          <textarea className="input-field" rows={2} value={settings.config.notifications_template_created} onChange={e => updateConfig('notifications_template_created', e.target.value)} />
        </div>
        <div>
          <label className="label">Booking Approved Template</label>
          <textarea className="input-field" rows={2} value={settings.config.notifications_template_approved} onChange={e => updateConfig('notifications_template_approved', e.target.value)} />
        </div>
        <div>
          <label className="label">Booking Rejected Template</label>
          <textarea className="input-field" rows={2} value={settings.config.notifications_template_rejected} onChange={e => updateConfig('notifications_template_rejected', e.target.value)} />
        </div>
      </div>
      <button type="button" onClick={() => toast.success('SMTP settings updated locally. Save settings to publish changes.')} className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">Send Test Email</button>
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
          <label className="label flex items-center gap-1.5"><Clock className="w-4 h-4 text-gray-400" /> Default Slot Duration (Days)</label>
          <input type="number" className="input-field" value={settings.config.booking_slot_duration} onChange={e => updateConfig('booking_slot_duration', e.target.value)} />
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
    </div>
  )

  const renderSecurity = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ShieldCheck className="h-4 w-4 text-slate-400" />
            Admin Profile
          </div>
          <p className="text-xs text-slate-500">Update admin identity and password. These changes apply to the current admin account.</p>
          <div className="mt-4 space-y-4">
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
              <input type="password" placeholder="Leave blank to keep current password" className="input-field" value={profile.password} onChange={e => setProfile({...profile, password: e.target.value})} />
            </div>
            <button type="button" onClick={handleProfileSubmit} disabled={savingProfile || saving} className="btn-primary text-sm px-5 bg-slate-900 hover:bg-black disabled:opacity-50">
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Admin Profile'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Settings className="h-4 w-4 text-slate-400" />
            Session & Token Rules
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="label">Token Expiry (Hours)</label>
              <input type="number" className="input-field" value={settings.config.security_token_expiry} onChange={e => updateConfig('security_token_expiry', e.target.value)} />
              <p className="mt-1 text-[11px] text-slate-500">Controls how long access tokens remain valid.</p>
            </div>
            <div>
              <label className="label">Session Timeout (Minutes)</label>
              <input type="number" className="input-field" value={settings.config.security_session_timeout} onChange={e => updateConfig('security_session_timeout', e.target.value)} />
              <p className="mt-1 text-[11px] text-slate-500">Auto-logout idle admins after this period.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <MapPin className="h-4 w-4 text-slate-400" />
          IP Restrictions
        </div>
        <label className="label">Allowed IP Ranges</label>
        <input type="text" placeholder="e.g. 192.168.1.0/24, 10.0.0.0/16" className="input-field" value={settings.config.security_ip_restriction} onChange={e => updateConfig('security_ip_restriction', e.target.value)} />
        <p className="mt-1 text-[11px] text-slate-500">Comma-separated CIDR blocks. Leave empty to allow all.</p>
      </div>
    </div>
  )

  const renderInvoice = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Briefcase className="h-4 w-4 text-slate-400" />
            Invoice Identity
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Invoice Title</label>
              <input type="text" className="input-field" value={settings.config.invoice_title} onChange={e => updateConfig('invoice_title', e.target.value)} />
            </div>
            <div>
              <label className="label">Invoice Prefix</label>
              <input type="text" className="input-field max-w-sm uppercase" value={settings.config.invoice_prefix} onChange={e => updateConfig('invoice_prefix', e.target.value)} placeholder="INV" />
            </div>
            <div>
              <label className="label">Company Name</label>
              <input type="text" className="input-field" value={settings.config.invoice_company_name} onChange={e => updateConfig('invoice_company_name', e.target.value)} />
            </div>
            <div>
              <label className="label flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" /> Billing Address</label>
              <textarea className="input-field" rows={3} value={settings.config.invoice_address} onChange={e => updateConfig('invoice_address', e.target.value)} />
            </div>
            <div>
              <label className="label">GST / VAT Registration</label>
              <input type="text" className="input-field max-w-sm uppercase" value={settings.config.invoice_gst} onChange={e => updateConfig('invoice_gst', e.target.value)} placeholder="29ABCDE1234F1Z5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <ImageIcon className="h-4 w-4 text-slate-400" />
            Branding & Layout
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Primary Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="h-10 w-12 rounded-lg border border-slate-200"
                  value={settings.config.invoice_primary_color}
                  onChange={(e) => updateConfig('invoice_primary_color', e.target.value)}
                />
                <input
                  type="text"
                  className="input-field"
                  value={settings.config.invoice_primary_color}
                  onChange={(e) => updateConfig('invoice_primary_color', e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Show Seal / Stamp</p>
                <p className="text-xs text-slate-500">Toggle the stamp block on the invoice signature area.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={settings.config.invoice_show_seal} onChange={(e) => updateConfig('invoice_show_seal', e.target.checked)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">Show Slot Details</p>
                <p className="text-xs text-slate-500">Display slots booked and slot duration on invoices.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={settings.config.invoice_show_slot_details} onChange={(e) => updateConfig('invoice_show_slot_details', e.target.checked)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div>
              <label className="label">Invoice Header Logo</label>
              <div className="flex items-center gap-4 p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50">
                <div className="w-16 h-16 bg-white rounded-lg shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
                  {settings.config.invoice_logo_url ? (
                    <img src={settings.config.invoice_logo_url} alt="Invoice logo" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <label className="btn-ghost text-sm px-4 py-2 w-full text-center hover:bg-gray-200 cursor-pointer">
                  Upload Invoice Logo
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleConfigImageUpload(e, 'invoice_logo_url')} />
                </label>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Shown in the invoice header. If empty, the platform logo will be used.</p>
            </div>

            <div>
              <label className="label">Invoice Seal / Stamp</label>
              <div className="flex items-center gap-4 p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50">
                <div className="w-16 h-16 bg-white rounded-lg shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden">
                  {settings.config.invoice_seal_url ? (
                    <img src={settings.config.invoice_seal_url} alt="Invoice seal" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <label className="btn-ghost text-sm px-4 py-2 w-full text-center hover:bg-gray-200 cursor-pointer">
                  Upload Invoice Seal
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleConfigImageUpload(e, 'invoice_seal_url')} />
                </label>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Used only in the authorized seal/signature area of the invoice.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Briefcase className="h-4 w-4 text-slate-400" />
            Payment Details
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Bank Name</label>
              <input type="text" className="input-field" value={settings.config.invoice_bank_name} onChange={e => updateConfig('invoice_bank_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Account Name</label>
              <input type="text" className="input-field" value={settings.config.invoice_account_name} onChange={e => updateConfig('invoice_account_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Account Number</label>
              <input type="text" className="input-field" value={settings.config.invoice_account_number} onChange={e => updateConfig('invoice_account_number', e.target.value)} />
            </div>
            <div>
              <label className="label">IFSC / Swift</label>
              <input type="text" className="input-field" value={settings.config.invoice_ifsc} onChange={e => updateConfig('invoice_ifsc', e.target.value)} />
            </div>
            <div>
              <label className="label">UPI ID</label>
              <input type="text" className="input-field" value={settings.config.invoice_upi} onChange={e => updateConfig('invoice_upi', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <FileText className="h-4 w-4 text-slate-400" />
            Notes & Terms
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">Invoice Notes</label>
              <textarea className="input-field" rows={3} value={settings.config.invoice_notes} onChange={e => updateConfig('invoice_notes', e.target.value)} placeholder="Any special instructions for the client." />
            </div>
            <div>
              <label className="label">Payment Terms</label>
              <textarea className="input-field" rows={3} value={settings.config.invoice_payment_terms} onChange={e => updateConfig('invoice_payment_terms', e.target.value)} placeholder="Due within 15 days. Late fee applicable." />
            </div>
            <div>
              <label className="label">Footer Note</label>
              <input type="text" className="input-field" value={settings.config.invoice_footer_note} onChange={e => updateConfig('invoice_footer_note', e.target.value)} placeholder="This is a system-generated invoice." />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Briefcase className="h-4 w-4 text-slate-400" />
          Signature Block
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Signature Name</label>
            <input type="text" className="input-field" value={settings.config.invoice_signature_name} onChange={e => updateConfig('invoice_signature_name', e.target.value)} placeholder="Authorized by OLRAC Advertising" />
          </div>
          <div>
            <label className="label">Signature Title</label>
            <input type="text" className="input-field" value={settings.config.invoice_signature_title} onChange={e => updateConfig('invoice_signature_title', e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="page-container max-w-[1400px] mx-auto px-4 py-8 animate-fade-in bg-[#fafafa] min-h-screen">
      
      {/* Upper Header Row */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
             <Settings className="w-8 h-8 text-primary-600" />
             Platform Settings
          </h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">Update platform behavior, branding, booking rules, and invoice settings from one place.</p>
        </div>
        <button 
           onClick={handleSettingsSubmit}
           disabled={saving}
           className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold shadow-sm hover:shadow-md hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save Settings
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
         {/* Left Side: Navigation */}
         <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 sticky top-24">
               <nav className="space-y-1">
                  {TABS.map((tab) => {
                     const Icon = tab.icon
                     const isActive = activeTab === tab.id
                     return (
                        <button
                           key={tab.id}
                           onClick={() => setActiveTab(tab.id)}
                           className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                              isActive 
                              ? 'bg-primary-50 text-primary-700' 
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                           }`}
                        >
                           <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                           {tab.label}
                        </button>
                     )
                  })}
               </nav>
            </div>
         </div>

         {/* Right Side: Content Area */}
         <div className="flex-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
               {/* Content Header */}
               <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                     {TABS.find(t => t.id === activeTab)?.label} Parameters
                  </h2>
               </div>
               
               {/* Content Body */}
               <div className="p-8">
                  <form onSubmit={handleSettingsSubmit}>
                     {activeTab === 'general' && renderGeneral()}
                     {activeTab === 'whatsapp' && renderWhatsApp()}
                     {activeTab === 'notifications' && renderNotifications()}
                     {activeTab === 'ai' && renderAI()}
                     {activeTab === 'booking' && renderBooking()}
                     {activeTab === 'security' && renderSecurity()}
                     {activeTab === 'invoice' && renderInvoice()}
                  </form>
               </div>
            </div>
         </div>
      </div>

    </div>
  )
}
