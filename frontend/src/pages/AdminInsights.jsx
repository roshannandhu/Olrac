import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Brain,
  Download,
  LayoutDashboard,
  Lightbulb,
  MapPin,
  RefreshCw,
  Sparkles,
  TimerReset,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import toast from 'react-hot-toast'

import api from '../api/axios'
import AdminWorkspaceLayout from '../components/admin/AdminWorkspaceLayout'
import InsightsChartCard from '../components/admin/InsightsChartCard'
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
    description: 'Booking, revenue, and AI-driven operational analysis.',
    to: adminPath('/insights'),
    icon: BarChart3,
  },
]

const aiIcons = {
  Summary: Sparkles,
  'Top Locations': MapPin,
  'Peak Times': TimerReset,
  Alerts: AlertTriangle,
  'Revenue Analysis': TrendingUp,
  'User Behavior': Users,
  Suggestions: Lightbulb,
}

const currency = (value) => `Rs ${Number(value || 0).toLocaleString('en-IN')}`

function ChartEmptyState({ label }) {
  return (
    <div className="h-full flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
      {label}
    </div>
  )
}

function AIInsightRow({ title, value }) {
  const Icon = aiIcons[title] || Sparkles

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-slate-50/70 px-4 py-3">
      <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-800">{value}</p>
      </div>
    </div>
  )
}

