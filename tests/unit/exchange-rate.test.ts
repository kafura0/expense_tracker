import { describe, it, expect } from 'vitest'
import { fillMissingRates, convertAmount } from '@/entities/exchange-rate/utils'

describe('fillMissingRates', () => {
  it('returns rates unchanged when KES is present', () => {
    const rates = { USD: 1, KES: 150 }
    expect(fillMissingRates('USD', rates)).toEqual(rates)
  })

  it('injects hardcoded USD→KES fallback when base is USD', () => {
    const rates = fillMissingRates('USD', { EUR: 0.87 })
    expect(rates.KES).toBeCloseTo(153.5)
    expect(rates.EUR).toBe(0.87)
  })

  it('derives KES via base→USD rate for non-USD bases', () => {
    const rates = fillMissingRates('EUR', { USD: 1.148, GBP: 0.85 })
    expect(rates.KES).toBeCloseTo(153.5 * 1.148)
    expect(rates.GBP).toBe(0.85)
  })

  it('returns rates unchanged when KES and base→USD are both missing', () => {
    const rates = { GBP: 0.85 }
    expect(fillMissingRates('JPY', rates)).toEqual(rates)
  })
})

describe('convertAmount', () => {
  const rates = { USD: 1, KES: 153.5, EUR: 0.87 }

  it('returns the amount unchanged for the same currency', () => {
    expect(convertAmount(100, 'USD', 'USD', rates)).toBe(100)
  })

  it('converts via the base currency', () => {
    const inBase = 100 / 153.5
    expect(convertAmount(100, 'KES', 'EUR', rates)).toBeCloseTo(inBase * 0.87)
  })

  it('returns null when a needed rate is missing', () => {
    expect(convertAmount(100, 'USD', 'XXX', rates)).toBeNull()
  })

  it('returns null when the source rate is missing', () => {
    expect(convertAmount(100, 'XXX', 'USD', rates)).toBeNull()
  })
})
