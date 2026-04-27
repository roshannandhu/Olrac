import { Monitor, Mail, Phone, MapPin, ArrowRight, Linkedin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePublicSettings } from '../context/PublicSettingsContext'

export default function Footer() {
  const { settings } = usePublicSettings()
  const appName = settings.config.general_app_name || 'OLRAC Advertising'
  const logoUrl = settings.config.general_logo_url
  const contactEmail = (settings.contact_email || 'support@olrac.com').trim()
  const contactPhone = settings.config.general_contact_phone || settings.whatsapp_number || '+91 98765 43210'
  const instagramUrl = settings.config.contact_instagram_url || ''
  const facebookUrl = settings.config.contact_facebook_url || ''
  const linkedinUrl = settings.config.contact_linkedin_url || ''
  const mapUrl = settings.config.contact_map_url || ''

  return (
    <footer id="contact" className="bg-[#050508] text-white/50 mt-auto relative overflow-hidden">
      {/* Top gradient line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-600/50 to-transparent" />

      {/* Ambient blobs */}
      <div className="pointer-events-none absolute left-[-5%] top-[-20%] h-[300px] w-[300px] rounded-full bg-blue-900/20 blur-[100px]" />
      <div className="pointer-events-none absolute right-[-5%] bottom-[-10%] h-[250px] w-[250px] rounded-full bg-blue-900/15 blur-[80px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-10">

          {/* Brand */}
          <div className="md:col-span-5">
            <Link to="/" className="inline-flex items-center gap-3 group mb-5">
              <div className="w-10 h-10 rounded-2xl bg-blue-700/80 border border-blue-600/30 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
                {logoUrl
                  ? <img src={logoUrl} alt={appName} className="w-full h-full object-cover" />
                  : <Monitor className="w-5 h-5 text-white" />
                }
              </div>
              <span className="text-lg font-extrabold tracking-tight text-white">{appName}</span>
            </Link>
            <p className="text-sm leading-7 text-white/40 max-w-sm">
              Premium digital advertising platform. Connect your brand with audiences through
              strategic screen placements across prime high-traffic locations.
            </p>
            <div className="mt-6">
              <Link
                to="/booking"
                className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-600 transition-all shadow-[0_0_20px_rgba(29,78,216,0.3)]"
              >
                Get Instant Quote
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Quick links */}
          <div className="md:col-span-3">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/30 mb-5">Platform</h4>
            <ul className="space-y-3 text-sm">
              {[
                { to: '/', label: 'Home' },
                { to: '/about', label: 'About Us' },
                { to: '/locations', label: 'Ad Locations' },
                { to: '/booking', label: 'Know the Pricing' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-white/45 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="md:col-span-4">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/30 mb-5">Contact</h4>
            <ul className="space-y-3.5 text-sm">
              <li>
                <a
                  href={`mailto:${contactEmail}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-white/45 hover:text-white/80 transition-colors group"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-700/20 border border-blue-600/15 group-hover:bg-blue-700/35 transition-colors">
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  {contactEmail}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${contactPhone.replace(/\s/g, '')}`}
                  className="flex items-center gap-3 text-white/45 hover:text-white/80 transition-colors group"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-700/20 border border-blue-600/15 group-hover:bg-blue-700/35 transition-colors">
                    <Phone className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  {contactPhone}
                </a>
              </li>
              {mapUrl ? (
                <li>
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-white/45 hover:text-white/80 transition-colors group"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-700/20 border border-blue-600/15 group-hover:bg-blue-700/35 transition-colors">
                      <MapPin className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    India
                  </a>
                </li>
              ) : (
                <li className="flex items-center gap-3 text-white/45">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-700/20 border border-blue-600/15">
                    <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  India
                </li>
              )}
              {instagramUrl && (
                <li>
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-white/45 hover:text-white/80 transition-colors group"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-700/20 border border-blue-600/15 group-hover:bg-blue-700/35 transition-colors">
                      <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                      </svg>
                    </div>
                    Instagram
                  </a>
                </li>
              )}
              {facebookUrl && (
                <li>
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-white/45 hover:text-white/80 transition-colors group"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-700/20 border border-blue-600/15 group-hover:bg-blue-700/35 transition-colors">
                      <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                    Facebook
                  </a>
                </li>
              )}
              {linkedinUrl && (
                <li>
                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-white/45 hover:text-white/80 transition-colors group"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-700/20 border border-blue-600/15 group-hover:bg-blue-700/35 transition-colors">
                      <Linkedin className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    LinkedIn
                  </a>
                </li>
              )}
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-8 sm:mt-12 pt-6 border-t border-white/6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/25">
            &copy; {new Date().getFullYear()} {appName}. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-white/25">
            <a href="#" className="hover:text-white/60 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white/60 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
