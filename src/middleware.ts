import { type NextRequest } from 'next/server'
import { updateSession } from '@/shared/lib/supabase/middleware'
import { rateLimit, addRateLimitHeaders } from '@/shared/lib/rate-limit'
import { addSecurityHeaders } from '@/shared/lib/security-headers'

export async function middleware(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = rateLimit(request)
  if (rateLimitResponse) {
    return addSecurityHeaders(rateLimitResponse)
  }

  // Apply session management and auth checks
  const response = await updateSession(request)

  // Add rate limit headers and security headers
  addRateLimitHeaders(response, request)
  addSecurityHeaders(response)

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