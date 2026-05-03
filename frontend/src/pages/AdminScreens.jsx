import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Ban, CheckCircle2, RefreshCw, Loader2, MapPin,
  Monitor, Pencil, Plus, Save, Trash2, Unlock, User, Users,
  X, Download, CheckSquare, Square, MoreHorizontal, FileImage, Search, Video,
  ChevronLeft, ChevronRight, GripHorizontal
} from 'lucide-react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { AnimatePresence, motion } from 'framer-motion'

import api from '../api/axios'

const baseMarker = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:36px;position:relative;
    filter: drop-shadow(0 3px 8px rgba(0,0,0,0.35));
  ">
    <svg viewBox='0 0 28 36' fill='none' xmlns='http://www.w3.org/2000/svg' style='width:100%;height:100%;'>
      <path d='M14 0C6.268 0 0 6.268 0 14c0 9.941 14 22 14 22s14-12.059 14-22C28 6.268 21.732 0 14 0z' fill='#E53E3E'/>
      <circle cx='14' cy='14' r='5.5' fill='white'/>
    </svg>
  </div>`,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
})

function MapPicker({ position, onChange }) {
  useMapEvents({ click(event) { onChange(event.latlng) } })
  if (!position) return null
  return (
    <Marker
      position={[position.lat, position.lng]}
      icon={baseMarker}
      draggable
      eventHandlers={{ dragend(event) { onChange(event.target.getLatLng()) } }}
    />
  )
}

function StaticMap({ position }) {
  if (!position) return null
  const lat = Number(position.lat)
  const lng = Number(position.lng)
  return (
    <div className="h-full w-full relative z-0">
      <MapContainer center={[lat, lng]} zoom={14} style={{ width: '100%', height: '100%' }} zoomControl={false} dragging={false} scrollWheelZoom={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <Marker position={[lat, lng]} icon={baseMarker} />
      </MapContainer>
    </div>
  )
}

function getGalleryMediaItems(mediaState) {
  const items = []

  if (mediaState.image_url) {
    items.push({
      id: mediaState.image_url,
      url: mediaState.image_url,
      type: 'image',
      label: 'Hero Image',
      helper: 'Primary visual',
    })
  }

  if (mediaState.promo_video_url) {
    items.push({
      id: mediaState.promo_video_url,
      url: mediaState.promo_video_url,
      type: 'video',
      label: 'Showcase Video',
      helper: 'Playable media',
      poster: mediaState.image_url || mediaState.additional_images?.[0] || '',
    })
  }

  for (const [index, imageUrl] of (mediaState.additional_images || []).entries()) {
    items.push({
      id: imageUrl,
      url: imageUrl,
      type: 'image',
      label: `Gallery Image ${index + 1}`,
      helper: 'Extra angle',
    })
  }

  return items
}

function normalizeGalleryOrder(order, mediaState) {
  const items = getGalleryMediaItems(mediaState)
  const availableIds = items.map((item) => item.id)
  const availableSet = new Set(availableIds)
  const normalized = []

  for (const rawId of Array.isArray(order) ? order : []) {
    if (typeof rawId !== 'string' || !availableSet.has(rawId) || normalized.includes(rawId)) continue
    normalized.push(rawId)
  }

  for (const id of availableIds) {
    if (!normalized.includes(id)) normalized.push(id)
  }

  return normalized
}

function replaceOrAppendGalleryId(order, previousId, nextId) {
  const nextOrder = Array.isArray(order) ? [...order] : []

  if (previousId) {
    const existingIndex = nextOrder.indexOf(previousId)
    if (existingIndex >= 0) {
      nextOrder[existingIndex] = nextId
      return nextOrder
    }
  }

  if (nextId && !nextOrder.includes(nextId)) nextOrder.push(nextId)
  return nextOrder
}

function sortGalleryItemsByOrder(items, order) {
  const orderMap = new Map((Array.isArray(order) ? order : []).map((id, index) => [id, index]))
  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftOrder = orderMap.get(left.item.id)
      const rightOrder = orderMap.get(right.item.id)
      if (leftOrder === undefined && rightOrder === undefined) return left.index - right.index
      if (leftOrder === undefined) return 1
      if (rightOrder === undefined) return -1
      return leftOrder - rightOrder
    })
    .map(({ item }) => item)
}

export default function AdminScreens() {
  const [screens, setScreens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [locating, setLocating] = useState(false)
  const [recalculating, setRecalculating] = useState(false)

  // Layout State
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [actionMenuId, setActionMenuId] = useState(null)

  // Bulk Actions
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)

  const emptyForm = {
    name: '', area: '', description: '', base_price: '', price_unit: 'day',
    total_slots: 10, latitude: '',
    longitude: '', footfall: '', image_url: '', promo_video_url: '', additional_images: [], gallery_order: [],
  }

  const [form, setForm] = useState(emptyForm)

  const setFormWithGallerySync = (updater) => {
    setForm((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater
      return {
        ...next,
        gallery_order: normalizeGalleryOrder(next.gallery_order, next),
      }
    })
  }

  const mapCenter = useMemo(() => {
    const lat = Number(form.latitude)
    const lng = Number(form.longitude)
    return (Number.isFinite(lat) && Number.isFinite(lng)) ? { lat, lng } : { lat: 12.9716, lng: 77.5946 }
  }, [form.latitude, form.longitude])

  const mapPosition = useMemo(() => {
    const lat = Number(form.latitude)
    const lng = Number(form.longitude)
    return (Number.isFinite(lat) && Number.isFinite(lng)) ? { lat, lng } : null
  }, [form.latitude, form.longitude])

  const fetchScreens = () => {
    setLoading(true)
    api.get('/admin/screens')
      .then(res => { setScreens(res.data); setError('') })
      .catch(err => {
        let message = err.response?.data?.detail || 'Failed to load screens'
        if (typeof message !== 'string') message = JSON.stringify(message)
        setError(message)
        toast.error(message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchScreens() }, [])

  // Close menus
  useEffect(() => {
    const handler = () => setActionMenuId(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const update = (key, value) => setFormWithGallerySync((current) => ({ ...current, [key]: value }))

  const screenStats = useMemo(() => ({
    all: screens.length,
    live: screens.filter(s => s.is_active && s.available_slots > 0).length,
    full: screens.filter(s => s.available_slots <= 0).length,
    blocked: screens.filter(s => !s.is_active && s.available_slots > 0).length,
  }), [screens])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return screens
      .slice()
      .filter(s => {
        const matchSearch = !q || s.name?.toLowerCase().includes(q) || s.area?.toLowerCase().includes(q)
        const isFull = s.available_slots <= 0
        const isBlocked = !s.is_active
        let status = 'live'
        if (isFull) status = 'full'
        else if (isBlocked) status = 'blocked'

        const matchStatus = statusFilter === 'all' || status === statusFilter
        return matchSearch && matchStatus
      })
  }, [screens, search, statusFilter])

  const openCreate = () => { setForm(emptyForm); setEditId(null); setShowForm(true) }

  const openEdit = (screen) => {
    const nextForm = {
      name: screen.name || '', area: screen.area || '', description: screen.description || '',
      base_price: screen.base_price || '', price_unit: screen.price_unit || 'day',
      total_slots: screen.total_slots || 10, latitude: screen.latitude ?? '',
      longitude: screen.longitude ?? '', footfall: screen.footfall || '',
      image_url: screen.image_url || '', promo_video_url: screen.promo_video_url || '', additional_images: screen.additional_images || [],
      gallery_order: screen.gallery_order || [],
    }
    setForm({
      ...nextForm,
      gallery_order: normalizeGalleryOrder(nextForm.gallery_order, nextForm),
    })
    setEditId(screen.id)
    setShowForm(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    const normalizedGalleryOrder = normalizeGalleryOrder(form.gallery_order, form)
    const payload = {
      ...form, base_price: Number(form.base_price) || 0, price_unit: form.price_unit || 'day',
      total_slots: Number(form.total_slots) || 10,
      latitude: form.latitude === '' ? null : Number(form.latitude),
      longitude: form.longitude === '' ? null : Number(form.longitude),
      footfall: form.footfall || null, image_url: form.image_url || null, promo_video_url: form.promo_video_url || null,
      additional_images: form.additional_images || [], gallery_order: normalizedGalleryOrder,
    }
    try {
      if (editId) {
        await api.put(`/admin/screens/${editId}`, payload)
        toast.success('Screen updated')
      } else {
        await api.post('/admin/screens', payload)
        toast.success('Screen created')
      }
      setShowForm(false)
      fetchScreens()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed')
    } finally { setSaving(false) }
  }

  const handleAutoLocate = async () => {
    const query = [form.name, form.area].filter(Boolean).join(', ')
    if (!query) return toast.error('Add a screen name or area first')
    setLocating(true)
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
      const data = await response.json()
      if (!data?.length) return toast.error('No coordinates found for that location')
      update('latitude', data[0].lat)
      update('longitude', data[0].lon)
      toast.success('Coordinates added')
    } catch {
      toast.error('Auto locate failed')
    } finally { setLocating(false) }
  }

  const uploadMedia = async (file, onSuccess, failureMessage = 'Upload failed') => {
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      setSaving(true)
      const res = await api.post('/admin/screens/upload-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      onSuccess(res.data.url)
    } catch { toast.error(failureMessage) } 
    finally { setSaving(false) }
  }

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0]
    await uploadMedia(file, (url) => {
      setFormWithGallerySync((current) => ({
        ...current,
        image_url: url,
        gallery_order: replaceOrAppendGalleryId(current.gallery_order, current.image_url, url),
      }))
      toast.success('Cover image uploaded.')
    }, 'Cover image upload failed')
    event.target.value = ''
  }

  const handleAdditionalImageUpload = async (event) => {
    const file = event.target.files?.[0]
    if ((form.additional_images || []).length >= 3) return toast.error('Maximum 3 additional images allowed')
    await uploadMedia(file, (url) => {
      setFormWithGallerySync((current) => ({
        ...current,
        additional_images: [...(current.additional_images || []), url],
        gallery_order: [...(current.gallery_order || []), url],
      }))
      toast.success('Additional image uploaded')
    }, 'Additional image upload failed')
    event.target.value = ''
  }

  const removeAdditionalImage = (index) => setFormWithGallerySync((current) => ({
    ...current,
    additional_images: (current.additional_images || []).filter((_, itemIndex) => itemIndex !== index),
  }))
  const removePromoVideo = () => setFormWithGallerySync((current) => ({ ...current, promo_video_url: '' }))

  const handleVideoUpload = async (event) => {
    const file = event.target.files?.[0]
    await uploadMedia(file, (url) => {
      setFormWithGallerySync((current) => ({
        ...current,
        promo_video_url: url,
        gallery_order: replaceOrAppendGalleryId(current.gallery_order, current.promo_video_url, url),
      }))
      toast.success('Showcase video uploaded.')
    }, 'Showcase video upload failed')
    event.target.value = ''
  }

  const orderedGalleryItems = useMemo(
    () => sortGalleryItemsByOrder(getGalleryMediaItems(form), form.gallery_order),
    [form]
  )

  const galleryStackItems = useMemo(
    () => orderedGalleryItems.filter((item) => item.id !== form.image_url),
    [orderedGalleryItems, form.image_url]
  )

  const moveGalleryItem = (itemId, direction) => {
    setFormWithGallerySync((current) => {
      const nextOrder = normalizeGalleryOrder(current.gallery_order, current)
      const currentIndex = nextOrder.indexOf(itemId)
      const targetIndex = currentIndex + direction
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= nextOrder.length) return current
      const reordered = [...nextOrder]
      ;[reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]]
      return { ...current, gallery_order: reordered }
    })
  }

  const recalculateSlots = async () => {
    setRecalculating(true)
    try {
      const res = await api.post('/admin/screens/recalculate-slots')
      toast.success(res.data.detail || 'Slot counts recalculated')
      fetchScreens()
    } catch (err) { toast.error(err.response?.data?.detail || 'Recalculate failed') } 
    finally { setRecalculating(false) }
  }

  const deleteScreen = async (screen) => {
    if (!window.confirm(`Permanently delete "${screen.name}"? This cannot be undone.`)) return
    setActionLoadingId(screen.id)
    try {
      const res = await api.delete(`/admin/screens/${screen.id}`)
      toast.success(res.data?.detail || 'Screen deleted permanently')
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(screen.id)
        return next
      })
      fetchScreens()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed')
    } finally {
      setActionLoadingId(null)
      setActionMenuId(null)
    }
  }

  const toggleAvailability = async (screen) => {
    if (screen.available_slots <= 0) return toast.error('This location is auto-blocked (full slots)')
    setActionLoadingId(screen.id)
    try {
      await api.put(`/admin/screens/${screen.id}`, { is_active: !screen.is_active })
      toast.success(screen.is_active ? 'Location blocked' : 'Location unblocked')
      fetchScreens()
    } catch (err) { toast.error(err.response?.data?.detail || 'Availability update failed') } 
    finally { setActionLoadingId(null); setActionMenuId(null); setSelectedIds(p => { const o = new Set(p); o.delete(screen.id); return o }) }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map(s => s.id)))
  }

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => {
      const p = new Set(prev)
      if (p.has(id)) p.delete(id)
      else p.add(id)
      return p
    })
  }

  const handleBulkAction = async (action) => {
    if (selectedIds.size === 0) return
    const isBlock = action === 'block'
    const confirmMsg = isBlock
      ? `Force block ${selectedIds.size} locations?`
      : action === 'unblock'
        ? `Attempt unblock on ${selectedIds.size} locations?`
        : `Permanently delete ${selectedIds.size} locations? This cannot be undone.`
    if (!window.confirm(confirmMsg)) return

    setIsBulkUpdating(true)
    try {
      const targets = Array.from(selectedIds)
      const results = await Promise.allSettled(targets.map(id => {
        if (action === 'delete') return api.delete(`/admin/screens/${id}`)
        return api.put(`/admin/screens/${id}`, { is_active: !isBlock })
      }))

      const successCount = results.filter((result) => result.status === 'fulfilled').length
      const failureCount = results.length - successCount

      if (successCount > 0) {
        toast.success(
          action === 'delete'
            ? `${successCount} location${successCount > 1 ? 's' : ''} deleted permanently`
            : 'Bulk action completed'
        )
      }

      if (failureCount > 0) {
        const firstFailure = results.find((result) => result.status === 'rejected')
        const detail = firstFailure?.reason?.response?.data?.detail || 'Some locations could not be processed'
        toast.error(`${failureCount} failed. ${detail}`)
      }

      setSelectedIds(new Set())
      fetchScreens()
    } catch {
      toast.error('Failed processing bulk request')
    } finally {
      setIsBulkUpdating(false)
    }
  }

  const exportCsv = () => {
    const targets = selectedIds.size > 0 ? screens.filter(s => selectedIds.has(s.id)) : filtered
    if (targets.length === 0) return toast.error("No screens to export")

    const headers = ['ID', 'Name', 'Area', 'Base Rate', 'Unit', 'Booked', 'Available', 'Status', 'Footfall']
    const rows = targets.map(s => [
      s.id,
      `"${s.name || ''}"`,
      `"${s.area || ''}"`,
      s.base_price,
      s.price_unit,
      s.booked_slots,
      s.available_slots,
      s.available_slots <= 0 ? 'Full' : !s.is_active ? 'Blocked' : 'Live',
      `"${s.footfall || 'None'}"`
    ])
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `inventory_export_${new Date().toISOString().slice(0,10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Premium Glass Header */}
      <div className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl px-6 py-5 lg:px-8 shadow-sm">
        <div className="max-w-[1500px] mx-auto flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg shadow-sky-200 shrink-0" style={{ background: 'linear-gradient(135deg, #0284c7, #38bdf8)' }}>
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Inventory & Assets</h1>
              <p className="text-sm font-medium text-slate-500 mt-1">Deploy, block, and track location performance.</p>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar items-center">
            {[['Total', screenStats.all, 'text-slate-900', 'bg-slate-100'], 
              ['Live', screenStats.live, 'text-emerald-700', 'bg-emerald-100'], 
              ['Full', screenStats.full, 'text-amber-700', 'bg-amber-100'], 
              ['Blocked', screenStats.blocked, 'text-rose-700', 'bg-rose-100']
             ].map(([label, value, txtCls, bgCls]) => (
              <div key={label} className="rounded-2xl border border-slate-200/60 bg-white/50 backdrop-blur-md px-5 py-3 text-center shadow-sm min-w-[90px]">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  {label === 'Live' && value > 0 && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
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
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-100 shadow-sm"
              placeholder="Search by location name or area..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-3 flex-1 flex-wrap">
            <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-slate-200/50">
              {[['all','All'],['live','Live'],['full','Full'],['blocked','Blocked']].map(([v, l]) => (
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
               onClick={recalculateSlots}
               disabled={recalculating}
               className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition shadow-sm shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${recalculating ? 'animate-spin' : ''}`} />
              Recalc Slots
            </button>
            <button
               onClick={exportCsv}
               className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-sky-600 transition shadow-sm shrink-0"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-600 transition shadow-sm shadow-sky-200 shrink-0"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Screen
            </button>
          </div>
        </div>

        {/* Floating Bulk Action Bar */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div 
              initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40"
            >
              <div className="flex items-center gap-4 rounded-2xl bg-slate-900/95 backdrop-blur-xl px-6 py-4 shadow-2xl ring-1 ring-white/10">
                <p className="text-sm font-bold text-white whitespace-nowrap">
                  <span className="inline-flex items-center justify-center bg-sky-500 text-white rounded-md w-6 h-6 mr-2">{selectedIds.size}</span>
                  Selected
                </p>
                <div className="h-6 w-px bg-slate-700"></div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleBulkAction('block')} disabled={isBulkUpdating} className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-bold text-white bg-slate-800 hover:bg-slate-700 transition whitespace-nowrap disabled:opacity-50 border border-slate-700">
                    <Ban className="w-4 h-4 mr-2" /> Force Block
                  </button>
                  <button onClick={() => handleBulkAction('unblock')} disabled={isBulkUpdating} className="btn-primary bg-emerald-600 hover:bg-emerald-500 ring-0 shadow-none py-2 px-4 whitespace-nowrap">
                    <Unlock className="w-4 h-4 mr-2" /> Set Live
                  </button>
                  <button onClick={() => handleBulkAction('delete')} disabled={isBulkUpdating} className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-rose-500 transition disabled:opacity-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table Rendering */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-24 rounded-3xl border border-slate-200 bg-white animate-pulse" />)}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-100 bg-rose-50/50 p-16 text-center">
            <Monitor className="mx-auto mb-5 h-14 w-14 text-rose-300" />
            <h3 className="text-lg font-black text-rose-900">System Error</h3>
            <p className="mt-2 text-sm text-rose-700">{error}</p>
            <button onClick={fetchScreens} className="mt-6 inline-flex rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-700 transition">Retry Data Connect</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm">
            <Monitor className="mx-auto mb-5 h-14 w-14 text-slate-200" />
            <h3 className="text-lg font-black text-slate-800">No Inventory Found</h3>
            <p className="mt-2 text-sm text-slate-500">Asset list is empty for the current filter criteria.</p>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
            {/* Table Header */}
              <div className="grid grid-cols-[auto_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-6 border-b border-slate-200 bg-slate-50/80 px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 hidden lg:grid">
              <button onClick={toggleSelectAll} className="p-1 hover:text-slate-800 flex items-center justify-center shrink-0">
                {selectedIds.size === filtered.length && filtered.length > 0 ? <CheckSquare className="w-5 h-5 text-sky-600" /> : <Square className="w-5 h-5" />}
              </button>
              <div>Asset Identity</div>
              <div>Pricing Range</div>
              <div>Slot Saturation</div>
              <div className="w-[168px] text-right pr-2">Control</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-slate-100/80 flex flex-col">
              {filtered.map((screen) => {
                const isSelected = selectedIds.has(screen.id)
                const isExpanded = expandedId === screen.id
                const isBlocked = !screen.is_active
                const statusLabel = isBlocked ? 'Hard Blocked' : 'Accepting Ads'
                const statusTheme = isBlocked ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                const screenGalleryStack = sortGalleryItemsByOrder(getGalleryMediaItems(screen), screen.gallery_order).filter((item) => item.id !== screen.image_url)

                return (
                  <div key={screen.id} className={`group transition-colors ${isSelected ? 'bg-sky-50/40' : 'hover:bg-slate-50/50'}`}>
                    
                    {/* Main Row */}
                    <div className="flex flex-col lg:grid lg:grid-cols-[auto_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center gap-4 lg:gap-6 px-5 lg:px-6 py-4 lg:py-5">
                      <div className="flex items-center justify-between lg:justify-start">
                        <button onClick={() => toggleSelectOne(screen.id)} className="p-1 shrink-0 text-slate-400 hover:text-sky-600 transition">
                          {isSelected ? <CheckSquare className="w-5 h-5 text-sky-600" /> : <Square className="w-5 h-5" />}
                        </button>
                        <span className="lg:hidden text-xs font-bold text-slate-400 uppercase tracking-widest px-2 py-1 bg-slate-100 rounded-md">ID: {screen.id}</span>
                      </div>

                      <div className="min-w-0 flex items-center gap-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : screen.id)}>
                        <div className="h-14 w-20 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                          {screen.image_url ? (
                            <img src={screen.image_url} alt={screen.name} className="h-full w-full object-cover" />
                          ) : (
                            <FileImage className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 truncate">{screen.name}</p>
                            <span className={`hidden lg:inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${statusTheme}`}>
                              {statusLabel}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-500 truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {screen.area} {screen.footfall ? `• ~${screen.footfall}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="lg:block flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : screen.id)}>
                        <p className="lg:hidden text-[10px] font-bold uppercase tracking-widest text-slate-400">Pricing Base</p>
                        <div className="flex flex-col gap-0.5 lg:items-start text-right lg:text-left">
                          <p className="text-sm font-black text-slate-800 tracking-tight">₹{Number(screen.base_price || 0).toLocaleString()}<span className="text-xs font-medium text-slate-400 capitalize">/{screen.price_unit || 'day'}</span></p>
                        </div>
                      </div>

                      <div className="lg:block flex flex-col gap-2 pt-2 lg:pt-0 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : screen.id)}>
                         <div className="flex items-center justify-between text-[11px] lg:text-xs">
                           <span className="font-bold text-slate-700">Total Capacity</span>
                           <span className="font-bold text-slate-500">{screen.total_slots} Slots</span>
                         </div>
                      </div>

                      <div className="lg:w-[168px] flex items-center justify-end gap-2 mt-4 lg:mt-0">
                        <button onClick={() => openEdit(screen)} className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:text-indigo-600 hover:bg-slate-200 transition" title="Edit Master Detail">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                           onClick={() => toggleAvailability(screen)}
                           disabled={actionLoadingId === screen.id}
                           className={`p-2.5 rounded-xl transition disabled:opacity-50 ${isBlocked ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}
                           title={isBlocked ? "Unblock location" : "Block location"}
                        >
                          {actionLoadingId === screen.id ? <Loader2 className="w-4 h-4 animate-spin" /> : isBlocked ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => deleteScreen(screen)}
                          disabled={actionLoadingId === screen.id}
                          className="p-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition disabled:opacity-50"
                          title="Delete permanently"
                        >
                          {actionLoadingId === screen.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Drilldown */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden bg-slate-50/80 border-t border-slate-100"
                        >
                          <div className="px-6 py-8 lg:pl-16 grid grid-cols-1 xl:grid-cols-[1fr_minmax(0,1.5fr)] gap-8">
                             {/* Left: Complete Pricing & Meta */}
                             <div className="space-y-6">
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Client Pricing Tier Setup</p>
                                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                      <div className="rounded-xl border border-slate-200/60 bg-white px-4 py-3 shadow-sm">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Base Unit Rate</p>
                                        <p className="mt-1 text-base font-black text-slate-900 tracking-tight">₹{Number(screen.base_price || 0).toLocaleString()} <span className="text-xs font-medium text-slate-500 capitalize">/ {screen.price_unit}</span></p>
                                      </div>
                                  </div>
                                </div>
                                {screen.description && (
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Display Profile Notes</p>
                                    <p className="text-sm font-medium leading-relaxed text-slate-700">{screen.description}</p>
                                  </div>
                                )}
                                {screenGalleryStack.length > 0 && (
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Gallery Stack</p>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      {screenGalleryStack.map((item) => (
                                        <div key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                          <div className="relative h-32 bg-slate-100">
                                            {item.type === 'video' ? (
                                              <>
                                                {item.poster ? (
                                                  <img src={item.poster} alt={item.label} className="h-full w-full object-cover" />
                                                ) : (
                                                  <div className="flex h-full w-full items-center justify-center bg-slate-950">
                                                    <Video className="h-6 w-6 text-white/80" />
                                                  </div>
                                                )}
                                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
                                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm">
                                                    <Video className="h-4 w-4" />
                                                  </div>
                                                </div>
                                              </>
                                            ) : (
                                              <img src={item.url} alt={item.label} className="h-full w-full object-cover" />
                                            )}
                                          </div>
                                          <div className="border-t border-slate-200 px-3 py-2.5">
                                            <p className="text-xs font-bold text-slate-900">{item.label}</p>
                                            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-400">{item.type}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                             </div>

                             {/* Right: Geographical Data / Map preview */}
                             <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm h-full min-h-[300px] flex flex-col">
                               <p className="text-[10px] font-bold uppercase tracking-widest text-sky-500 mb-3 ml-1">Geospatial Marker</p>
                               <div className="flex-1 rounded-2xl overflow-hidden bg-slate-100 relative">
                                 {screen.latitude && screen.longitude ? (
                                    <StaticMap position={{ lat: screen.latitude, lng: screen.longitude }} />
                                 ) : (
                                    <div className="absolute inset-0 flex items-center justify-center flex-col text-slate-400 gap-2">
                                       <MapPin className="w-8 h-8 opacity-50" />
                                       <p className="text-xs font-bold uppercase tracking-widest">No Coordinates Set</p>
                                    </div>
                                 )}
                               </div>
                               {screen.latitude ? (
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-4 text-center">Lat: {screen.latitude} | Lng: {screen.longitude}</p>
                               ) : null}
                             </div>
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

      {/* Editor Modal for Create/Update */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[32px] bg-white shadow-2xl ring-1 ring-slate-200"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/90 backdrop-blur-xl px-8 py-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">{editId ? 'Edit Asset Profile' : 'Register New Asset'}</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">Configure deployment details and pricing tiers.</p>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full bg-slate-100 p-2.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-8 py-8 space-y-8">
              {/* Asset Identity Container */}
              <div className="space-y-5">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Asset Identity</h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">Display Name</label>
                    <input type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 transition outline-none" value={form.name} onChange={(e) => update('name', e.target.value)} required placeholder="Downtown Prime Board" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">Area Region</label>
                    <input type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 transition outline-none" value={form.area} onChange={(e) => update('area', e.target.value)} required placeholder="Times Square" />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">Extended Profile Biography</label>
                  <textarea className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-relaxed text-slate-900 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 transition outline-none resize-y" rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} />
                </div>
              </div>

              {/* Specs & Map Container */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 border-t border-slate-100 pt-8">
                <div className="space-y-5">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Inventory Physics</h3>
                  
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                       Total Operable Slots
                    </label>
                    <input type="number" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:border-sky-500 focus:bg-white outline-none" min={1} value={form.total_slots} onChange={(e) => update('total_slots', e.target.value)} />
                  </div>

                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                      <Users className="w-4 h-4 text-sky-500" /> Aggregate Footfall
                    </label>
                    <input type="text" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 focus:border-sky-500 focus:bg-white outline-none" placeholder="100,000 passes/mo" value={form.footfall} onChange={(e) => update('footfall', e.target.value)} />
                  </div>
                </div>

                <div className="space-y-5">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex justify-between">Geolocation <span className="text-sky-500 font-bold">{form.latitude && `${form.latitude.toString().slice(0, 6)}°`}</span></h3>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
                    {/* Map toolbar */}
                    <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
                      <button type="button" onClick={handleAutoLocate} disabled={locating} className="inline-flex items-center gap-1.5 font-bold text-sky-600 hover:text-sky-700 transition px-2 py-1 bg-sky-50 rounded-lg shrink-0 disabled:opacity-50">
                        {locating ? <Loader2 className="h-3 w-3 animate-spin"/> : <MapPin className="h-3 w-3" />} Smart Compute
                      </button>
                      <span className="font-semibold px-2 truncate text-slate-400">Click map or drag pin to set location</span>
                    </div>

                    {/* Map */}
                    <div className="h-56 w-full overflow-hidden rounded-xl bg-slate-200/50 ring-1 ring-inset ring-slate-200">
                      <MapContainer key={`${mapCenter.lat}-${mapCenter.lng}`} center={[mapCenter.lat, mapCenter.lng]} zoom={13} style={{ width: '100%', height: '100%' }} scrollWheelZoom>
                        <TileLayer
                          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                        />
                        <MapPicker position={mapPosition} onChange={(ll) => { update('latitude', ll.lat.toFixed(6)); update('longitude', ll.lng.toFixed(6)) }} />
                      </MapContainer>
                    </div>

                    {/* Manual coordinate inputs */}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Latitude</label>
                        <input
                          type="number"
                          step="0.000001"
                          placeholder="e.g. 12.971599"
                          value={form.latitude || ''}
                          onChange={e => update('latitude', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Longitude</label>
                        <input
                          type="number"
                          step="0.000001"
                          placeholder="e.g. 77.594566"
                          value={form.longitude || ''}
                          onChange={e => update('longitude', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

               {/* Pricing */}
              <div className="border-t border-slate-100 pt-8 space-y-5">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Yield Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="mb-2 block text-xs font-bold text-slate-500 uppercase tracking-wider">Base Rate Amount</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                        <input type="number" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-8 pr-3 text-sm font-black tracking-tight text-slate-900 focus:border-sky-500 focus:bg-white outline-none" value={form.base_price} onChange={(e) => update('base_price', e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold text-slate-500 uppercase tracking-wider">Rate Unit</label>
                      <div className="relative">
                        <select className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-10 text-sm font-black tracking-tight text-slate-900 focus:border-sky-500 focus:bg-white outline-none appearance-none" value={form.price_unit} onChange={(e) => update('price_unit', e.target.value)}>
                            <option value="hour">Per Hour</option>
                            <option value="day">Per Day</option>
                            <option value="month">Per Month</option>
                        </select>
                      </div>
                    </div>
                </div>
              </div>

               {/* Media */}
              <div className="border-t border-slate-100 pt-8 pb-4 space-y-5">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Media Library</h3>
                <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr]">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">Primary Hero Shot</label>
                    <label className="flex h-14 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-bold text-slate-500 transition hover:border-sky-500 hover:bg-sky-50 hover:text-sky-700 shadow-sm relative overflow-hidden">
                      {form.image_url ? (
                        <div className="w-full h-full flex items-center px-4 justify-between bg-white">
                          <span className="truncate max-w-[200px] text-xs text-sky-700">Thumbnail Uploaded</span>
                          <span className="text-xs bg-slate-100 px-2 py-1 rounded">Replace</span>
                        </div>
                      ) : (
                        'Select Jpeg/Png'
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={saving} />
                    </label>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Gallery Stack <span className="ml-2 text-slate-400 font-medium">{galleryStackItems.length} item{galleryStackItems.length !== 1 ? 's' : ''}</span>
                    </label>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                      {galleryStackItems.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {galleryStackItems.map((item) => {
                            const imageIndex = (form.additional_images || []).indexOf(item.url)
                            return (
                              <div key={item.id} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="relative h-24 bg-slate-100">
                                  {item.type === 'video' ? (
                                    <>
                                      {item.poster ? (
                                        <img src={item.poster} alt={item.label} className="h-full w-full object-cover" />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-slate-950">
                                          <Video className="h-6 w-6 text-white/80" />
                                        </div>
                                      )}
                                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm">
                                          <Video className="h-4 w-4" />
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <img src={item.url} alt={item.label} className="h-full w-full object-cover" />
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => item.type === 'video' ? removePromoVideo() : removeAdditionalImage(imageIndex)}
                                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/70 text-white opacity-0 transition group-hover:opacity-100"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <div className="px-3 py-2.5">
                                  <p className="truncate text-xs font-bold text-slate-900">{item.label}</p>
                                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-400">{item.type === 'video' ? 'Video' : 'Image'}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm font-medium text-slate-500">
                          Add video or extra images here. They’ll all join the same client gallery.
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-3">
                        {!form.promo_video_url && (
                          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-sky-300 hover:text-sky-700">
                            <Video className="h-4 w-4" />
                            Add Video
                            <input type="file" className="hidden" accept="video/*" onChange={handleVideoUpload} disabled={saving} />
                          </label>
                        )}
                        {(form.additional_images || []).length < 3 && (
                          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-sky-300 hover:text-sky-700">
                            <Plus className="h-4 w-4" />
                            Add Image
                            <input type="file" className="hidden" accept="image/*" onChange={handleAdditionalImageUpload} disabled={saving} />
                          </label>
                        )}
                        <div className="inline-flex items-center rounded-xl bg-white px-3 py-2 text-[11px] font-semibold text-slate-400">
                          Max 1 video and 3 extra images
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-slate-500">
                        Video and secondary images are managed together here and follow the gallery order below.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Gallery Sequence</h4>
                      <p className="mt-1 text-xs text-slate-500">This order controls how media appears on the client location detail gallery.</p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 shadow-sm">
                      <GripHorizontal className="h-3.5 w-3.5" />
                      {orderedGalleryItems.length} item{orderedGalleryItems.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {orderedGalleryItems.length > 0 ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {orderedGalleryItems.map((item, index) => (
                        <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                          <div className="relative h-28 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            {item.type === 'video' ? (
                              <>
                                {item.poster ? (
                                  <img src={item.poster} alt={item.label} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-slate-950">
                                    <Video className="h-6 w-6 text-white/80" />
                                  </div>
                                )}
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm">
                                    <Video className="h-4 w-4" />
                                  </div>
                                </div>
                              </>
                            ) : (
                              <img src={item.url} alt={item.label} className="h-full w-full object-cover" />
                            )}
                          </div>

                          <div className="mt-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900">{item.label}</p>
                              <p className="mt-1 text-[11px] text-slate-500">{item.helper}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                              #{index + 1}
                            </span>
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => moveGalleryItem(item.id, -1)}
                              disabled={index === 0 || saving}
                              className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Earlier
                            </button>
                            <button
                              type="button"
                              onClick={() => moveGalleryItem(item.id, 1)}
                              disabled={index === orderedGalleryItems.length - 1 || saving}
                              className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Later
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm font-medium text-slate-500">
                      Upload a hero image, video, or additional gallery image to arrange the client gallery order.
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Dock */}
              <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 -mx-8 -mb-8 mt-8 px-8 py-6 flex items-center gap-4 justify-end rounded-b-[32px]">
                 <button type="button" onClick={() => setShowForm(false)} className="rounded-xl px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 transition">Cancel Revision</button>
                 <button type="submit" disabled={saving} className="btn-primary py-3 px-8 text-sm group flex items-center shadow-lg shadow-sky-200">
                   {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />}
                   {editId ? 'Commit Changes' : 'Initialize Asset'}
                 </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
