import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/axios'
import { DEFAULT_WHATSAPP_TEMPLATE } from '../utils/whatsappTemplate'

const defaultSettings = {
  whatsapp_number: '919876543210',
  contact_email: 'support@olrac.com',
  config: {
    general_app_name: 'OLRAC Advertising',
    general_contact_phone: '',
    general_logo_url: '',
    general_brand_images: [],
    invoice_company_name: 'OLRAC Advertising Pvt Ltd',
    invoice_address: '',
    invoice_gst: '',
    invoice_logo_url: '',
    invoice_seal_url: '',
    whatsapp_template: DEFAULT_WHATSAPP_TEMPLATE,
    whatsapp_enable: true,
    whatsapp_message_format: 'text',
    booking_base_slot_duration_seconds: 20,
    booking_default_duration_id: 'd3',
    booking_method_whatsapp: true,
    booking_method_email: true,
    security_otp_booking_enable: true,
    booking_durations: [
      { id: 'd1', label: '1 Day', days: 1, hours: 24 },
      { id: 'd2', label: '1 Week', days: 7, hours: 168 },
      { id: 'd3', label: '1 Month', days: 30, hours: 720 },
      { id: 'd4', label: '6 Months', days: 180, hours: 4320 },
      { id: 'd5', label: '1 Year', days: 365, hours: 8760 },
    ],
  },
}

const PublicSettingsContext = createContext({
  settings: defaultSettings,
  refreshSettings: async () => {},
})

export function PublicSettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings)

  const refreshSettings = async () => {
    try {
      const res = await api.get('/screens/config/public')
      const nextSettings = {
        whatsapp_number: res.data.whatsapp_number || defaultSettings.whatsapp_number,
        contact_email: res.data.contact_email || defaultSettings.contact_email,
        config: { ...defaultSettings.config, ...(res.data.config || {}) },
      }
      const next = JSON.stringify(nextSettings)
      localStorage.setItem('olrac_public_settings', next)
      setSettings(prev => JSON.stringify(prev) === next ? prev : nextSettings)
    } catch {
      localStorage.setItem('olrac_public_settings', JSON.stringify(defaultSettings))
      setSettings(prev => JSON.stringify(prev) === JSON.stringify(defaultSettings) ? prev : defaultSettings)
    }
  }

  useEffect(() => {
    refreshSettings()

    const handleUpdate = () => {
      refreshSettings()
    }

    window.addEventListener('olrac-settings-updated', handleUpdate)
    return () => window.removeEventListener('olrac-settings-updated', handleUpdate)
  }, [])

  return (
    <PublicSettingsContext.Provider value={{ settings, refreshSettings }}>
      {children}
    </PublicSettingsContext.Provider>
  )
}

export function usePublicSettings() {
  return useContext(PublicSettingsContext)
}
