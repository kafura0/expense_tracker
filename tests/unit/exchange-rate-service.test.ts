import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchRatesFromAPI, getExchangeRates } from '@/entities/exchange-rate/service'

vi.mock('@/entities/exchange-rate/repository', () => ({
  findLatestRates: vi.fn(),
  isRatesStale: vi.fn(),
  upsertRates: vi.fn(),
}))

const repo = await import('@/entities/exchange-rate/repository')

const findLatestRates = repo.findLatestRates as ReturnType<typeof vi.fn>
const isRatesStale = repo.isRatesStale as ReturnType<typeof vi.fn>
const upsertRates = repo.upsertRates as ReturnType<typeof vi.fn>

const CACHED = [
  { target_currency: 'EUR', rate: 0.87, fetched_at: '2024-01-15T00:00:00Z' },
  { target_currency: 'GBP', rate: 0.76, fetched_at: '2024-01-15T00:00:00Z' },
]

const originalFetch = globalThis.fetch

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('fetchRatesFromAPI', () => {
  it('fetches and fills missing KES', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ base: 'USD', date: '2024-01-15', rates: { EUR: 0.87 } }),
    })
    const rates = await fetchRatesFromAPI('USD')
    expect(rates.base).toBe('USD')
    expect(rates.rates.EUR).toBe(0.87)
    expect(rates.rates.KES).toBeCloseTo(153.5)
  })

  it('throws on a non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    await expect(fetchRatesFromAPI('USD')).rejects.toThrow(/Frankfurter API error: 500/)
  })

  it('rethrows network errors', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network down'))
    await expect(fetchRatesFromAPI('USD')).rejects.toThrow('network down')
  })
})

describe('getExchangeRates', () => {
  it('returns cached rates when not stale', async () => {
    isRatesStale.mockResolvedValue(false)
    findLatestRates.mockResolvedValue(CACHED)
    const rates = await getExchangeRates('USD')
    expect(rates.base).toBe('USD')
    expect(rates.rates.EUR).toBe(0.87)
    expect(rates.date).toBe('2024-01-15')
    expect(upsertRates).not.toHaveBeenCalled()
  })

  it('fetches fresh rates when stale and caches them', async () => {
    isRatesStale.mockResolvedValue(true)
    upsertRates.mockResolvedValue(undefined)
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ base: 'USD', date: '2024-02-01', rates: { EUR: 0.9 } }),
    })
    const rates = await getExchangeRates('USD')
    expect(rates.base).toBe('USD')
    expect(rates.rates.EUR).toBe(0.9)
    expect(upsertRates).toHaveBeenCalledTimes(1)
  })

  it('falls back to stale cache when the API fails', async () => {
    isRatesStale.mockResolvedValue(true)
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network down'))
    findLatestRates.mockResolvedValue(CACHED)
    const rates = await getExchangeRates('USD')
    expect(rates.rates.EUR).toBe(0.87)
  })

  it('throws when the API fails and no cache exists', async () => {
    isRatesStale.mockResolvedValue(true)
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network down'))
    findLatestRates.mockResolvedValue([])
    await expect(getExchangeRates('USD')).rejects.toThrow('No exchange rates available')
  })

  it('keeps fresh rates even when the cache write fails', async () => {
    isRatesStale.mockResolvedValue(true)
    upsertRates.mockRejectedValue(new Error('permission denied'))
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ base: 'USD', date: '2024-02-01', rates: { EUR: 0.9 } }),
    })
    const rates = await getExchangeRates('USD')
    expect(rates.rates.EUR).toBe(0.9)
  })
})
