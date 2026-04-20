import { useEffect, useState } from 'react'
import { ArrowUpRight, BarChart3, BookOpen, IndianRupee, LayoutDashboard, Monitor, TrendingDown, TrendingUp, Users } from 'lucide-react'

import api from '../api/axios'
import AdminStatCard from '../components/admin/AdminStatCard'
import AdminWorkspaceLayout from '../components/admin/AdminWorkspaceLayout'
import { formatInr } from '../utils/adminUi'
import { adminPath } from '../utils/siteMode'

const adminSections = [
  {
    id: 'overview',
    label: 'Dashboard',
    description: 'Core business KPIs without heavy analytics noise.',
    to: adminPath('/'),
    icon: LayoutDashboard,
  },
  {
    id: 'insights',
    label: 'Insights',
    description: 'Booking and revenue analytics for performance tracking.',
    to: adminPath('/insights'),
    icon: BarChart3,
  },
]

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/admin/dashboard-summary')
      .then((res) => {
        setSummary(res.data)
        setError('')
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'Failed to load dashboard summary')
      })
      .finally(() => setLoading(false))
  }, [])

  const formatTrend = (value) => {
    const numeric = Number(value || 0)
    if (numeric === 0) {
      return {
        value: '0%',
        prefix: 'Flat',
        positive: false,
        neutral: true,
      }
    }

    return {
      value: `${numeric > 0 ? '+' : ''}${numeric}%`,
      prefix: numeric > 0 ? '↑' : '↓',
      positive: numeric > 0,
      neutral: false,
    }
  }

  const bookingsTrend = formatTrend(summary?.bookings_trend_percent)
  const revenueTrend = formatTrend(summary?.revenue_trend_percent)

  const stats = [
    {
      label: 'Total Bookings',
      value: summary?.total_bookings ?? 0,
      description: 'All bookings created across the platform.',
      trend: bookingsTrend,
      icon: BookOpen,
      tone: 'primary',
    },
    {
      label: 'Total Revenue',
      value: formatInr(summary?.total_revenue || 0),
      description: 'Confirmed booking revenue collected so far.',
      trend: revenueTrend,
      icon: IndianRupee,
      tone: 'emerald',
    },
    {
      label: 'Active Locations',
      value: summary?.active_locations ?? 0,
      description: 'Advertising locations currently available to clients.',
      icon: Monitor,
      tone: 'amber',
    },
    {
      label: 'Total Users',
      value: summary?.total_users ?? 0,
      description: 'Client accounts using the OLRAC platform.',
      icon: Users,
      tone: 'slate',
    },
  ]

  return (
    <AdminWorkspaceLayout
      title="Admin Dashboard"
      description="A clean one-screen overview for your core business KPIs."
      icon={LayoutDashboard}
      sections={adminSections}
      activeSection="overview"
    >
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-40 rounded-2xl border border-gray-200 bg-gray-50 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-10 text-center">
          <h3 className="text-lg font-semibold text-red-900">Dashboard unavailable</h3>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary text-sm mt-5">
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-[26px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.10),_transparent_30%),linear-gradient(135deg,#0f172a,#172554,#1e293b)] px-6 py-4 text-white shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-200">Executive Overview</p>
                <h3 className="mt-2 text-xl font-bold tracking-tight">A tighter control layer for the platform’s core numbers.</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Use this page for fast operational review. Live movement is surfaced here, while deep charts stay inside Insights.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3.5 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">Bookings</p>
                    {bookingsTrend.positive ? (
                      <TrendingUp className="h-4 w-4 text-emerald-300" />
                    ) : bookingsTrend.neutral ? (
                      <ArrowUpRight className="h-4 w-4 text-slate-300" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-rose-300" />
                    )}
                  </div>
                  <p className="mt-2 text-2xl font-bold">{summary?.total_bookings ?? 0}</p>
                  <p className={`mt-1 text-sm font-semibold ${bookingsTrend.positive ? 'text-emerald-300' : bookingsTrend.neutral ? 'text-slate-300' : 'text-rose-300'}`}>
                    {bookingsTrend.prefix} {bookingsTrend.value} vs last 7 days
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3.5 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">Revenue</p>
                    {revenueTrend.positive ? (
                      <TrendingUp className="h-4 w-4 text-emerald-300" />
                    ) : revenueTrend.neutral ? (
                      <ArrowUpRight className="h-4 w-4 text-slate-300" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-rose-300" />
                    )}
                  </div>
                  <p className="mt-2 text-2xl font-bold">{formatInr(summary?.total_revenue || 0)}</p>
                  <p className={`mt-1 text-sm font-semibold ${revenueTrend.positive ? 'text-emerald-300' : revenueTrend.neutral ? 'text-slate-300' : 'text-rose-300'}`}>
                    {revenueTrend.prefix} {revenueTrend.value} vs last 7 days
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {stats.map((stat) => (
              <AdminStatCard key={stat.label} {...stat} />
            ))}
          </div>
        </div>
      )}
    </AdminWorkspaceLayout>
  )
}
