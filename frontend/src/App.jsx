import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/auth-context'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'

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
  return (
    <Routes>
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
  )
}

export default function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading Olrac Adverse...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f8fa]">
      <Navbar />
      <main className="flex-1">
        {isAdminSite ? <AdminRoutes /> : <ClientRoutes />}
      </main>
      {!isAdminSite && <Footer />}
    </div>
  )
}
