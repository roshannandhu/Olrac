import React, { useEffect, useRef, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigationType } from 'react-router-dom'
import { useAuth } from './context/auth-context'
import { AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import LoadingScreen from './components/LoadingScreen'

// Pages
import Landing from './pages/Landing'
import About from './pages/About'
import Booking from './pages/Booking'
import Login from './pages/Login'
import Locations from './pages/Locations'
import LocationDetail from './pages/LocationDetail'
import AdminDashboard from './pages/AdminDashboard'
import AdminInsights from './pages/AdminInsights'
import AdminBookings from './pages/AdminBookings'
import AdminScreens from './pages/AdminScreens'
import AdminSettings from './pages/AdminSettings'
import { adminSiteUrl, isAdminSite } from './utils/siteMode'
import { hasSeenIntroSplash, LOADER_DELAY_MS, LOADER_MIN_VISIBLE_MS } from './utils/displayExperience'

function ScrollToTop() {
  const { pathname } = useLocation()
  const navType = useNavigationType()
  useEffect(() => {
    if (navType !== 'POP') window.scrollTo(0, 0)
  }, [pathname, navType])
  return null
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info?.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#050508]">
          <div className="text-center px-6">
            <h1 className="text-4xl font-bold text-white mb-4">Something went wrong</h1>
            <p className="text-gray-400 mb-8">An unexpected error occurred. Please refresh the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
        <p className="text-gray-500">Page not found</p>
        <a href="/" className="btn-primary mt-6 inline-flex text-sm">Go Home</a>
      </div>
    </div>
  )
}

function ExternalRedirect({ to }) {
  if (typeof window !== 'undefined') {
    window.location.replace(to)
  }

  return null
}

function AdminRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login adminLogin />} />

      <Route path="/" element={
        <ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>
      } />
      <Route path="/insights" element={
        <ProtectedRoute adminOnly><AdminInsights /></ProtectedRoute>
      } />
      <Route path="/bookings" element={
        <ProtectedRoute adminOnly><AdminBookings /></ProtectedRoute>
      } />
      <Route path="/screens" element={
        <ProtectedRoute adminOnly><AdminScreens /></ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute adminOnly><AdminSettings /></ProtectedRoute>
      } />

      <Route path="/admin" element={<Navigate to="/" replace />} />
      <Route path="/admin/insights" element={<Navigate to="/insights" replace />} />
      <Route path="/admin/dashboard/insights" element={<Navigate to="/insights" replace />} />
      <Route path="/admin/dashborad/insights" element={<Navigate to="/insights" replace />} />
      <Route path="/admin/bookings" element={<Navigate to="/bookings" replace />} />
      <Route path="/admin/screens" element={<Navigate to="/screens" replace />} />
      <Route path="/admin/settings" element={<Navigate to="/settings" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function ClientRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/about" element={<About />} />
      <Route path="/booking" element={<Booking />} />
      <Route path="/login" element={<Navigate to="/locations" replace />} />
      <Route path="/signup" element={<Navigate to="/locations" replace />} />

      {/* Client - Locations */}
      <Route path="/locations" element={<Locations />} />
      <Route path="/location/:screenId" element={<LocationDetail />} />

      {/* Client - Dashboard */}
      <Route path="/dashboard" element={<Navigate to="/locations" replace />} />

      {/* Legacy checkout redirect */}
      <Route path="/checkout/:screenId" element={
        <Navigate to="/locations" replace />
      } />

      {/* Legacy admin paths move to admin.olrac.com */}
      <Route path="/admin/*" element={<ExternalRedirect to={adminSiteUrl} />} />

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  const { loading } = useAuth()
  const location = useLocation()
  const [showLoadingScreen, setShowLoadingScreen] = useState(false)
  const visibleSinceRef = useRef(0)

  useEffect(() => {
    let timer

    if (loading) {
      if (!showLoadingScreen) {
        timer = window.setTimeout(() => {
          visibleSinceRef.current = Date.now()
          setShowLoadingScreen(true)
        }, LOADER_DELAY_MS)
      }
    } else if (showLoadingScreen) {
      const elapsed = Date.now() - visibleSinceRef.current
      timer = window.setTimeout(() => {
        setShowLoadingScreen(false)
      }, Math.max(0, LOADER_MIN_VISIBLE_MS - elapsed))
    }

    return () => window.clearTimeout(timer)
  }, [loading, showLoadingScreen])

  const shouldSuppressLoaderForIntro = !isAdminSite && location.pathname === '/' && !hasSeenIntroSplash()
  const shouldRenderLoadingScreen = showLoadingScreen && !shouldSuppressLoaderForIntro

  return (
    <ErrorBoundary>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col bg-[#050508]">
        <AnimatePresence>
          {shouldRenderLoadingScreen && <LoadingScreen />}
        </AnimatePresence>
        <Navbar />
        <main className="flex-1">
          {isAdminSite ? <AdminRoutes /> : <ClientRoutes />}
        </main>
        {!isAdminSite && <Footer />}
      </div>
    </ErrorBoundary>
  )
}
