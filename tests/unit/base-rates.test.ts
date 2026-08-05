import { describe, it, expect, beforeEach } from 'vitest'
import { fetchBaseRates, clearBaseRatesCache } from '@/entities/exchange-rate/base-rates'

function mockSupabase(overrides: { error?: unknown; data?: unknown[] }) {
  return {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({
          data: overrides.data ?? [],
          error: overrides.error ?? null,
        }),
      }),
    }),
  }
}

describe('fetchBaseRates', () => {
  beforeEach(() => clearBaseRatesCache())

  it('maps rate rows into a currency → rate map', async () => {
    const supabase = mockSupabase({
      data: [
        { target_currency: 'KES', rate: 153.5 },
        { target_currency: 'EUR', rate: 0.87 },
      ],
    })
    const rates = await fetchBaseRates(supabase as never, 'USD')
    expect(rates).toEqual({ KES: 153.5, EUR: 0.87 })
  })

  it('skips null and non-positive rates', async () => {
    const supabase = mockSupabase({
      data: [
        { target_currency: 'KES', rate: null },
        { target_currency: 'EUR', rate: 0 },
        { target_currency: 'GBP', rate: 0.85 },
      ],
    })
    const rates = await fetchBaseRates(supabase as never, 'USD')
    expect(rates).toEqual({ GBP: 0.85 })
  })

  it('queries with the requested base currency', async () => {
    let queriedBase = ''
    const supabase = {
      from: () => ({
        select: () => ({
          eq: (column: string, value: string) => {
            queriedBase = value
            return Promise.resolve({ data: [], error: null })
          },
        }),
      }),
    }
    await fetchBaseRates(supabase as never, 'KES')
    expect(queriedBase).toBe('KES')
  })

  it('returns an empty map on error instead of throwing', async () => {
    const supabase = mockSupabase({ error: { message: 'denied' } })
    const rates = await fetchBaseRates(supabase as never, 'USD')
    expect(rates).toEqual({})
  })

  it('dedupes concurrent calls to the same base currency into one request', async () => {
    let calls = 0
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => {
            calls++
            return new Promise((resolve) =>
              setTimeout(() => resolve({ data: [{ target_currency: 'KES', rate: 153.5 }], error: null }), 10)
            )
          },
        }),
      }),
    }
    const [a, b] = await Promise.all([
      fetchBaseRates(supabase as never, 'USD'),
      fetchBaseRates(supabase as never, 'USD'),
    ])
    expect(calls).toBe(1)
    expect(a).toEqual({ KES: 153.5 })
    expect(b).toEqual({ KES: 153.5 })
  })

  it('serves a second call from the cache without querying again', async () => {
    let calls = 0
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => {
            calls++
            return Promise.resolve({ data: [{ target_currency: 'KES', rate: 153.5 }], error: null })
          },
        }),
      }),
    }
    await fetchBaseRates(supabase as never, 'USD')
    await fetchBaseRates(supabase as never, 'USD')
    expect(calls).toBe(1)
  })
})
