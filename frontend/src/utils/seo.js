export const SITE_URL = 'https://olracads.com'
export const SITE_NAME = 'OLRAC Advertise'
export const DEFAULT_OG_IMAGE = `${SITE_URL}/preview.jpg`

export const DEFAULT_META = {
  title: 'Digital Advertising Screens | OLRAC Advertise',
  description: 'Book TV screen advertising across India with OLRAC Advertise. Discover digital ad locations, get instant quotations, and manage campaigns remotely.',
  path: '/',
  image: DEFAULT_OG_IMAGE,
  keywords: 'advertising screens, digital ads India, billboard ads, TV screen advertising, OLRAC Advertise',
}

export const PAGE_SEO = {
  '/': DEFAULT_META,
  '/about': {
    title: 'About OLRAC Advertise | TV Screen Advertising Network',
    description: 'Learn how OLRAC Advertise helps brands book affordable TV screen advertising in high-attention locations across India.',
    path: '/about',
    image: DEFAULT_OG_IMAGE,
    keywords: 'about OLRAC Advertise, TV screen advertising network, affordable digital ads India',
  },
  '/locations': {
    title: 'Advertising Screens in Calicut, Kochi and India | OLRAC Advertise',
    description: 'Explore advertising screens in Calicut, Kochi, and other high-traffic Indian locations. Compare LED ads, TV screen slots, and digital ad spaces.',
    path: '/locations',
    image: DEFAULT_OG_IMAGE,
    keywords: 'Advertising Screens in Calicut, LED Ads in Kochi, digital ad locations India, TV screen advertising Kerala',
  },
  '/booking': {
    title: 'Get Advertising Quote | OLRAC Advertise',
    description: 'Select TV screen locations, configure your campaign, and get an instant digital advertising quotation from OLRAC Advertise.',
    path: '/booking',
    image: DEFAULT_OG_IMAGE,
    keywords: 'advertising quotation India, book digital advertising screens, TV ad screen quote',
  },
}

export function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export function resolveSeoMeta(meta = DEFAULT_META) {
  const next = { ...DEFAULT_META, ...meta }
  return {
    ...next,
    canonical: absoluteUrl(next.path),
    image: next.image || DEFAULT_OG_IMAGE,
  }
}

export function getOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.png`,
    image: DEFAULT_OG_IMAGE,
    description: DEFAULT_META.description,
    sameAs: [],
  }
}

export function getWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
  }
}
