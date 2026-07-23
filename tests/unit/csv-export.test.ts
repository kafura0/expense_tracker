import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateCSV, downloadCSV } from '@/shared/lib/csv-export'

describe('CSV Export', () => {
  const mockExpenses = [
    {
      date: '2024-01-15T10:30:00Z',
      amount_cents: 4500,
      currency: 'USD',
      category_name: 'Meals & Entertainment',
      notes: 'Client lunch',
      tax_applicable: true,
      tax_amount_cents: 720,
    },
    {
      date: '2024-01-16T14:45:00Z',
      amount_cents: 2500,
      currency: 'KES',
      category_name: 'Transport',
      notes: 'Taxi to office',
      tax_applicable: false,
      tax_amount_cents: 0,
    },
  ]

  describe('generateCSV', () => {
    it('should generate CSV with correct headers', () => {
      const csv = generateCSV([])
      const headers = csv.split('\n')[0]
      expect(headers).toContain('Date')
      expect(headers).toContain('Amount')
      expect(headers).toContain('Currency')
      expect(headers).toContain('Category')
      expect(headers).toContain('Notes')
      expect(headers).toContain('Tax Applicable')
      expect(headers).toContain('Tax Amount')
    })

    it('should generate CSV with correct data rows', () => {
      const csv = generateCSV(mockExpenses)
      const lines = csv.split('\n')
      
      // Header + 2 data rows
      expect(lines).toHaveLength(3)
      
      // Check first data row
      expect(lines[1]).toContain('2024-01-15')
      expect(lines[1]).toContain('45.00')
      expect(lines[1]).toContain('USD')
      expect(lines[1]).toContain('Meals & Entertainment')
      expect(lines[1]).toContain('Client lunch')
      expect(lines[1]).toContain('Yes')
      expect(lines[1]).toContain('7.20')
    })

    it('should handle empty expenses array', () => {
      const csv = generateCSV([])
      const lines = csv.split('\n')
      expect(lines).toHaveLength(1) // Only header
    })

    it('should handle expenses without optional fields', () => {
      const expenses = [
        {
          date: '2024-01-15T10:30:00Z',
          amount_cents: 1000,
          currency: 'USD',
        },
      ]
      const csv = generateCSV(expenses)
      const lines = csv.split('\n')
      expect(lines).toHaveLength(2)
      
      // Should have empty strings for optional fields
      expect(lines[1]).toContain('""')
    })

    it('should format amounts correctly (cents to dollars)', () => {
      const expenses = [
        {
          date: '2024-01-15T10:30:00Z',
          amount_cents: 12345,
          currency: 'USD',
        },
      ]
      const csv = generateCSV(expenses)
      expect(csv).toContain('123.45')
    })

    it('should format dates correctly', () => {
      const expenses = [
        {
          date: '2024-12-25T00:00:00Z',
          amount_cents: 1000,
          currency: 'USD',
        },
      ]
      const csv = generateCSV(expenses)
      expect(csv).toContain('2024-12-25')
    })

    it('should handle tax_applicable as false', () => {
      const expenses = [
        {
          date: '2024-01-15T10:30:00Z',
          amount_cents: 1000,
          currency: 'USD',
          tax_applicable: false,
        },
      ]
      const csv = generateCSV(expenses)
      expect(csv).toContain('No')
    })

    it('should handle tax_amount_cents as undefined', () => {
      const expenses = [
        {
          date: '2024-01-15T10:30:00Z',
          amount_cents: 1000,
          currency: 'USD',
          tax_applicable: true,
        },
      ]
      const csv = generateCSV(expenses)
      expect(csv).toContain('0.00')
    })

    it('should properly escape CSV values', () => {
      const expenses = [
        {
          date: '2024-01-15T10:30:00Z',
          amount_cents: 1000,
          currency: 'USD',
          notes: 'Note with "quotes" and, comma',
        },
      ]
      const csv = generateCSV(expenses)
      // Values should be quoted
      expect(csv).toContain('"Note with "quotes" and, comma"')
    })
  })

  describe('downloadCSV', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should create a blob with correct MIME type', () => {
      const spy = vi.spyOn(URL, 'createObjectURL')
      downloadCSV('test,csv', 'test.csv')
      expect(spy).toHaveBeenCalled()
      
      const blobArg = spy.mock.calls[0][0] as Blob
      expect(blobArg.type).toBe('text/csv;charset=utf-8;')
    })

    it('should trigger download with correct filename', () => {
      const mockLink = {
        setAttribute: vi.fn(),
        style: { visibility: '' },
        click: vi.fn(),
      }
      
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any)
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => {})
      
      downloadCSV('test,csv', 'expenses.csv')
      
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'expenses.csv')
      expect(mockLink.click).toHaveBeenCalled()
    })

    it('should hide the download link', () => {
      const mockLink = {
        setAttribute: vi.fn(),
        style: { visibility: '' },
        click: vi.fn(),
      }
      
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any)
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => {})
      
      downloadCSV('test,csv', 'test.csv')
      
      expect(mockLink.style.visibility).toBe('hidden')
    })
  })
})
