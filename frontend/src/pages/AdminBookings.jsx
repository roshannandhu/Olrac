import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileDown,
  FileText,
  MoreHorizontal,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react'
import { saveAs } from 'file-saver'

import api from '../api/axios'
import { formatInr, getBookingStatusMeta } from '../utils/adminUi'
import { getBillingLabel } from '../utils/screenPricing'

export default function AdminBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [invoiceMenuId, setInvoiceMenuId] = useState(null)
  const [actionMenuId, setActionMenuId] = useState(null)
  const [invoiceLoadingId, setInvoiceLoadingId] = useState(null)

  const fetchBookings = () => {
    setLoading(true)
    api.get('/admin/bookings')
      .then((res) => {
        setBookings(res.data)
        setError('')
      })
      .catch((err) => {
        const message = err.response?.data?.detail || 'Failed to load bookings from the database'
        setError(message)
        toast.error(message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/admin/bookings/${id}/status`, { status })
      toast.success(`Booking #${id} updated`)
      fetchBookings()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed')
    }
  }

  const deleteBooking = async (id) => {
    if (!confirm(`Delete booking #${id}?`)) return
    try {
      await api.delete(`/admin/bookings/${id}`)
      toast.success('Booking deleted')
      fetchBookings()
    } catch {
      toast.error('Delete failed')
    }
  }

  const downloadInvoice = async (booking, format) => {
    setInvoiceLoadingId(booking.id)
    try {
      const response = await api.get(`/admin/bookings/${booking.id}/invoice`, {
        params: { format },
        responseType: 'blob',
      })
      const contentType = response.headers?.['content-type'] || ''
      if (!contentType.includes(format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
        const message = await response.data.text()
        throw new Error(message || 'Unexpected invoice response')
      }
      const extension = format === 'pdf' ? 'pdf' : 'docx'
      saveAs(response.data, `INV-${String(booking.id).padStart(5, '0')}.${extension}`)
      setInvoiceMenuId(null)
    } catch (err) {
      toast.error(err.message || 'Invoice download failed')
    } finally {
      setInvoiceLoadingId(null)
    }
  }

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return bookings
      .slice()
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
      .filter((booking) => {
        const selectedLocationsSearch = (booking.selected_screens || [])
          .map((screen) => `${screen.name || ''} ${screen.area || ''}`)
          .join(' ')
          .toLowerCase()

        const matchSearch = !normalizedSearch
          || booking.client_name?.toLowerCase().includes(normalizedSearch)
          || booking.company?.toLowerCase().includes(normalizedSearch)
          || booking.screen_name?.toLowerCase().includes(normalizedSearch)
          || booking.email?.toLowerCase().includes(normalizedSearch)
          || selectedLocationsSearch.includes(normalizedSearch)

        const rawStatus = String(booking.status || '').toLowerCase()
        const normalizedStatus = rawStatus === 'confirmed'
          ? 'approved'
          : rawStatus === 'cancelled'
            ? 'rejected'
            : rawStatus
        const matchStatus = statusFilter === 'all' || normalizedStatus === statusFilter
        return matchSearch && matchStatus
      })
  }, [bookings, search, statusFilter])

  const counts = {
    all: bookings.length,
    pending: bookings.filter((booking) => booking.status === 'pending').length,
    approved: bookings.filter((booking) => ['confirmed', 'approved'].includes(booking.status)).length,
    rejected: bookings.filter((booking) => ['cancelled', 'rejected'].includes(booking.status)).length,
    completed: bookings.filter((booking) => booking.status === 'completed').length,
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <BookOpen className="h-3.5 w-3.5" />
              Booking Operations
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Manage Bookings</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Review bookings in arrival order, keep invoice downloads primary, and handle the rest from a cleaner action menu.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Total', counts.all],
              ['Pending', counts.pending],
              ['Approved', counts.approved],
              ['Rejected', counts.rejected + counts.completed],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
              placeholder="Search by client, company, locations, or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              ['all', 'All'],
              ['pending', 'Pending'],
              ['approved', 'Approved'],
              ['rejected', 'Rejected'],
              ['completed', 'Completed'],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  statusFilter === value
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 space-y-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-36 rounded-[26px] border border-slate-200 bg-slate-50 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-6 rounded-[28px] border border-rose-100 bg-rose-50 p-12 text-center">
          <BookOpen className="mx-auto mb-4 h-14 w-14 text-rose-200" />
          <h3 className="text-lg font-semibold text-rose-900">Could not load bookings</h3>
          <p className="mt-2 text-sm text-rose-700">{error}</p>
          <button onClick={fetchBookings} className="btn-primary mt-5 text-sm">
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-12 text-center shadow-sm">
          <BookOpen className="mx-auto mb-4 h-14 w-14 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-700">No bookings found</h3>
          <p className="mt-2 text-sm text-slate-500">Try another status filter or search term.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {filtered.map((booking, index) => {
            const statusMeta = getBookingStatusMeta(booking.status)

            return (
              <div key={booking.id} className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-5 p-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="inline-flex h-11 min-w-11 items-center justify-center rounded-2xl bg-slate-900 px-3 text-sm font-bold text-white">
                        #{index + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">{booking.client_name}</h3>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badgeClass}`}>
                            {statusMeta.label}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {booking.screen_name || `Screen #${booking.screen_id}`} | {booking.location_count > 1 ? `${booking.location_count} locations` : (booking.screen_area || 'Location not set')} | {getBillingLabel(booking.billing_cycle)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Booking ID</p>
                        <p className="mt-2 text-sm font-semibold text-slate-800">#{booking.id}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Created</p>
                        <p className="mt-2 text-sm font-semibold text-slate-800">{new Date(booking.created_at).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Company</p>
                        <p className="mt-2 text-sm font-semibold text-slate-800">{booking.company || 'Not provided'}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Booking Value</p>
                        <p className="mt-2 text-sm font-semibold text-slate-800">{formatInr(booking.total_price)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="xl:w-[220px]">
                    <div className="flex justify-start gap-2 xl:justify-end">
                      <div className="relative">
                        <button
                          onClick={() => {
                            setActionMenuId(null)
                            setInvoiceMenuId(invoiceMenuId === booking.id ? null : booking.id)
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"
                        >
                          <FileDown className="h-4 w-4" />
                          Download
                        </button>

                        {invoiceMenuId === booking.id ? (
                          <div className="absolute right-0 top-[calc(100%+10px)] z-20 w-56 rounded-3xl border border-slate-200 bg-white p-2 shadow-[0_18px_60px_rgba(15,23,42,0.16)]">
                            <p className="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Invoice Format
                            </p>
                            <button
                              onClick={() => downloadInvoice(booking, 'pdf')}
                              disabled={invoiceLoadingId === booking.id}
                              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              <FileText className="h-4 w-4 text-blue-600" />
                              Download PDF
                            </button>
                            <button
                              onClick={() => downloadInvoice(booking, 'docx')}
                              disabled={invoiceLoadingId === booking.id}
                              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              <FileDown className="h-4 w-4 text-violet-600" />
                              Download Word
                            </button>
                          </div>
                        ) : null}
                      </div>

                      <div className="relative">
                        <button
                          onClick={() => {
                            setInvoiceMenuId(null)
                            setActionMenuId(actionMenuId === booking.id ? null : booking.id)
                          }}
                          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-3 py-2.5 text-slate-600 hover:bg-slate-50"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>

                        {actionMenuId === booking.id ? (
                          <div className="absolute right-0 top-[calc(100%+10px)] z-20 w-56 rounded-3xl border border-slate-200 bg-white p-2 shadow-[0_18px_60px_rgba(15,23,42,0.16)]">
                            {booking.status === 'pending' ? (
                              <>
                                <button
                                  onClick={() => {
                                    setActionMenuId(null)
                                    updateStatus(booking.id, 'confirmed')
                                  }}
                                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Approve Booking
                                </button>
                                <button
                                  onClick={() => {
                                    setActionMenuId(null)
                                    updateStatus(booking.id, 'cancelled')
                                  }}
                                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-rose-700 hover:bg-rose-50"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Reject Booking
                                </button>
                              </>
                            ) : null}

                            {booking.status === 'confirmed' ? (
                              <button
                                onClick={() => {
                                  setActionMenuId(null)
                                  updateStatus(booking.id, 'cancelled')
                                }}
                                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-rose-700 hover:bg-rose-50"
                              >
                                <XCircle className="h-4 w-4" />
                                Reject Booking
                              </button>
                            ) : null}

                            {booking.status === 'cancelled' ? (
                              <button
                                onClick={() => {
                                  setActionMenuId(null)
                                  updateStatus(booking.id, 'pending')
                                }}
                                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-amber-700 hover:bg-amber-50"
                              >
                                <Clock className="h-4 w-4" />
                                Move To Pending
                              </button>
                            ) : null}

                            <button
                              onClick={() => {
                                setActionMenuId(null)
                                setExpandedId(expandedId === booking.id ? null : booking.id)
                              }}
                              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <ChevronDown className={`h-4 w-4 transition-transform ${expandedId === booking.id ? 'rotate-180' : ''}`} />
                              {expandedId === booking.id ? 'Hide Details' : 'View Details'}
                            </button>

                            <button
                              onClick={() => {
                                setActionMenuId(null)
                                deleteBooking(booking.id)
                              }}
                              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete Booking
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                {expandedId === booking.id ? (
                  <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-5">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Email</p>
                        <p className="mt-2 text-sm text-slate-700">{booking.email}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Phone</p>
                        <p className="mt-2 text-sm text-slate-700">{booking.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Budget</p>
                        <p className="mt-2 text-sm text-slate-700">{booking.budget ? formatInr(booking.budget) : 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Slots Booked</p>
                        <p className="mt-2 text-sm text-slate-700">{booking.slot_quantity}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Billing Cycle</p>
                        <p className="mt-2 text-sm text-slate-700">{getBillingLabel(booking.billing_cycle)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">AI Category</p>
                        <p className="mt-2 text-sm text-slate-700">{booking.ai_category || 'Not available'}</p>
                      </div>
                    </div>

                    {booking.selected_screens?.length ? (
                      <div className="mt-5 rounded-2xl bg-white p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Selected Locations</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {booking.selected_screens.map((screen) => (
                            <div key={`${booking.id}-${screen.id}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <p className="text-sm font-semibold text-slate-900">{screen.name || `Screen #${screen.id}`}</p>
                              <p className="mt-1 text-sm text-slate-500">{screen.area || 'Area not set'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {booking.ad_description ? (
                      <div className="mt-5 rounded-2xl bg-white p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Ad Description</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{booking.ad_description}</p>
                      </div>
                    ) : null}

                    {booking.polished_description ? (
                      <div className="mt-4 rounded-2xl bg-white p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-500">AI Polished Description</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{booking.polished_description}</p>
                      </div>
                    ) : null}

                    {booking.ai_summary ? (
                      <div className="mt-4 rounded-2xl bg-white p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-500">AI Summary</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700 italic">{booking.ai_summary}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
