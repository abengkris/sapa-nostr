import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/messages/', '/notifications/', '/bookmarks/'],
    },
    sitemap: 'https://tellit.id/sitemap.xml',
  }
}
