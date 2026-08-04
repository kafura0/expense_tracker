import { describe, it, expect } from 'vitest'
import { sumInBaseCurrency, buildBaseRateMap } from '@/entities/expense/totals'

describe('sumInBaseCurrency', () => {
  it('sums same-currency rows directly', () => {
    const rows = [
      { amount_cents: 100, currency: 'USD' },
      { amount_cents: 250, currency: 'USD' },
    ]
    expect(sumInBaseCurrency(rows, 'USD', {})).toBe(350)
  })

  it('converts foreign-currency rows via the base rate table', () => {
    const rows = [
      { amount_cents: 15350, currency: 'KES' },
      { amount_cents: 100, currency: 'USD' },
    ]
    // KES rate is 153.5 per USD → 15350 KES = 100 USD
    expect(sumInBaseCurrency(rows, 'USD', { KES: 153.5 })).toBe(200)
  })

  it('rounds converted amounts to whole cents', () => {
    const rows = [{ amount_cents: 100, currency: 'KES' }]
    expect(sumInBaseCurrency(rows, 'USD', { KES: 153.5 })).toBe(1)
  })

  it('skips rows whose currency has no positive rate', () => {
    const rows = [
      { amount_cents: 500, currency: 'XXX' },
      { amount_cents: 100, currency: 'USD' },
    ]
    expect(sumInBaseCurrency(rows, 'USD', {})).toBe(100)
  })

  it('returns zero for an empty list', () => {
    expect(sumInBaseCurrency([], 'USD', {})).toBe(0)
  })

  it('treats base currency rows as unchanged even without rates', () => {
    const rows = [{ amount_cents: 4200, currency: 'USD' }]
    expect(sumInBaseCurrency(rows, 'USD', {})).toBe(4200)
  })

  it('handles a zero rate by skipping (not dividing by zero)', () => {
    const rows = [{ amount_cents: 500, currency: 'KES' }]
    expect(sumInBaseCurrency(rows, 'USD', { KES: 0 })).toBe(0)
  })
})

describe('buildBaseRateMap', () => {
  it('maps target_currency → rate for valid rows', () => {
    const rows = [
      { target_currency: 'KES', rate: 153.5 },
      { target_currency: 'EUR', rate: 0.87 },
    ]
    expect(buildBaseRateMap(rows)).toEqual({ KES: 153.5, EUR: 0.87 })
  })

  it('skips null and non-positive rates', () => {
    const rows = [
      { target_currency: 'KES', rate: null },
      { target_currency: 'EUR', rate: 0 },
      { target_currency: 'GBP', rate: 0.85 },
    ]
    expect(buildBaseRateMap(rows)).toEqual({ GBP: 0.85 })
  })

  it('returns empty map for no rows', () => {
    expect(buildBaseRateMap([])).toEqual({})
  })
})
