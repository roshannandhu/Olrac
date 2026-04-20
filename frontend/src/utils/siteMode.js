export const SITE_MODES = {
  client: 'client',
  admin: 'admin',
}

const envSiteMode = import.meta.env.VITE_SITE_MODE || import.meta.env.VITE_SITE || ''
const host = typeof window !== 'undefined' ? window.location.hostname : ''

export const siteMode = envSiteMode || (host.startsWith('admin.') ? SITE_MODES.admin : SITE_MODES.client)
export const isAdminSite = siteMode === SITE_MODES.admin

export const clientSiteUrl = import.meta.env.VITE_CLIENT_SITE_URL || 'https://www.olrac.com'
export const adminSiteUrl = import.meta.env.VITE_ADMIN_SITE_URL || 'https://admin.olrac.com'

export const adminPath = (path = '') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return isAdminSite ? cleanPath : `/admin${cleanPath === '/' ? '' : cleanPath}`
}

export const getPostLoginPath = (role) => {
  if (role === 'admin') {
    return isAdminSite ? '/' : adminSiteUrl
  }

  return isAdminSite ? clientSiteUrl : '/locations'
}
