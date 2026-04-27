const FALLBACK_DURATION = { label: 'Custom', days: 1, hours: 24 }

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeBookingDurations(durations = []) {
  return [...(Array.isArray(durations) ? durations : [])]
    .map((duration) => {
      const days = Math.max(0, toNumber(duration?.days))
      const hours = Math.max(0, toNumber(duration?.hours))

      return {
        ...duration,
        days,
        hours,
        total_hours: (days * 24) + hours,
      }
    })
    .sort((a, b) => {
      if (a.total_hours !== b.total_hours) return a.total_hours - b.total_hours
      return String(a.label || '').localeCompare(String(b.label || ''))
    })
}

export function resolveDefaultBookingDurationId(config = {}) {
  const durations = normalizeBookingDurations(config.booking_durations || [])
  const configuredId = String(config.booking_default_duration_id || '')

  if (configuredId && durations.some((duration) => duration.id === configuredId)) {
    return configuredId
  }

  return durations[0]?.id || ''
}

export function getSelectedBookingDuration(config = {}, selectedId = '') {
  const durations = normalizeBookingDurations(config.booking_durations || [])
  const defaultId = resolveDefaultBookingDurationId(config)

  return (
    durations.find((duration) => duration.id === selectedId) ||
    durations.find((duration) => duration.id === defaultId) ||
    durations[0] ||
    FALLBACK_DURATION
  )
}
