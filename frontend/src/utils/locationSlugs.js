export function slugifyLocation(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getLocationSlug(screen) {
  const base = slugifyLocation([screen?.name, screen?.area].filter(Boolean).join(' '))
  const id = Number(screen?.id)
  return `${base || 'location'}${Number.isInteger(id) && id > 0 ? `-${id}` : ''}`
}

export function getLocationPath(screen) {
  return `/location/${getLocationSlug(screen)}`
}

export function getScreenIdFromLocationParam(value) {
  const param = String(value || '').trim()
  if (/^\d+$/.test(param)) return Number(param)

  const match = param.match(/-(\d+)$/)
  return match ? Number(match[1]) : null
}
