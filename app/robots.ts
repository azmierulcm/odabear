import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.odabear.com'

// Served at /robots.txt. Public pages are crawlable; private surfaces
// (dashboards, auth flows, customer order/booking token links) are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/admin',
        '/api/',
        '/order/',
        '/booking/',
        '/login',
        '/register',
        '/reset-password',
        '/welcome',
        '/auth/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
