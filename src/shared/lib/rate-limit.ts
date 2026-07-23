import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// In-memory store for rate limiting (production should use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limit configurations
const RATE_LIMITS = {
  // Auth endpoints: 5 requests per minute
  auth: {
    windowMs: 60 * 1000,
    maxRequests: 5,
  },
  // API endpoints: 60 requests per minute
  api: {
    windowMs: 60 * 1000,
    maxRequests: 60,
  },
  // General: 100 requests per minute
  general: {
    windowMs: 60 * 1000,
    maxRequests: 100,
  },
} as const

type RateLimitType = keyof typeof RATE_LIMITS

function getRateLimitKey(ip: string, type: RateLimitType): string {
  return `${type}:${ip}`
}

function checkRateLimit(
  key: string,
  config: { windowMs: number; maxRequests: number }
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    }
  }

  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    }
  }

  record.count++
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime,
  }
}

function getClientIP(request: NextRequest): string {
  // Check for forwarded IP first (for deployments behind proxies)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  // Check for real IP
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback to unknown (request.ip is not available in Next.js 16)
  return 'unknown'
}

function getRateLimitType(pathname: string): RateLimitType {
  if (pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/reset-password')) {
    return 'auth'
  }
  if (pathname.startsWith('/api/')) {
    return 'api'
  }
  return 'general'
}

export function rateLimit(request: NextRequest): NextResponse | null {
  const ip = getClientIP(request)
  const type = getRateLimitType(request.nextUrl.pathname)
  const config = RATE_LIMITS[type]
  const key = getRateLimitKey(ip, type)

  const { allowed, resetTime } = checkRateLimit(key, config)

  if (!allowed) {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)
    
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
        },
      }
    )
  }

  // Add rate limit headers to successful responses
  return null // Continue to next middleware/handler
}

export function addRateLimitHeaders(
  response: NextResponse,
  request: NextRequest
): NextResponse {
  const ip = getClientIP(request)
  const type = getRateLimitType(request.nextUrl.pathname)
  const config = RATE_LIMITS[type]
  const key = getRateLimitKey(ip, type)
  const record = rateLimitStore.get(key)

  if (record) {
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
    response.headers.set(
      'X-RateLimit-Remaining',
      Math.max(0, config.maxRequests - record.count).toString()
    )
    response.headers.set(
      'X-RateLimit-Reset',
      Math.ceil(record.resetTime / 1000).toString()
    )
  }

  return response
}

// Cleanup old entries periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}
