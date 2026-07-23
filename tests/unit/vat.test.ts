import { describe, it, expect } from 'vitest'
import {
  calculateVAT,
  getTaxAmount,
  getTotalWithTax,
  DEFAULT_VAT_RATE,
} from '@/shared/lib/vat'

describe('VAT Engine', () => {
  describe('calculateVAT', () => {
    it('should calculate tax correctly for standard rate (16%)', () => {
      const result = calculateVAT(10000, 16) // $100.00 at 16%
      expect(result.tax).toBe(1600) // $16.00
      expect(result.total).toBe(11600) // $116.00
    })

    it('should calculate tax correctly for zero rate', () => {
      const result = calculateVAT(10000, 0)
      expect(result.tax).toBe(0)
      expect(result.total).toBe(10000)
    })

    it('should calculate tax correctly for 100% rate', () => {
      const result = calculateVAT(10000, 100)
      expect(result.tax).toBe(10000)
      expect(result.total).toBe(20000)
    })

    it('should handle zero amount', () => {
      const result = calculateVAT(0, 16)
      expect(result.tax).toBe(0)
      expect(result.total).toBe(0)
    })

    it('should round tax to nearest cent', () => {
      // 10000 cents * 7.5% = 750 cents (exact)
      const result = calculateVAT(10000, 7.5)
      expect(result.tax).toBe(750)
      expect(result.total).toBe(10750)
    })

    it('should handle fractional cents correctly', () => {
      // 1001 cents * 16% = 160.16 cents, should round to 160
      const result = calculateVAT(1001, 16)
      expect(result.tax).toBe(160)
      expect(result.total).toBe(1161)
    })

    it('should handle large amounts', () => {
      const result = calculateVAT(100000000, 16) // $1,000,000.00
      expect(result.tax).toBe(16000000)
      expect(result.total).toBe(116000000)
    })

    it('should handle small amounts', () => {
      const result = calculateVAT(1, 16) // $0.01
      expect(result.tax).toBe(0) // Rounds down from 0.16
      expect(result.total).toBe(1)
    })

    it('should handle decimal rates', () => {
      const result = calculateVAT(10000, 5.5) // 5.5%
      expect(result.tax).toBe(550)
      expect(result.total).toBe(10550)
    })
  })

  describe('getTaxAmount', () => {
    it('should return only tax amount', () => {
      const tax = getTaxAmount(10000, 16)
      expect(tax).toBe(1600)
    })

    it('should return 0 for zero rate', () => {
      const tax = getTaxAmount(10000, 0)
      expect(tax).toBe(0)
    })

    it('should return 0 for zero amount', () => {
      const tax = getTaxAmount(0, 16)
      expect(tax).toBe(0)
    })
  })

  describe('getTotalWithTax', () => {
    it('should return total including tax', () => {
      const total = getTotalWithTax(10000, 16)
      expect(total).toBe(11600)
    })

    it('should return original amount for zero rate', () => {
      const total = getTotalWithTax(10000, 0)
      expect(total).toBe(10000)
    })

    it('should return 0 for zero amount', () => {
      const total = getTotalWithTax(0, 16)
      expect(total).toBe(0)
    })
  })

  describe('DEFAULT_VAT_RATE', () => {
    it('should be 16 (Kenya VAT rate)', () => {
      expect(DEFAULT_VAT_RATE).toBe(16)
    })
  })

  describe('Edge cases', () => {
    it('should handle negative amounts gracefully', () => {
      const result = calculateVAT(-10000, 16)
      expect(result.tax).toBe(-1600)
      expect(result.total).toBe(-11600)
    })

    it('should handle negative rates', () => {
      const result = calculateVAT(10000, -16)
      expect(result.tax).toBe(-1600)
      expect(result.total).toBe(8400)
    })

    it('should maintain precision with repeated calculations', () => {
      // Simulate multiple calculations to check for drift
      let total = 0
      for (let i = 0; i < 1000; i++) {
        const result = calculateVAT(100, 16)
        total += result.tax
      }
      expect(total).toBe(16000) // 1000 * 16
    })
  })
})
