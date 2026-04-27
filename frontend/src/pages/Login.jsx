import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Monitor,
  Shield,
  ShieldCheck,
  TrendingUp,
  Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/axios'
import { getPostLoginPath } from '../utils/siteMode'

const OTP_LENGTH = 6

function createResetState(prefilledEmail = '') {
  return {
    email: prefilledEmail,
    otp: '',
    newPassword: '',
    confirmPassword: '',
    resetToken: '',
    step: 'email',
    status: 'idle',
    message: '',
    resendReadyAt: null,
    expiresAt: null,
  }
}

function formatCountdown(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function Login({ adminLogin = false }) {
  const { login, logout } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetFlow, setResetFlow] = useState(() => createResetState())
  const [resetTick, setResetTick] = useState(Date.now())

  const resendRemainingSeconds = useMemo(() => {
    if (!resetFlow.resendReadyAt) return 0
    return Math.max(0, Math.ceil((resetFlow.resendReadyAt - resetTick) / 1000))
  }, [resetFlow.resendReadyAt, resetTick])

  const otpExpiryRemainingSeconds = useMemo(() => {
    if (!resetFlow.expiresAt) return 0
    return Math.max(0, Math.ceil((resetFlow.expiresAt - resetTick) / 1000))
  }, [resetFlow.expiresAt, resetTick])

  useEffect(() => {
    if (!showForgotPassword) return
    if (!resetFlow.resendReadyAt && !resetFlow.expiresAt) return

    const intervalId = window.setInterval(() => setResetTick(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [showForgotPassword, resetFlow.expiresAt, resetFlow.resendReadyAt])

  useEffect(() => {
    if (!showForgotPassword || !resetFlow.expiresAt || resetFlow.step !== 'otp') return
    if (otpExpiryRemainingSeconds > 0) return

    setResetFlow((current) => {
      if (!current.expiresAt || current.step !== 'otp') return current
      return {
        ...current,
        otp: '',
        status: 'expired',
        message: 'OTP expired. Send a fresh code to continue.',
        resendReadyAt: null,
        expiresAt: null,
      }
    })
  }, [otpExpiryRemainingSeconds, resetFlow.expiresAt, resetFlow.step, showForgotPassword])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await login(email, password)
      if (adminLogin && user.role !== 'admin') {
        logout()
        setError('This login is only for OLRAC admins. Please use the client website.')
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
    } finally {
      setLoading(false)
    }
  }

  const openForgotPassword = () => {
    const prefilledEmail = email.trim().toLowerCase()
    setShowForgotPassword(true)
    setResetFlow((current) => {
      if (current.step === 'password' || current.step === 'otp') return current
      return createResetState(prefilledEmail)
    })
  }

  const closeForgotPassword = () => {
    setShowForgotPassword(false)
    setResetFlow(createResetState(email.trim().toLowerCase()))
  }

  const sendResetOtp = async () => {
    const targetEmail = (resetFlow.email || email).trim().toLowerCase()
    if (!targetEmail) {
      toast.error('Enter the admin email address first.')
      return
    }

    setResetFlow((current) => ({
      ...createResetState(targetEmail),
      status: 'sending',
      message: 'Sending OTP to the admin email...',
    }))

    try {
      const res = await api.post('/auth/admin/forgot-password/send-otp', { email: targetEmail })
      const now = Date.now()
      setResetFlow({
        email: targetEmail,
        otp: '',
        newPassword: '',
        confirmPassword: '',
        resetToken: '',
        step: 'otp',
        status: 'sent',
        message: res.data.detail || 'OTP sent successfully.',
        resendReadyAt: now + Number(res.data.resend_in_seconds || 0) * 1000,
        expiresAt: now + Number(res.data.expires_in_seconds || 0) * 1000,
      })
      toast.success(res.data.detail || 'OTP sent successfully.')
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to send OTP.'
      setResetFlow((current) => ({
        ...current,
        status: 'error',
        message: detail,
      }))
      toast.error(detail)
    }
  }

  const verifyResetOtp = async () => {
    const targetEmail = resetFlow.email.trim().toLowerCase()
    const otp = resetFlow.otp.trim()

    if (!targetEmail) {
      toast.error('Enter the admin email address first.')
      return
    }
    if (otp.length !== OTP_LENGTH) {
      toast.error('Enter the 6-digit OTP.')
      return
    }

    setResetFlow((current) => ({
      ...current,
      status: 'verifying',
      message: 'Verifying OTP...',
    }))

    try {
      const res = await api.post('/auth/admin/forgot-password/verify-otp', { email: targetEmail, otp })
      setResetFlow((current) => ({
        ...current,
        otp: '',
        step: 'password',
        status: 'verified',
        resetToken: res.data.reset_token,
        message: res.data.detail || 'OTP verified successfully.',
        resendReadyAt: null,
        expiresAt: null,
      }))
      toast.success(res.data.detail || 'OTP verified successfully.')
    } catch (err) {
      const detail = err.response?.data?.detail || 'OTP verification failed.'
      setResetFlow((current) => ({
        ...current,
        status: 'error',
        message: detail,
      }))
      toast.error(detail)
    }
  }

  const submitResetPassword = async () => {
    const targetEmail = resetFlow.email.trim().toLowerCase()
    if (!targetEmail || !resetFlow.resetToken) {
      toast.error('Verify the OTP before setting a new password.')
      return
    }
    if (resetFlow.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.')
      return
    }
    if (resetFlow.newPassword !== resetFlow.confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setResetFlow((current) => ({
      ...current,
      status: 'resetting',
      message: 'Updating password...',
    }))

    try {
      const res = await api.post('/auth/admin/forgot-password/reset', {
        email: targetEmail,
        reset_token: resetFlow.resetToken,
        new_password: resetFlow.newPassword,
      })
      setEmail(targetEmail)
      setPassword(resetFlow.newPassword)
      closeForgotPassword()
      toast.success(res.data?.detail || 'Password reset successfully. Sign in with your new password.')
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to reset password.'
      setResetFlow((current) => ({
        ...current,
        status: 'error',
        message: detail,
      }))
      toast.error(detail)
    }
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

          <div className="space-y-5">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-4 animate-slide-up"
                style={{ animationDelay: `${0.3 + index * 0.15}s`, animationFillMode: 'both' }}
              >
                <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{feature.title}</p>
                  <p className="text-white/60 text-sm">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                {adminLogin ? (
                  <button
                    type="button"
                    onClick={showForgotPassword ? closeForgotPassword : openForgotPassword}
                    className="text-xs text-primary-600 font-medium hover:text-primary-700"
                  >
                    {showForgotPassword ? 'Hide reset' : 'Forgot password?'}
                  </button>
                ) : null}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input-field !pl-11 !pr-11"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

          {adminLogin && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <ShieldCheck className="h-4 w-4 text-slate-500" />
                    Admin password recovery
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Reset an admin password using the OTP sent to the admin email through SMTP.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={showForgotPassword ? closeForgotPassword : openForgotPassword}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  {showForgotPassword ? 'Close' : 'Open'}
                </button>
              </div>

              {showForgotPassword && (
                <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
                  <div>
                    <label className="label">Admin Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        className="input-field !pl-11"
                        value={resetFlow.email}
                        onChange={(e) => setResetFlow((current) => ({ ...current, email: e.target.value }))}
                        placeholder="admin@olrac.com"
                      />
                    </div>
                  </div>

                  {resetFlow.step !== 'email' && (
                    <div>
                      <label className="label">OTP</label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          inputMode="numeric"
                          className="input-field flex-1"
                          value={resetFlow.otp}
                          onChange={(e) => setResetFlow((current) => ({
                            ...current,
                            otp: e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH),
                          }))}
                          placeholder="Enter 6-digit code"
                        />
                        <button
                          type="button"
                          onClick={verifyResetOtp}
                          disabled={resetFlow.status === 'verifying' || resetFlow.status === 'sending'}
                          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50"
                        >
                          {resetFlow.status === 'verifying' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                        </button>
                      </div>
                      {otpExpiryRemainingSeconds > 0 && resetFlow.step === 'otp' && (
                        <p className="mt-2 text-xs font-medium text-amber-600">
                          OTP expires in {formatCountdown(otpExpiryRemainingSeconds)}
                        </p>
                      )}
                    </div>
                  )}

                  {resetFlow.step === 'password' && (
                    <>
                      <div>
                        <label className="label">New Password</label>
                        <input
                          type="password"
                          className="input-field"
                          value={resetFlow.newPassword}
                          onChange={(e) => setResetFlow((current) => ({ ...current, newPassword: e.target.value }))}
                          placeholder="At least 6 characters"
                        />
                      </div>
                      <div>
                        <label className="label">Confirm Password</label>
                        <input
                          type="password"
                          className="input-field"
                          value={resetFlow.confirmPassword}
                          onChange={(e) => setResetFlow((current) => ({ ...current, confirmPassword: e.target.value }))}
                          placeholder="Re-enter the new password"
                        />
                      </div>
                    </>
                  )}

                  {resetFlow.message && (
                    <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
                      {resetFlow.message}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    {resetFlow.step === 'email' && (
                      <button
                        type="button"
                        onClick={sendResetOtp}
                        disabled={resetFlow.status === 'sending'}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
                      >
                        {resetFlow.status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send OTP'}
                      </button>
                    )}

                    {resetFlow.step === 'otp' && (
                      <button
                        type="button"
                        onClick={sendResetOtp}
                        disabled={resetFlow.status === 'sending' || resetFlow.status === 'verifying' || resendRemainingSeconds > 0}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        {resetFlow.status === 'sending'
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : resendRemainingSeconds > 0
                          ? `Resend in ${formatCountdown(resendRemainingSeconds)}`
                          : 'Resend OTP'}
                      </button>
                    )}

                    {resetFlow.step === 'password' && (
                      <button
                        type="button"
                        onClick={submitResetPassword}
                        disabled={resetFlow.status === 'resetting'}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
                      >
                        {resetFlow.status === 'resetting' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Password'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
