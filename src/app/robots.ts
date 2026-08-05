import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/shared/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/expenses',
        '/reports',
        '/categories',
        '/settings',
        '/admin',
        '/api/',
        '/onboarding',
        '/invite',
        '/verify-otp',
        '/reset-password',
        '/update-password',
        '/no-access',
        '/suspended',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
