import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import api from '../api/axios'

export default function AIInsightsPanel({ analytics }) {
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchSummary = async () => {
    if (!analytics) return
    setLoading(true)
    try {
      const res = await api.post('/ai/summarize-revenue', {
        total_revenue: analytics.total_revenue || 0,
        total_bookings: analytics.total_bookings || 0,
        confirmed_bookings: analytics.confirmed_bookings || 0,
        pending_bookings: analytics.pending_bookings || 0,
        cancelled_bookings: analytics.cancelled_bookings || 0,
        top_categories: analytics.category_breakdown?.slice(0, 5) || [],
      })
      setSummary(res.data.summary)
    } catch (err) {
      setSummary('Unable to generate AI insights at this time.')
    }
    setLoading(false)
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">AI Insights</h3>
            <p className="text-xs text-gray-500">Powered by Groq LLM</p>
          </div>
        </div>
        <button
          onClick={fetchSummary}
          disabled={loading}
          className="btn-ghost !p-2 text-primary-600 hover:text-primary-700"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-4/5" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-3/5" />
        </div>
      ) : summary ? (
        <p className="text-sm text-gray-600 leading-relaxed">{summary}</p>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-gray-400 mb-3">Generate AI-powered insights from your revenue data</p>
          <button onClick={fetchSummary} className="btn-primary text-xs !py-2 !px-4">
            <Sparkles className="w-3 h-3" />
            Generate Insights
          </button>
        </div>
      )}
    </div>
  )
}
