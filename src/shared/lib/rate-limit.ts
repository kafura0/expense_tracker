import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Redis } from '@upstash/redis'

// ─────────────────────────────────────────────────────────────────────────────
// Pluggable rate-limit store.
//
// Ledgerly uses a `RateLimitStore` so the enforcement layer does not care where
// counters live. The default is an in-process map, which is correct for single
// instances but is per-instance on horizontally scaled deployments. When
// `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are present, a shared
// Upstash Redis store is used instead (HTTP-based, no server to run).
// ─────────────────────────────────────────────────────────────────────────────

export interface RateLimitRecord {
  count: number
  resetTime: number
}

export interface RateLimitStore {
  get(key: string): Promise<RateLimitRecord | null> | RateLimitRecord | null
  set(key: string, record: RateLimitRecord): Promise<void> | void
  /** Best-effort cleanup of expired keys (memory stores). */
  cleanup?(): void
}

/** In-process store. Works everywhere; not shared between instances. */
export class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitRecord>()

  get(key: string): RateLimitRecord | null {
    return this.store.get(key) ?? null
  }

  set(key: string, record: RateLimitRecord): void {
    this.store.set(key, record)
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key)
      }
    }
  }
}

/** Distributed store backed by Upstash Redis REST (used in production). */
export class UpstashRedisRateLimitStore implements RateLimitStore {
  private redis: Redis

  constructor(url?: string, token?: string) {
    if (!url || !token) {
      throw new Error('UpstashRedisRateLimitStore requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN')
    }
    this.redis = new Redis({ url, token })
  }

  async get(key: string): Promise<RateLimitRecord | null> {
    return this.redis.get<RateLimitRecord>(key)
  }

  async set(key: string, record: RateLimitRecord): Promise<void> {
    // Expire the key shortly after the window closes so the store stays lean.
    const ttlSeconds = Math.max(1, Math.ceil((record.resetTime - Date.now()) / 1000))
    await this.redis.set(key, record, { ex: ttlSeconds })
  }
}

let cachedStore: RateLimitStore | null = null

/** Resolve the configured store once per instance. */
export function getRateLimitStore(): RateLimitStore {
  if (cachedStore) return cachedStore

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  cachedStore = url && token
    ? new UpstashRedisRateLimitStore(url, token)
    : new MemoryRateLimitStore()
  return cachedStore
}

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

export type RateLimitType = keyof typeof RATE_LIMITS

function getRateLimitKey(ip: string, type: RateLimitType): string {
  return `rate:${type}:${ip}`
}

async function checkRateLimit(
  store: RateLimitStore,
  key: string,
  config: { windowMs: number; maxRequests: number }
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const now = Date.now()
  const record = await store.get(key)

  if (!record || now > record.resetTime) {
    // First request or window expired
    const fresh: RateLimitRecord = { count: 1, resetTime: now + config.windowMs }
    await store.set(key, fresh)
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: fresh.resetTime,
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
  await store.set(key, record)
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime,
  }
}

function getClientIP(request: NextRequest): string {
  // Prefer the proxy-set real IP. When reading x-forwarded-for, use the LAST
  // entry: proxies append, so the right-most untrusted hop is the client; the
  // FIRST entry is client-supplied and trivially spoofed to bypass limits.
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP.trim()
  }

  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const parts = forwarded.split(',')
    return parts[parts.length - 1].trim()
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

export async function rateLimit(request: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIP(request)
  const type = getRateLimitType(request.nextUrl.pathname)
  const config = RATE_LIMITS[type]
  const key = getRateLimitKey(ip, type)
  const store = getRateLimitStore()

  const { allowed, resetTime } = await checkRateLimit(store, key, config)

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

  // Continue to next middleware/handler
  return null
}

export async function addRateLimitHeaders(
  response: NextResponse,
  request: NextRequest
): Promise<NextResponse> {
  const ip = getClientIP(request)
  const type = getRateLimitType(request.nextUrl.pathname)
  const config = RATE_LIMITS[type]
  const key = getRateLimitKey(ip, type)
  const store = getRateLimitStore()
  const record = await store.get(key)

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

// Cleanup old entries periodically for the in-memory store (every 5 minutes).
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const store = getRateLimitStore()
    store.cleanup?.()
  }, 5 * 60 * 1000)
}
