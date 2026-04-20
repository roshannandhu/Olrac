import { Monitor, Mail, Phone, MapPin } from 'lucide-react'
import { usePublicSettings } from '../context/PublicSettingsContext'

export default function Footer() {
  const { settings } = usePublicSettings()
  const appName = settings.config.general_app_name || 'OLRAC Advertising'
  const logoUrl = settings.config.general_logo_url
  const contactEmail = settings.contact_email || 'support@olrac.com'
  const contactPhone = settings.config.general_contact_phone || settings.whatsapp_number || '+91 98765 43210'

  return (
    <footer id="contact" className="bg-gray-900 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt={appName} className="w-full h-full object-cover" />
                ) : (
                  <Monitor className="w-5 h-5 text-white" />
                )}
              </div>
              <span className="text-lg font-bold text-white">{appName}</span>
            </div>
            <p className="text-sm leading-relaxed max-w-md">
              Premium advertising platform for physical screen ad-slot booking.
              Connect your brand with audiences through strategic digital screen placements
              across prime locations.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Platform</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="/" className="hover:text-primary-400 transition">Available Screens</a></li>
              <li><a href="/locations" className="hover:text-primary-400 transition">Locations</a></li>
              <li><a href="/#screens" className="hover:text-primary-400 transition">Pricing</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Contact</h4>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary-400" />
                {contactEmail}
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary-400" />
                {contactPhone}
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary-400" />
                India
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs">&copy; {new Date().getFullYear()} {appName}. All rights reserved.</p>
          <div className="flex gap-6 text-xs">
            <a href="#" className="hover:text-primary-400 transition">Privacy Policy</a>
            <a href="#" className="hover:text-primary-400 transition">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
