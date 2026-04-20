import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { AuthProvider } from './context/AuthProvider'
import { PublicSettingsProvider } from './context/PublicSettingsContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
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
  </React.StrictMode>
)
