/**
 * In-memory cache service for development
 * In production, use Redis or similar distributed cache
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    
    if (!entry) {
      return null
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }

    return entry.value as T
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs || this.defaultTTL)
    
    this.store.set(key, {
      value,
      expiresAt,
    })
  }

  /**
   * Delete a value from cache
   */
  delete(key: string): void {
    this.store.delete(key)
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.store.clear()
  }

  /**
   * Get cache stats
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key)
        cleaned++
      }
    }

    return cleaned
  }
}

// Singleton instance
export const cache = new MemoryCache()

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cache.cleanup()
  }, 5 * 60 * 1000)
}

/**
 * Cache key generators for consistent key naming
 */
export const cacheKeys = {
  exchangeRates: (baseCurrency: string) => `rates:${baseCurrency}`,
  userSettings: (userId: string) => `settings:${userId}`,
  userCategories: (userId: string) => `categories:${userId}`,
  expenseSummary: (userId: string, month: string) => `summary:${userId}:${month}`,
} as const

/**
 * Cache TTL configurations (in milliseconds)
 */
export const cacheTTL = {
  exchangeRates: 60 * 60 * 1000, // 1 hour (matches Frankfurter API cache)
  userSettings: 15 * 60 * 1000, // 15 minutes
  userCategories: 30 * 60 * 1000, // 30 minutes
  expenseSummary: 5 * 60 * 1000, // 5 minutes
} as const

/**
 * Wrapper function to cache async function results
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs?: number
): Promise<T> {
  // Check cache first
  const cached = cache.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // Fetch fresh data
  const data = await fetcher()
  
  // Store in cache
  cache.set(key, data, ttlMs)
  
  return data
}
