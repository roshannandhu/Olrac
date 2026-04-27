import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  BookOpen, CheckCircle2, ChevronDown, Clock,
  FileText, MoreHorizontal, Search, Trash2, XCircle,
  FileEdit, Download, CheckSquare, Square
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

import api from '../api/axios'
import { formatInr, getBookingStatusMeta } from '../utils/adminUi'
import QuotationEditor from '../components/admin/QuotationEditor'

function getBookingSlotCount(booking) {
  if (Array.isArray(booking?.selected_screens) && booking.selected_screens.length > 0) {
    return booking.selected_screens.reduce((acc, screen) => acc + (Number(screen?.slots) || 1), 0)
  }
  return Number(booking?.slot_quantity) || 0
}

function getBookingCycleLabel(booking) {
  return booking?.duration_label || booking?.billing_cycle || 'Custom'
}

function getBookingLocationExportLabel(booking) {
  if (Array.isArray(booking?.selected_screens) && booking.selected_screens.length > 0) {
    return booking.selected_screens
      .map((screen) => [screen?.name, screen?.area].filter(Boolean).join(' - '))
      .filter(Boolean)
      .join(' | ')
  }
  return booking?.screen_name || ''
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [actionMenuId, setActionMenuId] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)
  const [quotationBooking, setQuotationBooking] = useState(null)
  
  // Bulk Actions State
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)

  const fetchBookings = () => {
    setLoading(true)
    api.get('/admin/bookings')
      .then(res => { setBookings(res.data); setError('') })
      .catch(err => {
        let msg = err.response?.data?.detail || 'Failed to load bookings'
        if (typeof msg !== 'string') msg = JSON.stringify(msg)
        setError(msg)
        toast.error(msg)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchBookings() }, [])

  // Close menus on outside click
  useEffect(() => {
    const handler = () => setActionMenuId(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const updateStatus = async (id, status) => {
    setUpdatingId(id)
    try {
      await api.patch(`/admin/bookings/${id}/status`, { status })
      toast.success(status === 'confirmed' ? 'Booking approved' : status === 'cancelled' ? 'Booking rejected' : `Status updated`)
      fetchBookings()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed')
    } finally {
      setUpdatingId(null)
      setActionMenuId(null)
      setSelectedIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const deleteBooking = async (id) => {
    if (!confirm(`Delete booking #${id}? This cannot be undone.`)) return
    try {
      await api.delete(`/admin/bookings/${id}`)
      toast.success('Booking deleted')
      fetchBookings()
    } catch {
      toast.error('Delete failed')
    }
  }

  const handleBulkAction = async (action) => {
    if (selectedIds.size === 0) return
    
    let confirmMsg = ''
    if (action === 'confirmed') confirmMsg = `Approve ${selectedIds.size} bookings?`
    else if (action === 'cancelled') confirmMsg = `Reject ${selectedIds.size} bookings?`
    else if (action === 'delete') confirmMsg = `Delete ${selectedIds.size} bookings permanently?`

    if (!window.confirm(confirmMsg)) return

    setIsBulkUpdating(true)
    try {
      const promises = Array.from(selectedIds).map(id => {
        if (action === 'delete') return api.delete(`/admin/bookings/${id}`)
        return api.patch(`/admin/bookings/${id}/status`, { status: action })
      })
      
      const results = await Promise.allSettled(promises)
      const failedCount = results.filter((result) => result.status === 'rejected').length

      if (failedCount === 0) {
        toast.success('Bulk action completed successfully')
      } else if (failedCount === results.length) {
        toast.error('Bulk action failed for all selected bookings')
      } else {
        toast.error(`Bulk action finished with ${failedCount} failure${failedCount > 1 ? 's' : ''}`)
      }

      setSelectedIds(new Set())
      fetchBookings()
    } catch (err) {
      toast.error('Failed to complete all actions')
    } finally {
      setIsBulkUpdating(false)
    }
  }

  const exportCsv = () => {
    const targetBookings = selectedIds.size > 0 
      ? bookings.filter(b => selectedIds.has(b.id)) 
      : filtered

    if (targetBookings.length === 0) {
      toast.error("No bookings to export")
      return
    }

    const headers = ['ID', 'Client', 'Email', 'Phone', 'Company', 'Screen', 'Slots', 'Cycle', 'Value', 'Status', 'Created']
    const rows = targetBookings.map(b => [
      b.id,
      `"${b.client_name || ''}"`,
      `"${b.email || ''}"`,
      `"${b.phone || ''}"`,
      `"${b.company || ''}"`,
      `"${getBookingLocationExportLabel(b)}"`,
      getBookingSlotCount(b),
      `"${getBookingCycleLabel(b)}"`,
      b.total_price,
      b.status,
      new Date(b.created_at).toLocaleString('en-IN')
    ])

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bookings_export_${new Date().toISOString().slice(0,10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return bookings
      .slice()
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)) // Newest first
      .filter(b => {
        const screenSearch = (b.selected_screens || []).map(s => `${s.name||''} ${s.area||''}`).join(' ').toLowerCase()
        const matchSearch = !q
          || b.client_name?.toLowerCase().includes(q)
          || b.company?.toLowerCase().includes(q)
          || b.screen_name?.toLowerCase().includes(q)
          || b.email?.toLowerCase().includes(q)
          || screenSearch.includes(q)
        const matchStatus = statusFilter === 'all' || getBookingStatusMeta(b.status).key === statusFilter
        return matchSearch && matchStatus
      })
  }, [bookings, search, statusFilter])

  const counts = {
    all: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    approved: bookings.filter(b => ['confirmed', 'approved'].includes(b.status)).length,
    rejected: bookings.filter(b => ['cancelled', 'rejected'].includes(b.status)).length,
    completed: bookings.filter(b => b.status === 'completed').length,
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(b => b.id)))
    }
  }

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }

  if (quotationBooking) {
    return <QuotationEditor booking={quotationBooking} onClose={() => {
      setQuotationBooking(null)
      fetchBookings()
    }} />
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Premium Glass Header */}
      <div className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl px-6 py-5 lg:px-8 shadow-sm">
        <div className="max-w-[1500px] mx-auto flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg shadow-indigo-200 shrink-0" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Manage Bookings</h1>
              <p className="text-sm font-medium text-slate-500 mt-1">Review, approve, and finalize advertising slots.</p>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            {[['Total', counts.all, 'text-slate-900', 'bg-slate-100'], 
              ['Pending', counts.pending, 'text-amber-700', 'bg-amber-100'], 
              ['Approved', counts.approved, 'text-emerald-700', 'bg-emerald-100'], 
              ['Rejected', counts.rejected + counts.completed, 'text-rose-700', 'bg-rose-100']
             ].map(([label, value, txtCls, bgCls]) => (
              <div key={label} className="rounded-2xl border border-slate-200/60 bg-white/50 backdrop-blur-md px-5 py-3 text-center shadow-sm min-w-[100px]">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  {label === 'Pending' && value > 0 && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                  )}
                  <p className={`text-xl font-black ${txtCls}`}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-4 py-8 lg:px-8">
        
        {/* Controls Toolbar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 shadow-sm"
              placeholder="Search clients, locations, or emails..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-3 flex-1">
            <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-slate-200/50">
              {[['all','All'],['pending','Pending'],['approved','Approved'],['rejected','Rejected'],['completed','Completed']].map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setStatusFilter(v)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${statusFilter === v ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'}`}
                >
                  {l}
                </button>
              ))}
            </div>
            
            <button
               onClick={exportCsv}
               className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition shadow-sm shrink-0"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Floating Bulk Actions Bar */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40"
            >
              <div className="flex items-center gap-4 rounded-2xl bg-slate-900/95 backdrop-blur-xl px-6 py-4 shadow-2xl ring-1 ring-white/10">
                <p className="text-sm font-bold text-white whitespace-nowrap">
                  <span className="inline-flex items-center justify-center bg-indigo-500 text-white rounded-md w-6 h-6 mr-2">{selectedIds.size}</span>
                  Selected
                </p>
                <div className="h-6 w-px bg-slate-700"></div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleBulkAction('confirmed')} disabled={isBulkUpdating} className="btn-primary py-2 px-4 shadow-none ring-1 ring-white/20 whitespace-nowrap">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Approve All
                  </button>
                  <button onClick={() => handleBulkAction('cancelled')} disabled={isBulkUpdating} className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 transition whitespace-nowrap disabled:opacity-50">
                    <XCircle className="w-4 h-4 mr-2" /> Reject All
                  </button>
                  <button onClick={() => handleBulkAction('delete')} disabled={isBulkUpdating} className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-rose-500/20 transition disabled:opacity-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-20 rounded-2xl border border-slate-200 bg-white animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-100 bg-rose-50/50 p-16 text-center">
            <BookOpen className="mx-auto mb-5 h-14 w-14 text-rose-300" />
            <h3 className="text-lg font-black text-rose-900">Could not load bookings</h3>
            <p className="mt-2 text-sm text-rose-700">{error}</p>
            <button onClick={fetchBookings} className="mt-6 inline-flex rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-700 transition">Retry Loading</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm">
            <BookOpen className="mx-auto mb-5 h-14 w-14 text-slate-200" />
            <h3 className="text-lg font-black text-slate-800">No bookings match your criteria</h3>
            <p className="mt-2 text-sm text-slate-500">Try modifying your search or clearing the status filters.</p>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            
            {/* Table Header */}
            <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1.5fr)_auto_auto] items-center gap-6 border-b border-slate-200 bg-slate-50/80 px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 hidden lg:grid">
              <button onClick={toggleSelectAll} className="p-1 hover:text-slate-800 flex items-center justify-center shrink-0">
                {selectedIds.size === filtered.length && filtered.length > 0 ? (
                  <CheckSquare className="w-5 h-5 text-indigo-600" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </button>
              <div>Client & Status</div>
              <div>Location Details</div>
              <div className="w-[120px] text-right">Value</div>
              <div className="w-[180px] text-right pr-2">Actions</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-slate-100/80 flex flex-col">
              {filtered.map((booking) => {
                const statusMeta = getBookingStatusMeta(booking.status)
                const isSelected = selectedIds.has(booking.id)
                const isExpanded = expandedId === booking.id
                const isUpdating = updatingId === booking.id

                return (
                  <div key={booking.id} className={`group transition-colors ${isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50/50'}`}>
                    
                    {/* Main Row */}
                    <div className="flex flex-col lg:grid lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.5fr)_auto_auto] lg:items-center gap-4 lg:gap-6 px-5 lg:px-6 py-4 lg:py-5">
                      
                      {/* Checkbox & Mobile ID */}
                      <div className="flex items-center justify-between lg:justify-start">
                        <button onClick={() => toggleSelectOne(booking.id)} className="p-1 shrink-0 text-slate-400 hover:text-indigo-600 transition">
                          {isSelected ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5" />}
                        </button>
                        <span className="lg:hidden text-xs font-bold text-slate-400 uppercase tracking-widest">#{booking.id}</span>
                      </div>

                      {/* Client Info */}
                      <div className="min-w-0 flex flex-col gap-1.5 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : booking.id)}>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 truncate">{booking.client_name}</p>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusMeta.badgeClass}`}>
                            {booking.status === 'pending' && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse"></span>}
                            {statusMeta.label}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-500 truncate">{booking.company || 'Direct Booking'} • {booking.email}</p>
                      </div>

                      {/* Location Context */}
                      <div className="min-w-0 flex flex-col gap-1.5 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : booking.id)}>
                        <p className="text-sm font-semibold text-slate-700 truncate text-wrap line-clamp-1">
                          {booking.screen_name || `Location Array #${booking.screen_id}`}
                        </p>
                        <p className="text-xs font-medium text-slate-400 truncate">
                          {booking.location_count > 1 ? `${booking.location_count} connected locations` : (booking.screen_area || 'Standard Plot')} • {booking.duration_label || 'Custom Package'} • {new Date(booking.created_at).toLocaleDateString('en-GB')}
                        </p>
                      </div>

                      {/* Financials */}
                      <div className="lg:w-[120px] lg:text-right flex items-center justify-between lg:block cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : booking.id)}>
                        <p className="lg:hidden text-xs font-bold uppercase tracking-widest text-slate-400">Value</p>
                        <div>
                          <p className="text-sm font-black text-slate-900">{formatInr(booking.total_price)}</p>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">
                            {getBookingSlotCount(booking)} Slot(s)
                          </p>
                        </div>
                      </div>

                      {/* Action Matrix */}
                      <div className="lg:w-[180px] flex items-center justify-end gap-2 lg:gap-3 mt-2 lg:mt-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setQuotationBooking(booking); }}
                          className="flex-1 lg:flex-none inline-flex items-center justify-center rounded-xl bg-violet-50 text-violet-700 border border-violet-200/50 p-2 lg:px-3 text-xs font-bold hover:bg-violet-100 hover:border-violet-300 transition"
                          title="Generate quotation"
                        >
                          <FileEdit className="h-4 w-4 lg:mr-2" />
                          <span className="lg:hidden ml-2">Quote</span>
                        </button>
                        
                        <div className="relative isolate">
                          <button
                            onClick={(e) => { e.stopPropagation(); setActionMenuId(actionMenuId === booking.id ? null : booking.id) }}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          
                          <AnimatePresence>
                            {actionMenuId === booking.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-[calc(100%+8px)] z-20 w-48 origin-top-right rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-xl p-1.5 shadow-xl ring-1 ring-black/5"
                                onClick={e => e.stopPropagation()}
                              >
                                {booking.status === 'pending' && (
                                  <>
                                    <button onClick={() => updateStatus(booking.id, 'confirmed')} disabled={isUpdating} className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition">
                                      <CheckCircle2 className="h-4 w-4" /> Approve
                                    </button>
                                    <button onClick={() => updateStatus(booking.id, 'cancelled')} disabled={isUpdating} className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 transition">
                                      <XCircle className="h-4 w-4" /> Reject
                                    </button>
                                    <div className="my-1.5 border-t border-slate-100" />
                                  </>
                                )}
                                
                                {booking.status !== 'pending' && (
                                  <>
                                    <button onClick={() => updateStatus(booking.id, 'pending')} disabled={isUpdating} className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50 transition">
                                      <Clock className="h-4 w-4" /> Move to Pending
                                    </button>
                                  </>
                                )}

                                <button onClick={() => { setActionMenuId(null); deleteBooking(booking.id) }} disabled={isUpdating} className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition">
                                  <Trash2 className="h-4 w-4" /> Delete Entirely
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Meta Context */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-slate-50 border-t border-slate-100"
                        >
                          <div className="px-6 py-6 lg:pl-16">
                            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                              
                              <div className="space-y-4">
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Created Timestamp</p>
                                  <p className="mt-1 text-sm font-semibold text-slate-800">{new Date(booking.created_at).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Contact Number</p>
                                  <p className="mt-1 text-sm font-semibold text-slate-800">{booking.phone || 'N/A'}</p>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Client Budget Mapping</p>
                                  <p className="mt-1 text-sm font-semibold text-slate-800">{booking.budget ? formatInr(booking.budget) : 'Unspecified Scope'}</p>
                                </div>
                                {booking.ai_category && (
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">AI Assigned Category</p>
                                    <p className="mt-1 text-sm font-bold text-indigo-900 bg-indigo-50 inline-block px-3 py-1 rounded-lg border border-indigo-100">{booking.ai_category}</p>
                                  </div>
                                )}
                              </div>

                              {booking.selected_screens?.length > 0 && (
                                <div className="space-y-2 xl:col-span-1">
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Asset Assignments</p>
                                  <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                                    {booking.selected_screens.map((screen, index) => (
                                      <div key={screen.id || `${booking.id}-${screen.name || 'screen'}-${index}`} className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs flex justify-between items-center">
                                        <div>
                                          <p className="font-bold text-slate-800">{screen.name}</p>
                                          <p className="text-slate-500 font-medium mt-0.5">{screen.area}</p>
                                        </div>
                                        <div className="bg-slate-100 text-slate-600 font-semibold px-2 py-1 rounded-md text-[10px] tracking-wider uppercase">
                                          {screen.slots || booking.slot_quantity} Slot(s)
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Descriptions */}
                            {(booking.ad_description || booking.polished_description || booking.ai_summary) && (
                              <div className="mt-6 border-t border-slate-200/60 pt-6 grid gap-6 xl:grid-cols-2">
                                {booking.ad_description && (
                                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Original Brief Pitch</p>
                                    <p className="text-sm font-medium leading-relaxed text-slate-700">{booking.ad_description}</p>
                                  </div>
                                )}
                                {(booking.polished_description || booking.ai_summary) && (
                                  <div className="space-y-4">
                                    {booking.polished_description && (
                                      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-2 flex items-center gap-1.5">
                                          Polished Output ✨
                                        </p>
                                        <p className="text-sm font-medium leading-relaxed text-indigo-900">{booking.polished_description}</p>
                                      </div>
                                    )}
                                    {booking.ai_summary && (
                                      <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-5">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500 mb-2 flex items-center gap-1.5">
                                          AI Context Summary 🧠
                                        </p>
                                        <p className="text-sm font-medium leading-relaxed italic text-violet-800">{booking.ai_summary}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
