import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Ban,
  CheckCircle2,
  Loader2,
  MapPin,
  Monitor,
  Pencil,
  Plus,
  Save,
  Trash2,
  Unlock,
  User,
  Users,
  X,
} from 'lucide-react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import api from '../api/axios'
import { SCREEN_PRICING_TIERS } from '../utils/screenPricing'

const baseMarker = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function MapPicker({ position, onChange }) {
  useMapEvents({
    click(event) {
      onChange(event.latlng)
    },
  })

  if (!position) return null

  return (
    <Marker
      position={[position.lat, position.lng]}
      icon={baseMarker}
      draggable
      eventHandlers={{
        dragend(event) {
          const latlng = event.target.getLatLng()
          onChange(latlng)
        },
      }}
    />
  )
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

  const emptyForm = {
    name: '',
    area: '',
    description: '',
    price_daily: '',
    price_weekly: '',
    price_monthly: '',
    price_yearly: '',
    total_slots: 10,
    latitude: '',
    longitude: '',
    footfall: '',
    image_url: '',
    additional_images: [],
  }

  const [form, setForm] = useState(emptyForm)
  const mapCenter = useMemo(() => {
    const lat = Number(form.latitude)
    const lng = Number(form.longitude)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng }
    }
    return { lat: 12.9716, lng: 77.5946 }
  }, [form.latitude, form.longitude])
  const mapPosition = useMemo(() => {
    const lat = Number(form.latitude)
    const lng = Number(form.longitude)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng }
    }
    return null
  }, [form.latitude, form.longitude])

  const fetchScreens = () => {
    setLoading(true)
    api.get('/admin/screens')
      .then((res) => {
        setScreens(res.data)
        setError('')
      })
      .catch((err) => {
        const message = err.response?.data?.detail || 'Failed to load screens from the database'
        setError(message)
        toast.error(message)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchScreens()
  }, [])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const screenStats = useMemo(() => ({
    total: screens.length,
    active: screens.filter((screen) => screen.is_active && screen.available_slots > 0).length,
    full: screens.filter((screen) => screen.available_slots <= 0).length,
    blocked: screens.filter((screen) => !screen.is_active && screen.available_slots > 0).length,
  }), [screens])

  const openCreate = () => {
    setForm(emptyForm)
    setEditId(null)
    setShowForm(true)
  }

  const openEdit = (screen) => {
    setForm({
      name: screen.name || '',
      area: screen.area || '',
      description: screen.description || '',
      price_daily: screen.price_daily || '',
      price_weekly: screen.price_weekly || '',
      price_monthly: screen.price_monthly || '',
      price_yearly: screen.price_yearly || '',
      total_slots: screen.total_slots || 10,
      latitude: screen.latitude ?? '',
      longitude: screen.longitude ?? '',
      footfall: screen.footfall || '',
      image_url: screen.image_url || '',
      additional_images: screen.additional_images || [],
    })
    setEditId(screen.id)
    setShowForm(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)

    const payload = {
      ...form,
      price_daily: Number(form.price_daily) || 0,
      price_weekly: Number(form.price_weekly) || 0,
      price_monthly: Number(form.price_monthly) || 0,
      price_yearly: Number(form.price_yearly) || 0,
      total_slots: Number(form.total_slots) || 10,
      latitude: form.latitude === '' ? null : Number(form.latitude),
      longitude: form.longitude === '' ? null : Number(form.longitude),
      footfall: form.footfall || null,
      image_url: form.image_url || null,
      additional_images: form.additional_images || [],
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
    } finally {
      setSaving(false)
    }
  }

  const handleAutoLocate = async () => {
    const query = [form.name, form.area].filter(Boolean).join(', ')
    if (!query) {
      toast.error('Add a screen name or area first')
      return
    }

    setLocating(true)
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
      const data = await response.json()
      if (!data?.length) {
        toast.error('No coordinates found for that location')
        return
      }
      update('latitude', data[0].lat)
      update('longitude', data[0].lon)
      toast.success('Coordinates added')
    } catch {
      toast.error('Auto locate failed')
    } finally {
      setLocating(false)
    }
  }

  const uploadImage = async (file, onSuccess) => {
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      setSaving(true)
      const res = await api.post('/admin/screens/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onSuccess(res.data.url)
    } catch {
      toast.error('Image upload failed')
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0]
    await uploadImage(file, (url) => {
      update('image_url', url)
      toast.success('Cover image uploaded. Save screen to persist it.')
    })
  }

  const handleAdditionalImageUpload = async (event) => {
    const file = event.target.files?.[0]
    if ((form.additional_images || []).length >= 3) {
      toast.error('Maximum 3 additional images allowed')
      return
    }

    await uploadImage(file, (url) => {
      update('additional_images', [...(form.additional_images || []), url])
      toast.success('Additional image uploaded')
    })
  }

  const removeAdditionalImage = (index) => {
    update('additional_images', (form.additional_images || []).filter((_, currentIndex) => currentIndex !== index))
  }

  const deactivateScreen = async (id) => {
    if (!confirm('Block this location?')) return
    try {
      await api.delete(`/admin/screens/${id}`)
      toast.success('Location blocked')
      fetchScreens()
    } catch {
      toast.error('Action failed')
    }
  }

  const toggleAvailability = async (screen) => {
    if (screen.available_slots <= 0) {
      toast.error('This location is auto-blocked because all slots are booked')
      return
    }

    setActionLoadingId(screen.id)
    try {
      await api.put(`/admin/screens/${screen.id}`, { is_active: !screen.is_active })
      toast.success(screen.is_active ? 'Location blocked manually' : 'Location unblocked')
      fetchScreens()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Availability update failed')
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <Monitor className="h-3.5 w-3.5" />
              Inventory Control
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Manage Screens</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Maintain location availability, pricing, media assets, and manual block control from one workspace.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Total', screenStats.total],
              ['Live', screenStats.active],
              ['Full', screenStats.full],
              ['Blocked', screenStats.blocked],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-black"
          >
            <Plus className="h-4 w-4" />
            Add Screen
          </button>
        </div>
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm">
          <div className="mx-4 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{editId ? 'Edit Screen' : 'Create Screen'}</h2>
                <p className="mt-1 text-sm text-slate-500">Update the location profile, pricing plans, and media gallery.</p>
              </div>
              <button onClick={() => setShowForm(false)} className="rounded-2xl p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="label">Screen Name *</label>
                  <input type="text" className="input-field" value={form.name} onChange={(e) => update('name', e.target.value)} required />
                </div>
                <div>
                  <label className="label">Area / Location *</label>
                  <input type="text" className="input-field" value={form.area} onChange={(e) => update('area', e.target.value)} required />
                </div>
              </div>


              <div>
                <label className="label">Description</label>
                <textarea className="input-field resize-y" rows={4} value={form.description} onChange={(e) => update('description', e.target.value)} />
              </div>

              <div>
                <label className="label font-bold text-primary-600 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary-500" />
                  Estimated Footfall (Optional)
                </label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. 5,000 / day or 1.2M monthly" 
                  value={form.footfall} 
                  onChange={(e) => update('footfall', e.target.value)} 
                />
                <p className="text-[11px] text-slate-400 mt-1">This validates prices for clients by showing audience scale.</p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="label">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    className="input-field"
                    value={form.latitude}
                    onChange={(e) => update('latitude', e.target.value)}
                    placeholder="12.971599"
                  />
                </div>
                <div>
                  <label className="label">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    className="input-field"
                    value={form.longitude}
                    onChange={(e) => update('longitude', e.target.value)}
                    placeholder="77.594566"
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={handleAutoLocate}
                    disabled={locating}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                    Auto-fill from area
                  </button>
                </div>
                <div className="md:col-span-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
                      <span className="uppercase tracking-[0.2em]">Pick On Map</span>
                      <span>Click map or drag marker</span>
                    </div>
                    <div className="h-64 w-full overflow-hidden rounded-2xl bg-slate-200">
                      <MapContainer
                        key={`${mapCenter.lat}-${mapCenter.lng}`}
                        center={[mapCenter.lat, mapCenter.lng]}
                        zoom={13}
                        style={{ width: '100%', height: '100%' }}
                        scrollWheelZoom
                      >
                        <TileLayer
                          attribution='&copy; OpenStreetMap contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapPicker
                          position={mapPosition}
                          onChange={(latlng) => {
                            update('latitude', latlng.lat.toFixed(6))
                            update('longitude', latlng.lng.toFixed(6))
                          }}
                        />
                      </MapContainer>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {SCREEN_PRICING_TIERS.map((tier) => (
                  <div key={tier.key}>
                    <label className="label">{tier.adminLabel} (Rs)</label>
                    <input
                      type="number"
                      className="input-field"
                      value={form[`price_${tier.key}`]}
                      onChange={(e) => update(`price_${tier.key}`, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="label">Total Slots</label>
                  <input type="number" className="input-field" min={1} value={form.total_slots} onChange={(e) => update('total_slots', e.target.value)} />
                </div>
                <div>
                  <label className="label">Cover Image</label>
                  <label className="flex h-12 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-slate-500 transition hover:border-slate-500 hover:bg-white hover:text-slate-700">
                    {form.image_url ? 'Change Cover Image' : 'Upload Cover Image'}
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={saving} />
                  </label>
                </div>
              </div>

              <div>
                <label className="label flex justify-between">
                  <span>Additional Images</span>
                  <span className="text-[11px] text-slate-400">{(form.additional_images || []).length}/3 uploaded</span>
                </label>
                <div className="mt-2 flex flex-wrap gap-3">
                  {(form.additional_images || []).map((img, index) => (
                    <div key={img} className="relative h-20 w-20 overflow-hidden rounded-2xl border border-slate-200">
                      <img src={img} alt={`Additional ${index + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeAdditionalImage(index)}
                        className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-rose-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {(form.additional_images || []).length < 3 ? (
                    <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-slate-500 hover:bg-white hover:text-slate-700">
                      <Plus className="h-5 w-5" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleAdditionalImageUpload} disabled={saving} />
                    </label>
                  ) : null}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {editId ? 'Update Screen' : 'Create Screen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-[380px] rounded-[28px] border border-slate-200 bg-slate-50 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-6 rounded-[28px] border border-rose-100 bg-rose-50 p-12 text-center">
          <Monitor className="mx-auto mb-4 h-14 w-14 text-rose-200" />
          <h3 className="text-lg font-semibold text-rose-900">Could not load screens</h3>
          <p className="mt-2 text-sm text-rose-700">{error}</p>
          <button onClick={fetchScreens} className="btn-primary mt-5 text-sm">Retry</button>
        </div>
      ) : screens.length === 0 ? (
        <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-12 text-center shadow-sm">
          <Monitor className="mx-auto mb-4 h-14 w-14 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-700">No screens yet</h3>
          <p className="mt-2 text-sm text-slate-500">Create your first advertising location.</p>
          <button onClick={openCreate} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-black">
            <Plus className="h-4 w-4" />
            Add Screen
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {screens.map((screen) => {
            const isFull = screen.available_slots <= 0
            const isBlocked = !screen.is_active
            const progress = screen.total_slots > 0 ? (screen.booked_slots / screen.total_slots) * 100 : 0
            const statusLabel = isFull ? 'Auto-blocked: full' : isBlocked ? 'Blocked manually' : 'Live'
            const statusClass = isFull
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : isBlocked
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'

            return (
              <div key={screen.id} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                <div className="relative h-52 overflow-hidden bg-slate-100">
                  {screen.image_url ? (
                    <img src={screen.image_url} alt={screen.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      <Monitor className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute left-4 top-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>{statusLabel}</span>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-slate-900">{screen.name}</h3>
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                        <MapPin className="h-4 w-4" />
                        {screen.area}
                      </p>
                      {screen.footfall && (
                         <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                            <Users className="h-3.5 w-3.5" />
                            {screen.footfall}
                         </div>
                      )}
                      {screen.description ? (
                        <p className="mt-2 line-clamp-2 max-w-md text-sm leading-6 text-slate-500">
                          {screen.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(screen)} className="rounded-2xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => deactivateScreen(screen.id)} className="rounded-2xl border border-rose-200 p-2 text-rose-500 hover:bg-rose-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Pricing Plans</p>
                      <p className="text-xs text-slate-500">Compact billing grid</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {SCREEN_PRICING_TIERS.map((tier) => (
                        <div key={tier.key} className="rounded-2xl bg-white px-3 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{tier.shortLabel}</p>
                          <p className="mt-2 text-sm font-bold text-slate-900">
                            Rs {Number(screen[`price_${tier.key}`] || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">Slot Progress</span>
                      <span className="text-slate-500">{screen.booked_slots}/{screen.total_slots} used</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${isFull ? 'bg-amber-500' : 'bg-slate-900'}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      onClick={() => toggleAvailability(screen)}
                      disabled={actionLoadingId === screen.id || isFull}
                      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        isBlocked
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-900 text-white hover:bg-black'
                      }`}
                    >
                      {actionLoadingId === screen.id ? <Loader2 className="h-4 w-4 animate-spin" /> : isBlocked ? <Unlock className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                      {isFull ? 'Auto-blocked' : isBlocked ? 'Unblock' : 'Block'}
                    </button>

                    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600">
                      {isFull ? <Ban className="h-4 w-4 text-amber-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      {isFull ? 'Full inventory' : `${screen.available_slots} slots available`}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