export default function AdminInsights() {
  const [bookingsTrend, setBookingsTrend] = useState([])
  const [revenueAnalysis, setRevenueAnalysis] = useState([])
  const [topLocations, setTopLocations] = useState([])
  const [bookingStatus, setBookingStatus] = useState([])
  const [timeSlotUsage, setTimeSlotUsage] = useState([])
  const [dashboardSummary, setDashboardSummary] = useState(null)
  const [aiHighlights, setAiHighlights] = useState([])
  const [aiDetails, setAiDetails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showMoreAI, setShowMoreAI] = useState(false)
  const [refreshingAI, setRefreshingAI] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showExportPanel, setShowExportPanel] = useState(false)
  const [exportFormat, setExportFormat] = useState('pdf')
  const [includeTitle, setIncludeTitle] = useState(true)
  const [includeDateRange, setIncludeDateRange] = useState(true)
  const [resolution, setResolution] = useState('high')

  const chartRefs = useRef({})
  const analyticsExportRef = useRef(null)

  const approved = bookingStatus.find((item) => item.label === 'Approved')?.count || 0
  const pending = bookingStatus.find((item) => item.label === 'Pending')?.count || 0
  const rejected = bookingStatus.find((item) => item.label === 'Rejected')?.count || 0

  const setChartRef = (key) => (node) => {
    chartRefs.current[key] = node
  }

  const getDateRangeLabel = useCallback(() => {
    const bookingLabels = bookingsTrend.map((item) => item.label).filter(Boolean)
    if (bookingLabels.length >= 2) {
      return `${bookingLabels[0]} - ${bookingLabels[bookingLabels.length - 1]}`
    }

    const revenueLabels = revenueAnalysis.map((item) => item.label).filter(Boolean)
    if (revenueLabels.length >= 2) {
      return `${revenueLabels[0]} - ${revenueLabels[revenueLabels.length - 1]}`
    }

    return 'Current reporting period'
  }, [bookingsTrend, revenueAnalysis])

  const fetchInsights = useCallback(async () => {
    setLoading(true)
    try {
      const [summaryRes, trendRes, revenueRes, locationsRes, statusRes, slotsRes] = await Promise.all([
        api.get('/admin/dashboard-summary'),
        api.get('/admin/insights/bookings-trend'),
        api.get('/admin/insights/revenue-analysis'),
        api.get('/admin/insights/top-locations'),
        api.get('/admin/insights/booking-status'),
        api.get('/admin/insights/time-slot-usage'),
      ])

      setDashboardSummary(summaryRes.data)
      setBookingsTrend(trendRes.data)
      setRevenueAnalysis(revenueRes.data)
      setTopLocations(locationsRes.data)
      setBookingStatus(statusRes.data)
      setTimeSlotUsage(slotsRes.data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load insights')
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshAIInsights = useCallback(async () => {
    if (!dashboardSummary) return
    setRefreshingAI(true)
    try {
      const res = await api.post('/ai/admin-insights', {
        total_revenue: dashboardSummary.total_revenue || 0,
        total_bookings: dashboardSummary.total_bookings || 0,
        confirmed_bookings: approved,
        pending_bookings: pending,
        cancelled_bookings: rejected,
        bookings_trend: bookingsTrend,
        top_locations: topLocations,
        revenue_analysis: revenueAnalysis,
        time_slot_usage: timeSlotUsage,
      })
      setAiHighlights(res.data.highlights || [])
      setAiDetails(res.data.details || [])
    } catch {
      setAiHighlights([
        'AI insights are unavailable right now.',
        'Refresh again after the AI service responds.',
        'Core analytics below are still live.',
        'Use the charts to continue your review.',
      ])
      setAiDetails([
        { title: 'Summary', value: 'AI summary could not be generated right now.' },
        { title: 'Top Locations', value: 'Review the Top Locations chart for the strongest inventory.' },
        { title: 'Peak Times', value: 'Review time slot usage to spot demand concentration.' },
        { title: 'Alerts', value: 'Check pending and rejected bookings for operational follow-up.' },
        { title: 'Revenue Analysis', value: 'Review monthly revenue bars for performance changes.' },
        { title: 'User Behavior', value: 'Use bookings versus users to estimate repeat platform usage.' },
        { title: 'Suggestions', value: 'Refresh AI later for model-generated strategic suggestions.' },
      ])
    } finally {
      setRefreshingAI(false)
    }
  }, [dashboardSummary, approved, pending, rejected, bookingsTrend, topLocations, revenueAnalysis, timeSlotUsage])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  useEffect(() => {
    if (dashboardSummary) {
      refreshAIInsights()
    }
  }, [dashboardSummary, refreshAIInsights])

  const chartConfigs = [
    {
      key: 'bookingsTrend',
      title: 'Bookings Trend',
      lines: bookingsTrend.map((item) => `${item.label}: ${item.bookings} bookings`),
    },
    {
      key: 'revenueAnalysis',
      title: 'Revenue Analysis',
      lines: revenueAnalysis.map((item) => `${item.label}: ${currency(item.revenue)}`),
    },
    {
      key: 'topLocations',
      title: 'Top Locations',
      lines: topLocations.map((item) => `${item.label}: ${item.bookings} bookings, ${currency(item.revenue)}`),
    },
    {
      key: 'bookingStatus',
      title: 'Booking Status',
      lines: bookingStatus.map((item) => `${item.label}: ${item.count}`),
    },
    {
      key: 'timeSlotUsage',
      title: 'Time Slot Usage',
      lines: timeSlotUsage.map((item) => `${item.label}: ${item.count}`),
    },
  ]

  const getExportScale = () => (resolution === 'high' ? 2 : 1.2)

  const exportAsPdf = async () => {
    if (!analyticsExportRef.current) {
      throw new Error('Analytics panel not ready')
    }

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const marginX = 14
    const contentWidth = pageWidth - marginX * 2
    const secondPageTop = 14
    let y = 16

    const renderMetricCard = (x, top, width, label, value, tone = 'slate') => {
      const toneMap = {
        slate: { fill: [248, 250, 252], text: [15, 23, 42], sub: [100, 116, 139] },
        green: { fill: [240, 253, 244], text: [22, 101, 52], sub: [74, 222, 128] },
        amber: { fill: [255, 251, 235], text: [146, 64, 14], sub: [251, 191, 36] },
        red: { fill: [254, 242, 242], text: [153, 27, 27], sub: [248, 113, 113] },
      }
      const colors = toneMap[tone]

      pdf.setFillColor(...colors.fill)
      pdf.roundedRect(x, top, width, 20, 4, 4, 'F')
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(...colors.sub)
      pdf.text(label.toUpperCase(), x + 4, top + 7)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(12)
      pdf.setTextColor(...colors.text)
      pdf.text(String(value), x + 4, top + 15)
    }

    if (includeTitle) {
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(18)
      pdf.setTextColor(15, 23, 42)
      pdf.text('OLRAC Insights Report', 14, y)
      y += 8
    }

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(71, 85, 105)
    if (includeDateRange) {
      pdf.text(`Date Range: ${getDateRangeLabel()}`, 14, y)
      y += 6
    }
    pdf.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, y)
    y += 8

    const cardGap = 4
    const cardWidth = (contentWidth - cardGap) / 2
    renderMetricCard(marginX, y, cardWidth, 'Total Bookings', dashboardSummary?.total_bookings || 0)
    renderMetricCard(marginX + cardWidth + cardGap, y, cardWidth, 'Total Revenue', currency(dashboardSummary?.total_revenue || 0), 'green')
    y += 24
    renderMetricCard(marginX, y, cardWidth, 'Pending', pending, 'amber')
    renderMetricCard(marginX + cardWidth + cardGap, y, cardWidth, 'Approved', approved, 'slate')
    y += 24

    pdf.setFillColor(255, 255, 255)
    pdf.roundedRect(marginX, y, contentWidth, 16, 4, 4, 'F')
    pdf.setDrawColor(226, 232, 240)
    pdf.roundedRect(marginX, y, contentWidth, 16, 4, 4, 'S')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(15, 23, 42)
    pdf.text('Report Scope', marginX + 4, y + 6.5)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(71, 85, 105)
    pdf.text('Charts included: trend, revenue, top locations, status, and slot usage.', marginX + 4, y + 12)
    y += 22

    const canvas = await html2canvas(analyticsExportRef.current, {
      backgroundColor: '#f8fafc',
      scale: getExportScale(),
      useCORS: true,
      scrollY: -window.scrollY,
    })
    const image = canvas.toDataURL('image/png')
    const imgWidth = contentWidth
    const rawImgHeight = (canvas.height * imgWidth) / canvas.width
    const availablePageOne = pageHeight - y - 10
    const availablePageTwo = pageHeight - secondPageTop - 12
    const maxPrintableHeight = availablePageOne + availablePageTwo
    const imgHeight = Math.min(rawImgHeight, maxPrintableHeight)

    pdf.addImage(image, 'PNG', marginX, y, imgWidth, imgHeight)

    if (imgHeight > availablePageOne + 1) {
      pdf.addPage()
      pdf.addImage(image, 'PNG', marginX, secondPageTop - availablePageOne, imgWidth, imgHeight)

      pdf.setDrawColor(226, 232, 240)
      pdf.line(marginX, pageHeight - 10, pageWidth - marginX, pageHeight - 10)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.setTextColor(100, 116, 139)
      pdf.text('Executive export limited to two pages for clean sharing.', marginX, pageHeight - 5)
    }

    pdf.save(`olrac-insights-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const exportAsPng = async () => {
    if (!analyticsExportRef.current) {
      throw new Error('Analytics panel not ready')
    }

    const canvas = await html2canvas(analyticsExportRef.current, {
      backgroundColor: '#f8fafc',
      scale: getExportScale(),
      useCORS: true,
      scrollY: -window.scrollY,
    })

    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `olrac-insights-${new Date().toISOString().slice(0, 10)}.png`
    link.click()
  }

  const exportAsCsv = async () => {
    const sections = [
      includeTitle ? 'OLRAC Insights Report' : '',
      includeDateRange ? `Date Range,${getDateRangeLabel()}` : '',
      `Generated,${new Date().toLocaleString('en-IN')}`,
      '',
      'Dashboard Summary',
      `Total Bookings,${dashboardSummary?.total_bookings || 0}`,
      `Total Revenue,${dashboardSummary?.total_revenue || 0}`,
      `Pending,${pending}`,
      `Approved,${approved}`,
      `Rejected,${rejected}`,
      '',
      'Bookings Trend',
      'Label,Bookings',
      ...bookingsTrend.map((item) => `${item.label},${item.bookings}`),
      '',
      'Revenue Analysis',
      'Label,Revenue',
      ...revenueAnalysis.map((item) => `${item.label},${item.revenue}`),
      '',
      'Top Locations',
      'Label,Bookings,Revenue',
      ...topLocations.map((item) => `${item.label},${item.bookings},${item.revenue}`),
      '',
      'Booking Status',
      'Label,Count',
      ...bookingStatus.map((item) => `${item.label},${item.count}`),
      '',
      'Time Slot Usage',
      'Label,Count',
      ...timeSlotUsage.map((item) => `${item.label},${item.count}`),
    ].filter(Boolean)

    const blob = new Blob([sections.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `olrac-insights-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      if (exportFormat === 'png') {
        await exportAsPng()
      } else if (exportFormat === 'csv') {
        await exportAsCsv()
      } else {
        await exportAsPdf()
      }
      setShowExportPanel(false)
      toast.success?.('Insights exported successfully')
    } catch {
      toast.error?.('Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <AdminWorkspaceLayout
      title="Insights"
      description="Operational analytics with a compact AI review column."
      icon={BarChart3}
      sections={adminSections}
      activeSection="insights"
      action={(
        <div className="relative">
          <button
            onClick={() => setShowExportPanel((value) => !value)}
            className="inline-flex items-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-xl font-semibold shadow-sm hover:bg-black transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Insights
          </button>

          {showExportPanel ? (
            <div className="absolute right-0 top-[calc(100%+12px)] z-20 w-[360px] rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Export Graph</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Download chart visuals and analytics details in a polished report format.
                  </p>
                </div>
                <button
                  onClick={() => setShowExportPanel(false)}
                  className="rounded-xl px-2 py-1 text-sm text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Format</p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {['png', 'pdf', 'csv'].map((format) => (
                      <button
                        key={format}
                        onClick={() => setExportFormat(format)}
                        className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition-colors ${
                          exportFormat === format
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {format.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-700">Include Title</span>
                    <input type="checkbox" checked={includeTitle} onChange={(e) => setIncludeTitle(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                  </label>

                  <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-700">Include Date Range</span>
                    <input type="checkbox" checked={includeDateRange} onChange={(e) => setIncludeDateRange(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                  </label>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Resolution</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {['standard', 'high'].map((quality) => (
                      <button
                        key={quality}
                        onClick={() => setResolution(quality)}
                        className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition-colors ${
                          resolution === quality
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {quality === 'standard' ? 'Standard' : 'High'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                  AI insights are excluded from downloads. Export includes the analytics charts and graph detail tables only.
                </div>

                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-black disabled:opacity-60"
                >
                  {exporting ? 'Preparing export...' : `Download ${exportFormat.toUpperCase()}`}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    >
      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-[320px] rounded-2xl border border-gray-200 bg-gray-50 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-10 text-center">
          <h3 className="text-lg font-semibold text-red-900">Insights unavailable</h3>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <button onClick={fetchInsights} className="btn-primary text-sm mt-5">
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
          <div ref={analyticsExportRef} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div ref={setChartRef('bookingsTrend')}>
                <InsightsChartCard
                  title="Bookings Trend"
                  description="Daily booking creation volume to show momentum and slowdown patterns."
                >
                  {bookingsTrend.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={bookingsTrend}>
                        <CartesianGrid stroke="#eef2f7" strokeDasharray="4 4" />
                        <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="bookings" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <ChartEmptyState label="No booking trend data yet" />
                  )}
                </InsightsChartCard>
              </div>

              <div ref={setChartRef('revenueAnalysis')}>
                <InsightsChartCard
                  title="Revenue Analysis"
                  description="Monthly confirmed revenue comparison across recent periods."
                >
                  {revenueAnalysis.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueAnalysis}>
                        <CartesianGrid stroke="#eef2f7" strokeDasharray="4 4" />
                        <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => `Rs ${Math.round(value / 1000)}k`} />
                        <Tooltip formatter={(value) => currency(value)} />
                        <Bar dataKey="revenue" radius={[10, 10, 0, 0]} fill="#0f766e" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <ChartEmptyState label="No revenue data yet" />
                  )}
                </InsightsChartCard>
              </div>

              <div ref={setChartRef('topLocations')}>
                <InsightsChartCard
                  title="Top Locations"
                  description="Highest-performing advertising locations ranked by booking volume."
                >
                  {topLocations.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topLocations} layout="vertical" margin={{ left: 12 }}>
                        <CartesianGrid stroke="#eef2f7" strokeDasharray="4 4" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="label" type="category" width={140} tick={{ fill: '#334155', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip formatter={(value, key) => key === 'revenue' ? currency(value) : value} />
                        <Bar dataKey="bookings" radius={[0, 10, 10, 0]} fill="#7c3aed" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <ChartEmptyState label="No location performance data yet" />
                  )}
                </InsightsChartCard>
              </div>

              <div ref={setChartRef('bookingStatus')}>
                <InsightsChartCard
                  title="Booking Status"
                  description="Distribution of pending, approved, and rejected bookings."
                >
                  {bookingStatus.some((item) => item.count > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={bookingStatus} dataKey="count" nameKey="label" innerRadius={72} outerRadius={110} paddingAngle={3}>
                          {bookingStatus.map((entry, index) => (
                            <Cell key={`${entry.label}-${index}`} fill={['#f59e0b', '#10b981', '#ef4444'][index % 3]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value} bookings`} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <ChartEmptyState label="No booking status data yet" />
                  )}
                </InsightsChartCard>
              </div>
            </div>

            <div ref={setChartRef('timeSlotUsage')}>
              <InsightsChartCard
                title="Time Slot Usage"
                description="Current slot usage grouped by booking cadence until explicit hour-based scheduling is added."
              >
                {timeSlotUsage.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeSlotUsage}>
                      <CartesianGrid stroke="#eef2f7" strokeDasharray="4 4" />
                      <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value) => `${value} slots`} />
                      <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                        {timeSlotUsage.map((entry, index) => (
                          <Cell key={`${entry.label}-${index}`} fill={['#2563eb', '#0f766e', '#7c3aed'][index % 3]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ChartEmptyState label="No slot usage data yet" />
                )}
              </InsightsChartCard>
            </div>
          </div>

          <aside className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm xl:sticky xl:top-24">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-700 flex items-center justify-center">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">AI Insights</h3>
                  <p className="text-sm text-gray-500">Compact AI review for the current analytics.</p>
                </div>
              </div>
              <button
                onClick={refreshAIInsights}
                disabled={refreshingAI}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshingAI ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-900 text-white p-4">
              <p className="text-sm font-semibold text-sky-200">AI Highlights</p>
              <div className="mt-3 space-y-2 text-sm text-slate-200">
                {(aiHighlights.length ? aiHighlights : ['AI is preparing highlights...']).map((item) => (
                  <p key={item}>- {item}</p>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowMoreAI((value) => !value)}
              className="mt-4 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {showMoreAI ? 'Hide More AI Details' : 'More AI Details'}
            </button>

            {showMoreAI ? (
              <div className="mt-4 max-h-[420px] overflow-y-auto pr-1 space-y-3">
                {aiDetails.map((row) => (
                  <AIInsightRow key={row.title} title={row.title} value={row.value} />
                ))}
              </div>
            ) : null}
          </aside>
        </div>
      )}
    </AdminWorkspaceLayout>
  )
}
