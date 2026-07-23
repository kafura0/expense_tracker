import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the repository functions
vi.mock('@/entities/expense/repository', () => ({
  createExpense: vi.fn(),
  updateExpense: vi.fn(),
  softDeleteExpense: vi.fn(),
  restoreExpense: vi.fn(),
  findExpenseById: vi.fn(),
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('Expense Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createExpense', () => {
    it('should create expense and return data', async () => {
      const { createExpense } = await import('@/features/expenses/actions')
      const { createExpense: createExpenseRepo } = await import('@/entities/expense/repository')
      
      const mockExpense = {
        id: '123',
        amount_cents: 5000,
        currency: 'USD',
        category_id: 'cat-1',
        date: '2024-01-15T10:30:00Z',
        notes: 'Test expense',
        tax_applicable: true,
      }
      
      vi.mocked(createExpenseRepo).mockResolvedValue(mockExpense as any)
      
      const result = await createExpense({
        amount_cents: 5000,
        currency: 'USD',
        category_id: 'cat-1',
        date: '2024-01-15T10:30:00Z',
        notes: 'Test expense',
        tax_applicable: true,
        user_id: 'user-1',
      })
      
      expect(result.data).toEqual(mockExpense)
      expect(result.error).toBeNull()
      expect(createExpenseRepo).toHaveBeenCalledOnce()
    })

    it('should return error on failure', async () => {
      const { createExpense } = await import('@/features/expenses/actions')
      const { createExpense: createExpenseRepo } = await import('@/entities/expense/repository')
      
      vi.mocked(createExpenseRepo).mockRejectedValue(new Error('Database error'))
      
      const result = await createExpense({
        amount_cents: 5000,
        currency: 'USD',
        category_id: 'cat-1',
        date: '2024-01-15T10:30:00Z',
        tax_applicable: false,
        user_id: 'user-1',
      })
      
      expect(result.data).toBeNull()
      expect(result.error).toBe('Database error')
    })
  })

  describe('updateExpense', () => {
    it('should update expense and return data', async () => {
      const { updateExpense } = await import('@/features/expenses/actions')
      const { updateExpense: updateExpenseRepo } = await import('@/entities/expense/repository')
      
      const mockUpdated = {
        id: '123',
        amount_cents: 6000,
        notes: 'Updated expense',
      }
      
      vi.mocked(updateExpenseRepo).mockResolvedValue(mockUpdated as any)
      
      const result = await updateExpense('123', {
        amount_cents: 6000,
        notes: 'Updated expense',
      })
      
      expect(result.data).toEqual(mockUpdated)
      expect(result.error).toBeNull()
      expect(updateExpenseRepo).toHaveBeenCalledWith('123', {
        amount_cents: 6000,
        notes: 'Updated expense',
      })
    })

    it('should return error on failure', async () => {
      const { updateExpense } = await import('@/features/expenses/actions')
      const { updateExpense: updateExpenseRepo } = await import('@/entities/expense/repository')
      
      vi.mocked(updateExpenseRepo).mockRejectedValue(new Error('Not found'))
      
      const result = await updateExpense('123', { amount_cents: 6000 })
      
      expect(result.data).toBeNull()
      expect(result.error).toBe('Not found')
    })
  })

  describe('deleteExpense', () => {
    it('should soft delete expense', async () => {
      const { deleteExpense } = await import('@/features/expenses/actions')
      const { softDeleteExpense: softDeleteExpenseRepo } = await import('@/entities/expense/repository')
      
      vi.mocked(softDeleteExpenseRepo).mockResolvedValue(undefined)
      
      const result = await deleteExpense('123')
      
      expect(result.error).toBeNull()
      expect(softDeleteExpenseRepo).toHaveBeenCalledWith('123')
    })

    it('should return error on failure', async () => {
      const { deleteExpense } = await import('@/features/expenses/actions')
      const { softDeleteExpense: softDeleteExpenseRepo } = await import('@/entities/expense/repository')
      
      vi.mocked(softDeleteExpenseRepo).mockRejectedValue(new Error('Delete failed'))
      
      const result = await deleteExpense('123')
      
      expect(result.error).toBe('Delete failed')
    })
  })

  describe('restoreExpense', () => {
    it('should restore expense', async () => {
      const { restoreExpense } = await import('@/features/expenses/actions')
      const { restoreExpense: restoreExpenseRepo } = await import('@/entities/expense/repository')
      
      const mockRestored = { id: '123', is_deleted: false }
      vi.mocked(restoreExpenseRepo).mockResolvedValue(mockRestored as any)
      
      const result = await restoreExpense('123')
      
      expect(result.data).toEqual(mockRestored)
      expect(result.error).toBeNull()
      expect(restoreExpenseRepo).toHaveBeenCalledWith('123')
    })
  })

  describe('duplicateExpense', () => {
    it('should duplicate expense with new date', async () => {
      const { duplicateExpense } = await import('@/features/expenses/actions')
      const { findExpenseById, createExpense: createExpenseRepo } = await import('@/entities/expense/repository')
      
      const originalExpense = {
        id: '123',
        user_id: 'user-1',
        amount_cents: 5000,
        currency: 'USD',
        category_id: 'cat-1',
        date: '2024-01-15T10:30:00Z',
        notes: 'Original',
        tax_applicable: true,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      }
      
      const newExpense = {
        id: '456',
        ...originalExpense,
        date: new Date().toISOString(),
      }
      
      vi.mocked(findExpenseById).mockResolvedValue(originalExpense as any)
      vi.mocked(createExpenseRepo).mockResolvedValue(newExpense as any)
      
      const result = await duplicateExpense('123')
      
      expect(result.data).toBeDefined()
      expect(result.error).toBeNull()
      expect(createExpenseRepo).toHaveBeenCalledOnce()
    })

    it('should return error if expense not found', async () => {
      const { duplicateExpense } = await import('@/features/expenses/actions')
      const { findExpenseById } = await import('@/entities/expense/repository')
      
      vi.mocked(findExpenseById).mockResolvedValue(null)
      
      const result = await duplicateExpense('nonexistent')
      
      expect(result.data).toBeNull()
      expect(result.error).toBe('Expense not found')
    })
  })
})
