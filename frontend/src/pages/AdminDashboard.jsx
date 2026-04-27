import { useEffect, useState } from 'react'
import { BarChart3, BookOpen, IndianRupee, LayoutDashboard, Monitor, TrendingDown, TrendingUp, Users } from 'lucide-react'

import api from '../api/axios'
import AdminStatCard from '../components/admin/AdminStatCard'
import AdminWorkspaceLayout from '../components/admin/AdminWorkspaceLayout'
import { formatInr } from '../utils/adminUi'
import { adminPath } from '../utils/siteMode'

const adminSections = [
  {
    id: 'overview',
    label: 'Dashboard',
    description: 'Core KPIs at a glance.',
    to: adminPath('/'),
    icon: LayoutDashboard,
  },
  {
    id: 'insights',
    label: 'Insights',
    description: 'Analytics & revenue charts.',
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
      .then((res) => { setSummary(res.data); setError('') })
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const formatTrend = (value) => {
    const n = Number(value || 0)
    if (n === 0) return { value: '0%', prefix: '–', positive: false, neutral: true }
    return { value: `${n > 0 ? '+' : ''}${n}%`, prefix: n > 0 ? '▲' : '▼', positive: n > 0, neutral: false }
  }

  const bookingsTrend = formatTrend(summary?.bookings_trend_percent)
  const revenueTrend = formatTrend(summary?.revenue_trend_percent)

  const stats = [
    { label: 'Total Bookings', value: summary?.total_bookings ?? 0, trend: bookingsTrend, icon: BookOpen, tone: 'primary' },
    { label: 'Total Revenue', value: formatInr(summary?.total_revenue || 0), trend: revenueTrend, icon: IndianRupee, tone: 'emerald' },
    { label: 'Active Locations', value: summary?.active_locations ?? 0, icon: Monitor, tone: 'amber' },
    { label: 'Total Users', value: summary?.total_users ?? 0, icon: Users, tone: 'slate' },
  ]

  return (
    <AdminWorkspaceLayout
      title="Admin Dashboard"
      description="Core business KPIs and platform health."
      icon={LayoutDashboard}
      sections={adminSections}
      activeSection="overview"
    >
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl border border-slate-200 bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-10 text-center">
          <h3 className="text-base font-bold text-red-900">Dashboard unavailable</h3>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary text-sm mt-5">Retry</button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {stats.map((stat) => <AdminStatCard key={stat.label} {...stat} />)}
          </div>

          {/* Trend summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Bookings vs Last 7 Days', value: summary?.total_bookings ?? 0, trend: bookingsTrend, icon: BookOpen },
              { label: 'Revenue vs Last 7 Days', value: formatInr(summary?.total_revenue || 0), trend: revenueTrend, icon: IndianRupee },
            ].map(({ label, value, trend, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-violet-600 shadow-sm">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
                    <p className="mt-0.5 text-lg font-black text-slate-900">{value}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1 text-sm font-bold ${trend.positive ? 'text-emerald-600' : trend.neutral ? 'text-slate-400' : 'text-rose-500'}`}>
                  {trend.positive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {trend.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminWorkspaceLayout>
  )
}
