import { describe, it, expect, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import {
  MemoryRateLimitStore,
  UpstashRedisRateLimitStore,
  rateLimit,
  addRateLimitHeaders,
} from '@/shared/lib/rate-limit'

vi.mock('@upstash/redis', () => ({
  Redis: class {
    incr() {
      return Promise.resolve(1)
    }
    expire() {
      return Promise.resolve(1)
    }
    async get() {
      return null
    }
    async set() {
      return 'OK'
    }
  },
}))

function makeRequest(pathname: string, ip: string, extra: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL(`https://example.com${pathname}`), {
    headers: new Headers({ 'x-real-ip': ip, ...extra }),
  })
}

function makeResponse(): NextResponse {
  return NextResponse.json({ ok: true })
}

describe('MemoryRateLimitStore', () => {
  it('returns null for a missing key', () => {
    const store = new MemoryRateLimitStore()
    expect(store.get('nope')).toBeNull()
  })

  it('stores and returns records', () => {
    const store = new MemoryRateLimitStore()
    const record = { count: 1, resetTime: Date.now() + 1000 }
    store.set('k', record)
    expect(store.get('k')).toEqual(record)
  })

  it('cleanup removes expired records only', () => {
    const store = new MemoryRateLimitStore()
    store.set('expired', { count: 5, resetTime: Date.now() - 1 })
    store.set('fresh', { count: 1, resetTime: Date.now() + 10000 })
    store.cleanup()
    expect(store.get('expired')).toBeNull()
    expect(store.get('fresh')).not.toBeNull()
  })
})

describe('UpstashRedisRateLimitStore', () => {
  it('throws when credentials are missing', () => {
    expect(() => new UpstashRedisRateLimitStore(undefined, undefined)).toThrow()
  })

  it('increments atomically and sets the window TTL on the first hit', async () => {
    const store = new UpstashRedisRateLimitStore('https://cache.upstash.io', 'token')
    const redis = (store as unknown as { redis: { incr: (...a: unknown[]) => Promise<number>; expire: (...a: unknown[]) => Promise<number> } }).redis
    const incrSpy = vi.spyOn(redis, 'incr').mockResolvedValue(1)
    const expireSpy = vi.spyOn(redis, 'expire').mockResolvedValue(1)

    const { count, resetTime } = await store.increment!('rate:api:1.2.3.4', 60_000)
    expect(count).toBe(1)
    expect(incrSpy).toHaveBeenCalledWith('rate:api:1.2.3.4')
    expect(expireSpy).toHaveBeenCalledWith('rate:api:1.2.3.4', 60)
    expect(resetTime).toBeGreaterThan(Date.now())
  })

  it('does not re-set the TTL on later hits in the same window', async () => {
    const store = new UpstashRedisRateLimitStore('https://cache.upstash.io', 'token')
    const redis = (store as unknown as { redis: { incr: (...a: unknown[]) => Promise<number>; expire: (...a: unknown[]) => Promise<number> } }).redis
    const incrSpy = vi.spyOn(redis, 'incr').mockResolvedValue(7)
    const expireSpy = vi.spyOn(redis, 'expire').mockResolvedValue(1)

    await store.increment!('rate:api:9.9.9.9', 60_000)
    expect(incrSpy).toHaveBeenCalledWith('rate:api:9.9.9.9')
    expect(expireSpy).not.toHaveBeenCalled()
  })
})

describe('rateLimit', () => {
  it('allows the first request', async () => {
    expect(await rateLimit(makeRequest('/api/things', '10.0.0.1'))).toBeNull()
  })

  it('returns 429 after exceeding the api limit', async () => {
    const request = makeRequest('/api/things', '10.0.0.2')
    for (let i = 0; i < 60; i++) {
      expect(await rateLimit(request)).toBeNull()
    }
    const blocked = await rateLimit(request)
    expect(blocked).not.toBeNull()
    expect(blocked!.status).toBe(429)
    expect(blocked!.headers.get('Retry-After')).not.toBeNull()
    expect(blocked!.headers.get('X-RateLimit-Limit')).toBe('60')
  })

  it('uses the auth limit for auth paths', async () => {
    const request = makeRequest('/login', '10.0.0.3')
    for (let i = 0; i < 5; i++) {
      expect(await rateLimit(request)).toBeNull()
    }
    expect((await rateLimit(request))?.status).toBe(429)
  })

  it('keys by real ip when present', async () => {
    expect(await rateLimit(makeRequest('/api/x', '1.2.3.4'))).toBeNull()
    expect(await rateLimit(makeRequest('/api/x', '5.6.7.8'))).toBeNull()
  })

  it('uses the last x-forwarded-for hop when no real ip is present', async () => {
    const req = (hop: string) =>
      new NextRequest(new URL('https://example.com/api/x'), {
        headers: new Headers({ 'x-forwarded-for': `9.9.9.9, ${hop}` }),
      })
    // Same last hop → shares the same bucket
    expect(await rateLimit(req('2.2.2.2'))).toBeNull()
    expect(await rateLimit(req('2.2.2.2'))).toBeNull()
  })
})

describe('addRateLimitHeaders', () => {
  it('sets limit headers after a request', async () => {
    const request = makeRequest('/api/things', '10.0.0.9')
    await rateLimit(request)
    const response = await addRateLimitHeaders(makeResponse(), request)
    expect(response.headers.get('X-RateLimit-Limit')).toBe('60')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('59')
    expect(response.headers.get('X-RateLimit-Reset')).not.toBeNull()
  })

  it('leaves headers unset when no record exists', async () => {
    const request = makeRequest('/api/never-hit', '10.0.0.10')
    const response = await addRateLimitHeaders(makeResponse(), request)
    expect(response.headers.get('X-RateLimit-Limit')).toBeNull()
  })
})
