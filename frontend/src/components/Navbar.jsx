import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { usePublicSettings } from '../context/PublicSettingsContext'
import { adminLoginUrl, adminPath, isAdminSite } from '../utils/siteMode'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Monitor, Menu, X, LogOut, LayoutDashboard,
  BookOpen, BarChart3, MapPin, Settings, Sparkles,
} from 'lucide-react'

// Pages whose heroes are dark — navbar should start transparent with white text
const DARK_HERO_PATHS = ['/', '/about', '/locations', '/booking']
function hasDarkHero(pathname) {
  return DARK_HERO_PATHS.includes(pathname) || pathname.startsWith('/location/')
}

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const { settings } = usePublicSettings()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const appName = settings.config.general_app_name || 'OLRAC Advertising'
  const logoUrl = settings.config.general_logo_url

  const darkHero = !isAdminSite && hasDarkHero(location.pathname)
  const isTransparent = darkHero && !scrolled && !mobileOpen

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 56)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => setMobileOpen(false), [location.pathname])

  const handleLogout = () => {
    logout()
    navigate(isAdminSite ? '/login' : '/')
  }

  const isActive = (path) => location.pathname === path

  const handleContactClick = (e) => {
    e.preventDefault()
    setMobileOpen(false)
    if (location.pathname === '/') {
      const target = document.getElementById('contact')
      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY - 88
        window.scrollTo({ top, behavior: 'smooth' })
      }
    } else {
      navigate('/', { state: { scrollTo: 'contact' } })
    }
  }

  const adminDashboardPath = adminPath('/')
  const adminBookingsPath = adminPath('/bookings')
  const adminScreensPath = adminPath('/screens')
  const adminSettingsPath = adminPath('/settings')
  const adminLoginPath = isAdminSite ? '/login' : adminLoginUrl

  // ── Shared style tokens ──────────────────────────────────────
  const navBg = isAdminSite
    ? 'bg-white/90 backdrop-blur-xl border-b border-slate-200/60'
    : isTransparent
      ? 'bg-[#050508]/70 backdrop-blur-xl border-b border-white/[0.06]'
      : 'bg-[#050508]/95 backdrop-blur-xl border-b border-white/8'

  const linkBase = isAdminSite || !isTransparent
    ? 'text-white/85 hover:text-white hover:bg-white/10'
    : 'text-white/85 hover:text-white hover:bg-white/10'

  const linkActive = isAdminSite || !isTransparent
    ? 'text-white bg-white/12'
    : 'text-white bg-white/12'

  const adminLinkBase = 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  const adminLinkActive = 'bg-primary-50 text-primary-700'

  const logoTextColor = isAdminSite
    ? 'text-slate-900'
    : isTransparent
      ? 'text-white'
      : 'text-white'

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${navBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-[68px] items-center justify-between md:h-[80px]">

          {/* Logo */}
          <Link to="/" className="group flex shrink-0 items-center gap-2.5 md:gap-3.5">
            <div className={`${isAdminSite ? 'h-10 w-10' : 'h-11 w-11 md:h-14 md:w-14'} rounded-2xl flex items-center justify-center shadow-sm overflow-hidden transition-all group-hover:scale-105 ${isAdminSite
                ? 'bg-gradient-to-br from-primary-600 to-primary-700'
                : isTransparent
                  ? 'bg-white/10 border border-white/20'
                  : 'bg-blue-700/80 border border-blue-600/30'
              }`}>
              {logoUrl
                ? <img src={logoUrl} alt={appName} className="w-full h-full object-contain p-1" style={{ imageRendering: 'auto' }} />
                : <Monitor className={`w-6 h-6 ${isAdminSite ? 'text-white' : 'text-white'}`} />
              }
            </div>
            <span className={`max-w-[170px] truncate text-[1.02rem] font-black leading-none tracking-tight transition-colors sm:text-[1.2rem] md:max-w-none md:text-[1.65rem] ${logoTextColor}`}>
              {appName}
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {!isAdminSite ? (
              <>
                <Link
                  to="/about"
                  className={`px-4 py-2.5 rounded-xl text-[15px] font-semibold transition-all ${isActive('/about') ? linkActive : linkBase
                    }`}
                >
                  About Us
                </Link>
                <Link
                  to="/locations"
                  className={`px-4 py-2.5 rounded-xl text-[15px] font-semibold transition-all ${isActive('/locations') ? linkActive : linkBase
                    }`}
                >
                  Locations
                </Link>
                <button
                  onClick={handleContactClick}
                  className={`px-4 py-2.5 rounded-xl text-[15px] font-semibold transition-all ${linkBase}`}
                >
                  Contact Us
                </button>
                <div className="ml-3">
                  <Link
                    to="/booking"
                    className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[15px] font-bold transition-all ${isActive('/booking')
                        ? 'bg-blue-600 text-white'
                        : isTransparent
                          ? 'bg-white/12 text-white border border-white/20 hover:bg-white/20'
                          : 'bg-blue-700 text-white hover:bg-blue-600 shadow-[0_0_24px_rgba(29,78,216,0.4)]'
                      }`}
                  >
                    <Sparkles className="h-4 w-4" />
                    Get Quote
                  </Link>
                </div>
              </>
            ) : !isAuthenticated ? (
              isAdminSite ? (
                <Link
                  to={adminLoginPath}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${isActive('/login') ? adminLinkActive : adminLinkBase
                    }`}
                >
                  Admin Login
                </Link>
              ) : (
                <a
                  href={adminLoginPath}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${adminLinkBase}`}
                >
                  Admin Login
                </a>
              )
            ) : isAdmin ? (
              <>
                {[
                  { to: adminDashboardPath, icon: BarChart3, label: 'Dashboard' },
                  { to: adminBookingsPath, icon: BookOpen, label: 'Bookings' },
                  { to: adminScreensPath, icon: Monitor, label: 'Screens' },
                  { to: adminSettingsPath, icon: Settings, label: 'Settings' },
                ].map(({ to, icon: Icon, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${isActive(to) ? adminLinkActive : adminLinkBase
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                ))}
                <div className="w-px h-6 bg-slate-200 mx-2" />
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
                    <p className="text-[10px] text-primary-600 font-medium uppercase">Admin</p>
                  </div>
                  <button onClick={handleLogout} className="btn-ghost !p-2 text-slate-400 hover:text-red-500">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/locations"
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${isActive('/locations') ? adminLinkActive : adminLinkBase
                    }`}
                >
                  <MapPin className="w-4 h-4" />
                  Locations
                </Link>
                <Link
                  to="/dashboard"
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${isActive('/dashboard') ? adminLinkActive : adminLinkBase
                    }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  My Bookings
                </Link>
                <div className="w-px h-6 bg-slate-200 mx-2" />
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Client</p>
                  </div>
                  <button onClick={handleLogout} className="btn-ghost !p-2 text-slate-400 hover:text-red-500">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className={`md:hidden p-2 rounded-xl transition-all ${isTransparent
                ? 'text-white/80 hover:bg-white/10'
                : isAdminSite
                  ? 'text-slate-600 hover:bg-slate-100'
                  : 'text-white/80 hover:bg-white/10'
              }`}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className={`md:hidden overflow-hidden border-t ${isAdminSite
                ? 'bg-white border-slate-200'
                : 'bg-[#050508]/96 border-white/8 backdrop-blur-xl'
              }`}
          >
            <div className="space-y-2 px-4 py-4">
              {!isAdminSite ? (
                <>
                  <Link to="/about" className="block rounded-2xl px-4 py-3.5 text-base font-semibold text-white/75 transition-all hover:bg-white/8 hover:text-white">
                    About Us
                  </Link>
                  <Link to="/locations" className="block rounded-2xl px-4 py-3.5 text-base font-semibold text-white/75 transition-all hover:bg-white/8 hover:text-white">
                    Locations
                  </Link>
                  <button onClick={handleContactClick} className="w-full rounded-2xl px-4 py-3.5 text-left text-base font-semibold text-white/75 transition-all hover:bg-white/8 hover:text-white">
                    Contact Us
                  </button>
                  <div className="pt-2">
                    <Link
                      to="/booking"
                      className="flex items-center justify-center gap-2 rounded-full bg-blue-700 px-6 py-3.5 text-base font-black text-white transition-all hover:bg-blue-600"
                    >
                      <Sparkles className="h-4 w-4" />
                      Get Quote
                    </Link>
                  </div>
                </>
              ) : !isAuthenticated ? (
                isAdminSite ? (
                  <Link to={adminLoginPath} className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100">
                    Admin Login
                  </Link>
                ) : (
                  <a href={adminLoginPath} className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100">
                    Admin Login
                  </a>
                )
              ) : isAdmin ? (
                <>
                  <Link to={adminDashboardPath} className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100">Dashboard</Link>
                  <Link to={adminBookingsPath} className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100">Bookings</Link>
                  <Link to={adminScreensPath} className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100">Screens</Link>
                  <Link to={adminSettingsPath} className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100">Settings</Link>
                  <button onClick={() => { handleLogout(); setMobileOpen(false) }} className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/locations" className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100">Locations</Link>
                  <Link to="/dashboard" className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100">My Bookings</Link>
                  <button onClick={() => { handleLogout(); setMobileOpen(false) }} className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50">Logout</button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
