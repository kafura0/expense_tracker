import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generatePDF } from '@/shared/lib/pdf-export'

const docMock = {
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  text: vi.fn(),
  getNumberOfPages: vi.fn(() => 1),
  save: vi.fn(),
  internal: { pageSize: { width: 200, height: 300 } },
}

vi.mock('jspdf', () => ({
  default: function JsPDFMock() {
    return docMock
  },
}))

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}))

const autoTable = await import('jspdf-autotable')

describe('generatePDF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const expenses = [
    {
      date: '2024-01-15T10:30:00Z',
      amount_cents: 4500,
      currency: 'USD',
      category_name: 'Meals',
      notes: 'Client lunch',
      tax_applicable: true,
      tax_amount_cents: 720,
    },
  ]

  it('produces a header, summary and table for expenses', async () => {
    await generatePDF(expenses, 'Jane Doe', { from: new Date('2024-01-01'), to: new Date('2024-01-31') })

    expect(docMock.save).toHaveBeenCalled()
    expect(docMock.text).toHaveBeenCalledWith('Ledgerly', 14, 22)
    expect(docMock.text).toHaveBeenCalledWith('Expense Report', 14, 32)
    expect(docMock.text).toHaveBeenCalledWith('Generated for: Jane Doe', 14, 42)
    expect(autoTable.default).toHaveBeenCalledWith(docMock, expect.objectContaining({
      head: [['Date', 'Amount', 'Currency', 'Category', 'Notes', 'Tax']],
      body: [['Jan 15, 2024', '$45.00', 'USD', 'Meals', 'Client lunch', '$7.2']],
    }))
  })

  it('works without a date range', async () => {
    await generatePDF(expenses, 'Jane Doe')
    expect(docMock.save).toHaveBeenCalled()
  })

  it('handles an empty expense list', async () => {
    await generatePDF([], 'Jane Doe')
    expect(autoTable.default).toHaveBeenCalledWith(docMock, expect.objectContaining({
      body: [],
    }))
  })
})
