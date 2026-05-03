import { Helmet } from 'react-helmet-async'
import {
  SITE_NAME,
  getOrganizationJsonLd,
  getWebsiteJsonLd,
  resolveSeoMeta,
} from '../utils/seo'

export default function Seo({ meta, structuredData = [] }) {
  const resolved = resolveSeoMeta(meta)
  const jsonLd = [getOrganizationJsonLd(), getWebsiteJsonLd(), ...structuredData]

  return (
    <Helmet prioritizeSeoTags>
      <title>{resolved.title}</title>
      <meta name="description" content={resolved.description} />
      {resolved.keywords ? <meta name="keywords" content={resolved.keywords} /> : null}
      <meta name="author" content={SITE_NAME} />
      <meta name="robots" content={resolved.robots || 'index,follow,max-image-preview:large'} />
      <link rel="canonical" href={resolved.canonical} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={resolved.title} />
      <meta property="og:description" content={resolved.description} />
      <meta property="og:type" content={resolved.type || 'website'} />
      <meta property="og:url" content={resolved.canonical} />
      <meta property="og:image" content={resolved.image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolved.title} />
      <meta name="twitter:description" content={resolved.description} />
      <meta name="twitter:image" content={resolved.image} />

      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
    </Helmet>
  )
}
