import { describe, it, expect } from 'vitest'
import { currencySymbol, formatMoney, formatMoneyCompact } from '@/shared/lib/currency'

describe('currencySymbol', () => {
  it('returns the mapped symbol for known currencies', () => {
    expect(currencySymbol('USD')).toBe('$')
    expect(currencySymbol('KES')).toBe('KSh')
    expect(currencySymbol('EUR')).toBe('€')
    expect(currencySymbol('GBP')).toBe('£')
  })

  it('falls back to the currency code for unknown currencies', () => {
    expect(currencySymbol('XXX')).toBe('XXX')
  })

  it('defaults to USD', () => {
    expect(currencySymbol()).toBe('$')
  })
})

describe('formatMoney', () => {
  it('formats cents as a currency string', () => {
    expect(formatMoney(123456, 'USD')).toBe('$1,234.56')
  })

  it('handles zero', () => {
    expect(formatMoney(0, 'USD')).toBe('$0.00')
  })

  it('defaults to USD', () => {
    expect(formatMoney(100)).toBe('$1.00')
  })
})

describe('formatMoneyCompact', () => {
  it('formats large amounts compactly', () => {
    expect(formatMoneyCompact(123456789, 'USD')).toMatch(/\$1\.2[KM]/)
  })

  it('formats small amounts', () => {
    expect(formatMoneyCompact(100, 'USD')).toBe('$1.0')
  })
})
