import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { Monitor, Mail, Lock, Eye, EyeOff, AlertCircle, Sparkles, TrendingUp, Shield, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { getPostLoginPath } from '../utils/siteMode'

export default function Login({ adminLogin = false }) {
  const { login, logout } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      if (adminLogin && user.role !== 'admin') {
        logout()
        setError('This login is only for OLRAC admins. Please use the client website.')
        setLoading(false)
        return
      }
      toast.success(`Welcome back, ${user.name}!`)
      const nextPath = getPostLoginPath(user.role)
      if (nextPath.startsWith('http')) {
        window.location.href = nextPath
      } else {
        navigate(nextPath)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Backend not reachable. Make sure backend is running on port 8000.')
    }
    setLoading(false)
  }

  const features = [
    adminLogin
      ? {
          icon: TrendingUp,
          title: 'Platform Analytics',
          desc: 'Review bookings, revenue, and campaign demand',
        }
      : {
          icon: TrendingUp,
          title: 'Real-Time Analytics',
          desc: 'Track your ad campaigns with live dashboards',
        },
    adminLogin
      ? {
          icon: Shield,
          title: 'Admin Access',
          desc: 'Manage screens, bookings, settings, and invoices',
        }
      : {
          icon: Shield,
          title: 'Premium Locations',
          desc: 'Access high-traffic digital screens across India',
        },
    adminLogin
      ? {
          icon: Zap,
          title: 'Operational Control',
          desc: 'Keep the same database in sync with the client site',
        }
      : {
          icon: Zap,
          title: 'Instant WhatsApp Booking',
          desc: 'Book ad slots in seconds via WhatsApp',
        },
  ]

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-purple-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full filter blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-300 rounded-full filter blur-3xl animate-pulse-slow" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Monitor className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">Olrac Adverse</span>
          </div>
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
            {adminLogin ? 'Admin control for the OLRAC platform.' : 'Welcome back to your advertising command center.'}
          </h2>
          <p className="text-white/70 text-lg leading-relaxed mb-10">
            {adminLogin
              ? 'Manage inventory, bookings, analytics, and public site settings from one secure place.'
              : 'Manage your campaigns, track performance, and maximize your ROI with AI-powered insights.'}
          </p>

          {/* Feature bullets */}
          <div className="space-y-5">
            {features.map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-4 animate-slide-up"
                style={{ animationDelay: `${0.3 + i * 0.15}s`, animationFillMode: 'both' }}
              >
                <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{f.title}</p>
                  <p className="text-white/60 text-sm">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">Olrac <span className="text-primary-600">Adverse</span></span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">{adminLogin ? 'Admin sign in' : 'Sign in'}</h1>
          <p className="text-gray-500 mb-8">
            {adminLogin ? 'Enter your admin credentials to access the control panel' : 'Enter your credentials to access your account'}
          </p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm animate-scale-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  className="input-field !pl-11"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <span className="text-xs text-primary-600 font-medium cursor-pointer hover:text-primary-700">Forgot password?</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input-field !pl-11 !pr-11"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !py-3.5 text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
