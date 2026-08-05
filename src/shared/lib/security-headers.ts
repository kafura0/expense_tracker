import { NextResponse } from 'next/server'
import { CSP_SCRIPT_HASHES } from '@/shared/lib/csp-hashes.generated'

/**
 * Build a strict Content-Security-Policy header value that trusts scripts via
 * a per-request nonce AND build-time hashes.
 *
 * The nonce is generated per-request in the proxy (never from an env var) and
 * Next.js attaches it to its framework scripts automatically on dynamically
 * rendered pages.
 *
 * The `'sha256-...'` sources cover the inline bootstrap/RSC scripts that are
 * baked into STATICALLY prerendered HTML (see `csp-hashes.generated.ts`, built
 * by `scripts/generate-csp-hashes.mjs`). A prerendered page has no request and
 * therefore no nonce, so its inline scripts can only be trusted by hash. The
 * external chunk `<script src="/_next/static/...">` tags in that HTML are
 * trusted via `'self'`.
 *
 * `'strict-dynamic'` is deliberately NOT used: per the CSP spec it would
 * discard the `'self'` host source, so the chunk scripts of a prerendered page
 * (which carry no nonce) would be blocked and hydration would break. Without
 * it, dynamically injected scripts must still match `'self'` — stricter here.
 *
 * `'unsafe-eval'` is a development-only requirement of React's dev build and
 * is never shipped.
 *
 * `style-src 'unsafe-inline'` is kept deliberately: Tailwind and the chart
 * widgets set dynamic inline style attributes, and style injection is a much
 * lower XSS risk than script injection.
 */
export function buildCsp(nonce: string, isDev: boolean): string {
  const hashSources = CSP_SCRIPT_HASHES.map((hash) => `'sha256-${hash}'`).join(' ')
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ''}${hashSources ? ` ${hashSources}` : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://api.frankfurter.app",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')

  return directives
}

export function addSecurityHeaders(
  response: NextResponse,
  opts: { nonce?: string } = {}
): NextResponse {
  // Content Security Policy (CSP) — only when a per-request nonce exists.
  // Responses without a nonce (redirects, static) skip CSP rather than emit a
  // nonce-less policy that would break hydration.
  if (opts.nonce) {
    const isDev = process.env.NODE_ENV === 'development'
    response.headers.set('Content-Security-Policy', buildCsp(opts.nonce, isDev))
  }

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
