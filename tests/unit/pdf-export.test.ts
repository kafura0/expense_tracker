import { describe, it, expect } from 'vitest'

describe('PDF Export', () => {
  describe('generatePDF', () => {
    it('should be exported and callable', async () => {
      const { generatePDF } = await import('@/shared/lib/pdf-export')
      expect(typeof generatePDF).toBe('function')
    }, 15000)

    it('should accept expenses array, user name, and optional date range', async () => {
      const { generatePDF } = await import('@/shared/lib/pdf-export')
      
      // Just verify the function signature is correct
      expect(generatePDF).toHaveLength(3) // expenses, userName, dateRange?
    }, 15000)
  })
})
