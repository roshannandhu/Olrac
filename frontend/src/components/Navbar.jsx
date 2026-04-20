import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { usePublicSettings } from '../context/PublicSettingsContext'
import { adminPath, isAdminSite } from '../utils/siteMode'
import {
  Monitor, Menu, X, LogOut, LayoutDashboard,
  BookOpen, BarChart3, MapPin, Settings
} from 'lucide-react'

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const { settings } = usePublicSettings()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const appName = settings.config.general_app_name || 'OLRAC Advertising'
  const logoUrl = settings.config.general_logo_url

  const handleLogout = () => {
    logout()
    navigate(isAdminSite ? '/login' : '/')
  }

  const isActive = (path) => location.pathname === path
  const adminDashboardPath = adminPath('/')
  const adminBookingsPath = adminPath('/bookings')
  const adminScreensPath = adminPath('/screens')
  const adminSettingsPath = adminPath('/settings')

  const handleContactClick = (event) => {
    event.preventDefault()
    setMobileOpen(false)
    if (location.pathname === '/') {
      const target = document.getElementById('contact')
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } else {
      navigate('/', { state: { scrollTo: 'contact' } })
    }
  }

  return (
    <nav className="sticky top-0 z-50 glass border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to={isAdminSite ? '/' : '/'} className="flex items-center gap-3.5 group">
            <div className={`${isAdminSite ? 'w-9 h-9' : 'w-14 h-14 sm:w-16 sm:h-16'} bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow overflow-hidden`}>
              {logoUrl ? <img src={logoUrl} alt={appName} className="w-full h-full object-cover" /> : <Monitor className="w-5 h-5 text-white" />}
            </div>
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">{appName}</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {!isAdminSite ? (
              <>
                <Link
                  to="/about"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive('/about')
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  About Us
                </Link>
                <Link
                  to="/locations"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive('/locations')
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Locations
                </Link>
                <button
                  onClick={handleContactClick}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all"
                >
                  Contact Us
                </button>
              </>
            ) : !isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive('/login')
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {isAdminSite ? 'Admin Login' : 'Login'}
                </Link>
              </>
            ) : isAdmin ? (
              <>
                <Link
                  to={adminDashboardPath}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    isActive(adminDashboardPath)
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link
                  to={adminBookingsPath}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    isActive(adminBookingsPath)
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Bookings
                </Link>
                <Link
                  to={adminScreensPath}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    isActive(adminScreensPath)
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  Screens
                </Link>
                <Link
                  to={adminSettingsPath}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    isActive(adminSettingsPath)
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <div className="w-px h-6 bg-gray-200 mx-2" />
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-900">{user?.name}</p>
                    <p className="text-[10px] text-primary-600 font-medium uppercase">Admin</p>
                  </div>
                  <button onClick={handleLogout} className="btn-ghost !p-2 text-gray-400 hover:text-red-500">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/locations"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    isActive('/locations')
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  Locations
                </Link>
                <Link
                  to="/dashboard"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    isActive('/dashboard')
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  My Bookings
                </Link>
                <div className="w-px h-6 bg-gray-200 mx-2" />
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-900">{user?.name}</p>
                    <p className="text-[10px] text-gray-500 font-medium">Client</p>
                  </div>
                  <button onClick={handleLogout} className="btn-ghost !p-2 text-gray-400 hover:text-red-500">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden glass border-t border-white/20 animate-slide-down">
          <div className="px-4 py-3 space-y-1">
            {!isAdminSite ? (
              <>
                <Link to="/about" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50">About Us</Link>
                <Link to="/locations" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50">Locations</Link>
                <button onClick={handleContactClick} className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50">Contact Us</button>
              </>
            ) : !isAuthenticated ? (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-700">{isAdminSite ? 'Admin Login' : 'Login'}</Link>
              </>
            ) : isAdmin ? (
              <>
                <Link to={adminDashboardPath} onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50">Dashboard</Link>
                <Link to={adminBookingsPath} onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50">Bookings</Link>
                <Link to={adminScreensPath} onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50">Screens</Link>
                <Link to={adminSettingsPath} onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50">Settings</Link>
                <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50">Logout</button>
              </>
            ) : (
              <>
                <Link to="/locations" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50">Locations</Link>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50">My Bookings</Link>
                <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50">Logout</button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
