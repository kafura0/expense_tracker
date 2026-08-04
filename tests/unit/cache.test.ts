import { describe, it, expect, beforeEach, vi } from 'vitest'
import { cache, cacheKeys, cacheTTL, withCache } from '@/shared/lib/cache'

describe('cache singleton', () => {
  beforeEach(() => {
    cache.clear()
  })

  it('returns null for a missing key', () => {
    expect(cache.get('missing')).toBeNull()
  })

  it('stores and retrieves values', () => {
    cache.set('k', { hello: 'world' })
    expect(cache.get('k')).toEqual({ hello: 'world' })
  })

  it('returns null for an expired entry', () => {
    vi.useFakeTimers()
    cache.set('k', 'v', 1000)
    vi.advanceTimersByTime(1001)
    expect(cache.get('k')).toBeNull()
    vi.useRealTimers()
  })

  it('deletes a key', () => {
    cache.set('k', 'v')
    cache.delete('k')
    expect(cache.get('k')).toBeNull()
  })

  it('reports stats', () => {
    cache.set('a', 1)
    cache.set('b', 2)
    expect(cache.stats().size).toBe(2)
    expect(cache.stats().keys.sort()).toEqual(['a', 'b'])
  })

  it('cleanup removes only expired entries', () => {
    vi.useFakeTimers()
    cache.set('expired', 'x', 100)
    cache.set('fresh', 'y', 10000)
    vi.advanceTimersByTime(101)
    expect(cache.cleanup()).toBe(1)
    expect(cache.get('expired')).toBeNull()
    expect(cache.get('fresh')).toBe('y')
    vi.useRealTimers()
  })
})

describe('withCache', () => {
  beforeEach(() => {
    cache.clear()
  })

  it('fetches and caches on first call', async () => {
    const fetcher = vi.fn().mockResolvedValue(42)
    const result = await withCache('n', fetcher)
    expect(result).toBe(42)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('serves from cache on subsequent calls', async () => {
    const fetcher = vi.fn().mockResolvedValue(42)
    await withCache('n', fetcher)
    const again = await withCache('n', fetcher)
    expect(again).toBe(42)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})

describe('cache keys and TTLs', () => {
  it('builds consistent key names', () => {
    expect(cacheKeys.exchangeRates('USD')).toBe('rates:USD')
    expect(cacheKeys.userSettings('u1')).toBe('settings:u1')
    expect(cacheKeys.userCategories('u1')).toBe('categories:u1')
    expect(cacheKeys.expenseSummary('u1', '2024-01')).toBe('summary:u1:2024-01')
  })

  it('defines positive TTLs', () => {
    for (const ttl of Object.values(cacheTTL)) {
      expect(ttl).toBeGreaterThan(0)
    }
  })
})
