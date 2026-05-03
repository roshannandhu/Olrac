import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getLocationPath } from '../src/utils/locationSlugs.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '../public')
const sitemapPath = resolve(publicDir, 'sitemap.xml')

const SITE_URL = 'https://olracads.com'
const SCREENS_API_URL = `${SITE_URL}/api/screens`

const routes = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/locations', changefreq: 'weekly', priority: '0.9' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
  { path: '/booking', changefreq: 'monthly', priority: '0.8' },
]

const today = new Date().toISOString().slice(0, 10)

async function getDynamicLocationRoutes() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4000)

  try {
    const response = await fetch(SCREENS_API_URL, { signal: controller.signal })
    if (!response.ok) throw new Error(`Screens API returned ${response.status}`)

    const screens = await response.json()
    if (!Array.isArray(screens)) return []

    return screens
      .filter((screen) => screen?.id)
      .map((screen) => ({
        path: getLocationPath(screen),
        changefreq: 'weekly',
        priority: '0.7',
      }))
  } catch (error) {
    console.warn(`Sitemap: skipped dynamic location URLs (${error.message}).`)
    return []
  } finally {
    clearTimeout(timeout)
  }
}

const allRoutes = [...routes, ...(await getDynamicLocationRoutes())]
const uniqueRoutes = [...new Map(allRoutes.map((route) => [route.path, route])).values()]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniqueRoutes.map((route) => `  <url>
    <loc>${SITE_URL}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`).join('\n')}
</urlset>
`

await mkdir(publicDir, { recursive: true })
await writeFile(sitemapPath, xml, 'utf8')
