import { NextResponse } from 'next/server'

export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy (CSP)
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval and unsafe-inline
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Tailwind requires unsafe-inline, Google Fonts for Material Symbols
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://api.frankfurter.app",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  response.headers.set('Content-Security-Policy', cspDirectives)

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Enable XSS protection in older browsers
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions policy (disable unnecessary features)
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  )

  // HSTS (HTTP Strict Transport Security) - only in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    )
  }

  // Remove server header
  response.headers.delete('X-Powered-By')

  return response
}
