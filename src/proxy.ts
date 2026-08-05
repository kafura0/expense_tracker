import { NextRequest } from 'next/server'
import { updateSession } from '@/shared/lib/supabase/middleware'
import {
  rateLimit,
  addRateLimitHeaders,
} from '@/shared/lib/rate-limit'
import {
  buildCsp,
  addSecurityHeaders,
} from '@/shared/lib/security-headers'

/**
 * Next.js 16 Proxy — runs on every matched request before rendering.
 *
 * Responsibilities:
 * 1. Rate limiting (IP-based, pluggable store).
 * 2. Per-request CSP nonce generation (fresh on every request — a static or
 *    env-derived value would be as weak as 'unsafe-inline').
 * 3. Session refresh + auth/org route enforcement via `updateSession`.
 * 4. Security headers on every response.
 *
 * The nonce is injected into the request headers (`x-nonce` + a
 * `Content-Security-Policy` carrying it) so Next.js attaches it to its own
 * scripts during dynamic SSR. Statically prerendered pages carry inline
 * scripts that have no request-time nonce; their SHA-256 hashes (generated at
 * build time by `scripts/generate-csp-hashes.mjs`) are included in the policy
 * instead. The root layout therefore never reads `headers()` directly.
 */
export async function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development'

  // Apply rate limiting first — a throttled request never touches the app.
  const rateLimitResponse = await rateLimit(request)
  if (rateLimitResponse) {
    return addSecurityHeaders(rateLimitResponse)
  }

  // Generate a cryptographic nonce for this request.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  // Forward the nonce + CSP to the renderer so Next.js can tag its own inline
  // scripts. Cloning the request preserves cookies for the session client.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', buildCsp(nonce, isDev))

  const nextRequest = new NextRequest(request, { headers: requestHeaders })

  // Session management and auth checks.
  const response = await updateSession(nextRequest)

  // Add rate limit headers and security headers.
  await addRateLimitHeaders(response, nextRequest)
  addSecurityHeaders(response, { nonce })

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
