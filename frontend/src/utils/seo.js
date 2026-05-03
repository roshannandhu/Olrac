import { useEffect } from 'react'

export const SITE_URL = 'https://olracads.com'
export const SITE_NAME = 'OLRAC Advertise'
export const DEFAULT_OG_IMAGE = `${SITE_URL}/preview.jpg`

const DEFAULT_META = {
  title: 'OLRAC Advertise - Digital Screen Advertising Network',
  description: 'Book TV screen advertising across India with OLRAC Advertise. Discover digital ad locations, get instant quotations, and manage campaigns remotely.',
  path: '/',
  image: DEFAULT_OG_IMAGE,
}

export const PAGE_SEO = {
  '/': DEFAULT_META,
  '/about': {
    title: 'About OLRAC Advertise - TV Screen Advertising Network',
    description: 'Learn how OLRAC Advertise helps brands book affordable TV screen advertising in high-attention locations across India.',
    path: '/about',
    image: DEFAULT_OG_IMAGE,
  },
  '/locations': {
    title: 'Advertising Screen Locations in India - OLRAC Advertise',
    description: 'Explore OLRAC Advertise screen locations, compare digital advertising spaces, and find high-traffic TV screens for your campaign.',
    path: '/locations',
    image: DEFAULT_OG_IMAGE,
  },
  '/booking': {
    title: 'Book Digital Advertising Screens - OLRAC Advertise',
    description: 'Select TV screen locations, configure your campaign, and get an instant digital advertising quotation from OLRAC Advertise.',
    path: '/booking',
    image: DEFAULT_OG_IMAGE,
  },
}

function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    document.head.appendChild(element)
  }

  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value)
  })
}

function upsertCanonical(url) {
  let element = document.head.querySelector('link[rel="canonical"]')
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    document.head.appendChild(element)
  }
  element.setAttribute('href', url)
}

export function applySeo(meta = DEFAULT_META) {
  const next = { ...DEFAULT_META, ...meta }
  const canonical = absoluteUrl(next.path)
  const image = next.image || DEFAULT_OG_IMAGE

  document.title = next.title
  upsertMeta('meta[name="description"]', { name: 'description', content: next.description })
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: next.title })
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: next.description })
  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' })
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical })
  upsertMeta('meta[property="og:image"]', { property: 'og:image', content: image })
  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' })
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: next.title })
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: next.description })
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: image })
  upsertCanonical(canonical)
}

export function getSeoForPath(pathname) {
  const cleanPath = pathname === '/' ? '/' : pathname.replace(/\/$/, '')
  if (cleanPath.startsWith('/location/')) return null
  return PAGE_SEO[cleanPath] || DEFAULT_META
}

export function useSeo(meta) {
  useEffect(() => {
    applySeo(meta)
  }, [meta])
}
