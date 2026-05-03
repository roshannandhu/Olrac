import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from 'react-hot-toast'
import posthog from 'posthog-js'
import App from './App'
import { AuthProvider } from './context/AuthProvider'
import { PublicSettingsProvider } from './context/PublicSettingsContext'
import { isAdminSite } from './utils/siteMode'
import './index.css'

// Init PostHog on the client site only.
// Key is read from admin settings (posthog_public_key) via the public config
// endpoint, then stored in localStorage for instant subsequent loads.
if (!isAdminSite) {
  ;(async () => {
    try {
      const cached = localStorage.getItem('olrac_ph_key')
      const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
      const res = await fetch(`${apiBase}/screens/config/public`)
      const data = await res.json()
      const key = data?.config?.posthog_public_key || cached || import.meta.env.VITE_POSTHOG_KEY || ''
      const host = data?.config?.posthog_host || import.meta.env.VITE_POSTHOG_HOST || 'https://us.posthog.com'
      if (key) {
        localStorage.setItem('olrac_ph_key', key)
        posthog.init(key, {
          api_host: host,
          autocapture: true,
          capture_pageview: true,
          persistence: 'localStorage+cookie',
          loaded(ph) {
            if (import.meta.env.DEV) ph.opt_out_capturing()
          },
        })
      }
    } catch {
      // PostHog init failure must never break the app.
    }
  })()
}

const dismissBootLoader = () => {
  if (typeof window !== 'undefined' && typeof window.__olracHideBootLoader === 'function') {
    window.__olracHideBootLoader()
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <HelmetProvider>
    <BrowserRouter>
      <AuthProvider>
        <PublicSettingsProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#1e1e2e',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                padding: '14px 20px',
                fontSize: '14px',
              },
              success: {
                iconTheme: { primary: '#7c3aed', secondary: '#fff' },
              },
            }}
          />
        </PublicSettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  </HelmetProvider>
)

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    dismissBootLoader()
  })
})
