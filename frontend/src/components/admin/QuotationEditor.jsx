import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ArrowLeft, Download, Mail, Loader2, CheckCircle, Save, X,
} from 'lucide-react'
import { saveAs } from 'file-saver'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { buildQuotationItems, calculateQuotationTotals } from '../../utils/quotationPricing'

const DEFAULT_TERMS = {
  terms_payment:
    'All payments are required upfront before the campaign launch. Campaign will not be scheduled without confirmed remittance.',
  terms_content:
    'Olrac reserves the right to review all material and reject or remove any content deemed inappropriate, offensive, or in violation of local standards.',
  terms_downtime:
    'Screen downtime due to power failure, internet issues, or routine maintenance will not be considered a breach of contract, and no compensation or extension will be applicable.',
  terms_branding:
    'By utilizing our advertising services, you acknowledge our primary focus is the priming effect to build brand familiarity; consequently, while immediate results may vary, the strategic value of these placements lies in enhancing brand recall to facilitate both spontaneous and future sales growth, ensuring your products remain top-of-mind for consumers.',
}

function todayLabel() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,'0')} ${String(d.getMonth()+1).padStart(2,'0')} ${d.getFullYear()}`
}

// Transparent borderless input that blends into the document
const EField = ({ value, onChange, className = '', placeholder = '', align = 'left', numeric = false }) => (
  <input
    type={numeric ? 'number' : 'text'}
    value={value ?? ''}
    onChange={e => onChange(numeric ? parseFloat(e.target.value) || 0 : e.target.value)}
    placeholder={placeholder}
    className={`bg-transparent border-b border-transparent hover:border-blue-200 focus:border-blue-400 focus:outline-none w-full transition-colors ${className}`}
    style={{ textAlign: align }}
  />
)

// Transparent borderless textarea
const EArea = ({ value, onChange, className = '', placeholder = '' }) => {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = ref.current.scrollHeight + 'px'
    }
  }, [value])
  return (
    <textarea
      ref={ref}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      className={`bg-transparent border-b border-transparent hover:border-blue-200 focus:border-blue-400 focus:outline-none w-full resize-none overflow-hidden transition-colors leading-relaxed ${className}`}
    />
  )
}

export default function QuotationEditor({ booking, onClose }) {
  const [qData, setQData] = useState(null)
  const [company, setCompany] = useState({})
  const [defaults, setDefaults] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [sendModal, setSendModal] = useState(false)
  const [sendOpts, setSendOpts] = useState({
    to_client: true,
    to_admin: false,
    client_email: booking?.email || '',
    admin_email: '',
  })
  const [sending, setSending] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/bookings/${booking.id}/quotation`)
      const saved = res.data.quotation_data || {}
      const bd = res.data.booking_defaults || {}
      const co = res.data.company || {}
      setDefaults(bd)
      setCompany(co)
      setSendOpts(prev => ({ ...prev, client_email: bd.email || booking?.email || '' }))
      const baseSeconds = bd.base_slot_duration || 20
      const pricingMode = saved.pricing_mode === 'manual' ? 'manual' : 'booking'
      const quoteTaxEnabled = saved.tax_enabled ?? (co?.tax_enabled !== false)
      const quoteTaxRate = saved.tax_rate ?? (co?.tax_rate || 0)
      const normalizedItems = buildQuotationItems({
        screens: bd.selected_screens || [],
        savedItems: saved.items || [],
        totalPrice: bd.total_price || 0,
        durationDays: bd.duration_days || 0,
        durationHours: bd.duration_hours || 0,
        baseSlotDuration: baseSeconds,
        defaultSlotQuantity: bd.slot_quantity || 1,
        pricingMode,
      })
      const totals = calculateQuotationTotals({
        items: normalizedItems,
        discount: saved.discount || 0,
        taxRate: quoteTaxRate,
        taxEnabled: quoteTaxEnabled,
      })

      setQData({
        issue_date: todayLabel(),
        campaign_name: bd.client_company || '',
        duration_start: bd.duration_start || '',
        duration_end: bd.duration_end || '',
        total_days_text: bd.total_days_text || bd.duration || '',
        ...DEFAULT_TERMS,
        ...saved,
        pricing_mode: pricingMode,
        items: normalizedItems,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax_enabled: quoteTaxEnabled,
        tax_rate: totals.taxRate,
        tax_amount: totals.taxAmount,
        grand_total: totals.grandTotal,
      })
    } catch {
      toast.error('Could not load quotation data')
    } finally {
      setLoading(false)
    }
  }

  const persist = useCallback(async (data) => {
    setSaving(true)
    try {
      await api.put(`/admin/bookings/${booking.id}/quotation`, { quotation_data: data })
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1800)
    } catch {
      toast.error('Auto-save failed')
    } finally {
      setSaving(false)
    }
  }, [booking.id])

  const recalculateQuote = useCallback((draft) => {
    const taxEnabled = draft.tax_enabled ?? (company?.tax_enabled !== false)
    const taxRate = draft.tax_rate ?? (company?.tax_rate || 0)
    const totals = calculateQuotationTotals({
      items: draft.items || [],
      discount: draft.discount || 0,
      taxRate,
      taxEnabled,
    })

    return {
      ...draft,
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax_enabled: taxEnabled,
      tax_rate: totals.taxRate,
      tax_amount: totals.taxAmount,
      grand_total: totals.grandTotal,
    }
  }, [company])

  const update = (key, value, options = {}) => {
    setQData(prev => {
      let next = { ...prev, [key]: value }
      if (options.pricingMode) {
        next.pricing_mode = options.pricingMode
      }
      if (key === 'discount' || key === 'items') {
        next = recalculateQuote(next)
      }
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => persist(next), 800)
      return next
    })
  }

  const handleDownloadPDF = async () => {
    setDownloading(true)
    try {
      const res = await api.get(`/admin/bookings/${booking.id}/quotation/pdf`, {
        responseType: 'blob',
      })
      saveAs(res.data, `QUOTATION-${booking.id}.pdf`)
    } catch {
      toast.error('Download failed')
    } finally {
      setDownloading(false)
    }
  }

  const handleSend = async () => {
    if (!sendOpts.to_client && !sendOpts.to_admin) {
      toast.error('Select at least one recipient')
      return
    }
    setSending(true)
    try {
      const res = await api.post(`/admin/bookings/${booking.id}/send-quotation`, {
        send_to_client: sendOpts.to_client,
        send_to_admin: sendOpts.to_admin,
        client_email: sendOpts.client_email,
        admin_email: sendOpts.admin_email,
      })
      const count = res.data.sent_to?.length || 0
      const failed = res.data.failed?.length || 0
      if (count > 0) toast.success(`Quotation sent to ${count} recipient${count !== 1 ? 's' : ''}`)
      if (failed > 0) toast.error(`Failed to send to ${failed} address${failed !== 1 ? 'es' : ''}`)
      if (count > 0) setSendModal(false)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Send failed')
    } finally {
      setSending(false)
    }
  }

  const updateItem = (index, key, val) => {
    const newItems = [...qData.items]
    newItems[index] = { ...newItems[index], [key]: val }
    if (key === 'rate' || key === 'no_of_slots') {
      const r = parseFloat(newItems[index].rate) || 0
      const s = Math.max(1, parseInt(newItems[index].no_of_slots) || 1)
      newItems[index].no_of_slots = s
      newItems[index].subtotal = r * s
      if (key === 'no_of_slots') {
        const baseSeconds = defaults.base_slot_duration || 20
        newItems[index].slot_duration = `${baseSeconds * s} Sec`
      }
    }
    update('items', newItems, { pricingMode: key === 'rate' || key === 'no_of_slots' ? 'manual' : undefined })
  }

  const fmtNum = (v) => parseFloat(v || 0).toLocaleString('en-IN')

  const location = (() => {
    const screens = defaults.selected_screens || []
    if (screens.length > 0) return screens.map(s => s.name || s.area).filter(Boolean).join(', ')
    return defaults.screen_name || `Screen #${defaults.screen_id || ''}`
  })()

  if (loading || !qData) return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 bg-slate-200 overflow-auto">
      {/* â”€â”€ Toolbar â”€â”€ */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shadow-sm gap-4">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Bookings
        </button>

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          {saving ? (
            <><Loader2 className="h-3 w-3 animate-spin" /> Savingâ€¦</>
          ) : savedFlash ? (
            <><CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" /><span className="text-emerald-600">Saved</span></>
          ) : (
            <><Save className="h-3 w-3" /> Auto-save on</>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </button>
          <button
            onClick={() => setSendModal(true)}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}
          >
            <Mail className="h-4 w-4" />
            Send Quotation
          </button>
        </div>
      </div>

      {/* â”€â”€ A4 Document â”€â”€ */}
      <div
        className="mx-auto my-8 bg-white shadow-2xl"
        style={{ width: 794, minHeight: 1123, padding: '52px 56px', fontFamily: "'Segoe UI', Arial, sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex flex-col items-start gap-1">
            {company.logo_url && (
              <img src={company.logo_url} alt="logo" style={{ height: 56, objectFit: 'contain' }} />
            )}
            <div>
              <p className="text-xl font-black text-slate-900 leading-none">{company.name || 'OLRAC'}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 mt-1">Adverse</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Date of Issue</p>
            <EField
              value={qData.issue_date}
              onChange={v => update('issue_date', v)}
              className="text-sm font-bold text-slate-900 mt-0.5 text-right"
              align="right"
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-[28px] font-black text-slate-900 mb-8 tracking-tight">ADVERTISING QUOTATION</h1>

        {/* FROM / TO */}
        <div className="flex gap-8 mb-6">
          <div className="flex-1 border-l-[3px] border-slate-300 pl-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">FROM</p>
            <p className="font-bold text-slate-900 text-[13px]">{company.name}</p>
            {company.phone && <p className="text-[13px] text-slate-600 mt-1">Phone: {company.phone}</p>}
            {company.email && (
              <p className="text-[13px] text-slate-600">
                Email: <span className="text-blue-600">{company.email}</span>
              </p>
            )}
            {company.address && <p className="text-[13px] text-slate-600">Address: {company.address}</p>}
          </div>
          <div className="w-px bg-slate-200 shrink-0" />
          <div className="flex-1 border-l-[3px] border-slate-300 pl-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">TO</p>
            <p className="font-bold text-slate-900 text-[13px]">{defaults.client_name}</p>
            {defaults.client_company && <p className="font-bold text-slate-900 text-[13px]">{defaults.client_company}</p>}
            {defaults.client_phone && <p className="text-[13px] text-slate-600 mt-1">Phone : {defaults.client_phone}</p>}
            {defaults.email && (
              <p className="text-[13px] text-slate-600">
                Email: <span className="text-blue-600">{defaults.email}</span>
              </p>
            )}
          </div>
        </div>

        {/* Campaign info box */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-5 mb-6 grid grid-cols-2 gap-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1">Campaign Name</p>
            <EField
              value={qData.campaign_name}
              onChange={v => update('campaign_name', v)}
              className="text-[13px] font-bold text-blue-600"
              placeholder="Enter campaign nameâ€¦"
            />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1">Screen Location</p>
            <p className="text-[13px] font-medium text-slate-700">{location}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1">Duration</p>
            <div className="flex items-center gap-1">
              <EField
                value={qData.duration_start}
                onChange={v => update('duration_start', v)}
                className="text-[13px] font-medium text-slate-700"
                placeholder="dd-mm-yyyy"
              />
              <span className="text-slate-400 shrink-0">â€“</span>
              <EField
                value={qData.duration_end}
                onChange={v => update('duration_end', v)}
                className="text-[13px] font-medium text-slate-700"
                placeholder="dd-mm-yyyy"
              />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1">Total Days</p>
            <EField
              value={qData.total_days_text}
              onChange={v => update('total_days_text', v)}
              className="text-[13px] font-medium text-slate-700"
              placeholder="e.g. 90 Days + 30 DAYS FREE (120)"
            />
          </div>
        </div>

        {/* Service table */}
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">Service Description</p>
        <table className="w-full text-[12px] border-collapse mb-1">
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              {['Location & Detail', 'Slots', 'Slot Size', 'Rate', 'Total Amount'].map((h, i) => (
                <th
                  key={h}
                  className="px-3 py-2.5 font-bold text-slate-600 border border-slate-200"
                  style={{ textAlign: i === 0 ? 'left' : i >= 3 ? 'right' : 'center', whiteSpace: 'nowrap' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(qData.items || []).map((item, idx) => (
              <tr key={item.id || idx}>
                <td className="px-3 py-3 border border-slate-200" style={{ minWidth: 180 }}>
                  <EField value={item.description} onChange={v => updateItem(idx, 'description', v)} className="text-[12px] text-slate-800 font-bold" />
                </td>
                <td className="px-3 py-3 border border-slate-200 text-center" style={{ width: 80 }}>
                  <EField value={item.no_of_slots} onChange={v => updateItem(idx, 'no_of_slots', v)} numeric className="text-[12px]" align="center" />
                </td>
                <td className="px-3 py-3 border border-slate-200 text-center" style={{ width: 100 }}>
                  <EField value={item.slot_duration} onChange={v => updateItem(idx, 'slot_duration', v)} className="text-[12px]" align="center" />
                </td>
                <td className="px-3 py-3 border border-slate-200 text-right" style={{ width: 100 }}>
                  <EField value={item.rate} onChange={v => updateItem(idx, 'rate', v)} numeric className="text-[12px]" align="right" />
                </td>
                <td className="px-3 py-3 border border-slate-200 text-right font-bold text-slate-900" style={{ width: 100 }}>
                  {fmtNum(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pricing summary */}
        <div className="flex justify-end mt-4 mb-8">
          <div style={{ width: 260 }}>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-[13px] text-slate-500">Subtotal</span>
              <span className="text-[13px] font-medium text-slate-800">Rs {fmtNum(qData.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-[13px] text-blue-500">Discount</span>
              <div style={{ width: 110, textAlign: 'right' }}>
                <EField value={qData.discount} onChange={v => update('discount', v)} numeric className="text-[13px] font-medium text-blue-600" align="right" />
              </div>
            </div>
            {qData.tax_enabled !== false && parseFloat(qData.tax_rate || 0) > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-[13px] text-slate-500">Tax ({qData.tax_rate}%)</span>
                <span className="text-[13px] font-medium text-slate-800">
                  {fmtNum(qData.tax_amount)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-3">
              <span className="text-[15px] font-black text-slate-900">Grand Total</span>
              <span className="text-[15px] font-black text-blue-600">Rs {fmtNum(qData.grand_total)}</span>
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="mb-8">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-900 mb-4 pb-2 border-b border-slate-200">
            Terms &amp; Conditions
          </p>
          <div className="grid grid-cols-2 gap-x-10 gap-y-5">
            {[
              ['01. PAYMENT', 'terms_payment'],
              ['02. CONTENT POLICY', 'terms_content'],
              ['03. DOWNTIME', 'terms_downtime'],
              ['04. BRAND PRIMING', 'terms_branding'],
            ].map(([label, key]) => (
              <div key={key}>
                <p className="text-[11px] font-bold text-slate-700 mb-1">{label}</p>
                <EArea value={qData[key]} onChange={v => update(key, v)} className="text-[11px] text-slate-600" />
              </div>
            ))}
          </div>
        </div>

        {/* Authorized signatory */}
        <div className="flex justify-end pt-6 border-t border-slate-100">
          <div className="flex items-end gap-6">
            {company.seal_url && (
              <img src={company.seal_url} alt="seal" style={{ height: 80, objectFit: 'contain' }} />
            )}
            <div className="flex flex-col items-center">
              <span
                className="text-[12px] font-semibold text-slate-600 uppercase tracking-[0.16em] pb-0.5"
                style={{ borderBottom: '1px solid #94a3b8' }}
              >
                Authorized Signatory
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* â”€â”€ Send Modal â”€â”€ */}
      {sendModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-slate-900">Send Quotation</h3>
              <button onClick={() => setSendModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className={`rounded-xl border p-4 transition-colors ${sendOpts.to_client ? 'border-violet-200 bg-violet-50/40' : 'border-slate-200'}`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendOpts.to_client}
                    onChange={e => setSendOpts(p => ({ ...p, to_client: e.target.checked }))}
                    className="rounded accent-violet-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Send to Client</p>
                    <p className="text-xs text-slate-500">One copy to the customer's inbox</p>
                  </div>
                </label>
                {sendOpts.to_client && (
                  <input
                    type="email"
                    value={sendOpts.client_email}
                    onChange={e => setSendOpts(p => ({ ...p, client_email: e.target.value }))}
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
                    placeholder="client@example.com"
                  />
                )}
              </div>

              <div className={`rounded-xl border p-4 transition-colors ${sendOpts.to_admin ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200'}`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendOpts.to_admin}
                    onChange={e => setSendOpts(p => ({ ...p, to_admin: e.target.checked }))}
                    className="rounded accent-blue-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Send Copy to Admin</p>
                    <p className="text-xs text-slate-500">One copy to your admin inbox</p>
                  </div>
                </label>
                {sendOpts.to_admin && (
                  <input
                    type="email"
                    value={sendOpts.admin_email}
                    onChange={e => setSendOpts(p => ({ ...p, admin_email: e.target.value }))}
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                    placeholder="admin@olrac.com"
                  />
                )}
              </div>

              <button
                onClick={handleSend}
                disabled={sending}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-50 transition-opacity"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#6366f1)' }}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {sending ? 'Sendingâ€¦' : 'Send Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

