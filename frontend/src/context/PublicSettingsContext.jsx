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
      setSettings(nextSettings)
      localStorage.setItem('olrac_public_settings', JSON.stringify(nextSettings))
    } catch {
      setSettings(defaultSettings)
      localStorage.setItem('olrac_public_settings', JSON.stringify(defaultSettings))
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
