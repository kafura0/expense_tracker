'use client'

/**
 * expense-form.tsx
 *
 * Form component for creating and editing expenses.
 *
 * MULTI-TENANCY:
 * Categories are fetched with an org_id filter to ensure only categories
 * belonging to the active organization are shown. This prevents:
 * - Users from associating expenses with categories from other orgs
 * - Data leakage through category names from other organizations
 *
 * The org_id is resolved via the useActiveOrgId() hook, which calls a server
 * action to read the httpOnly cookie. This ensures the org_id is never
 * exposed to client-side JavaScript where it could be tampered with.
 *
 * CURRENCY CONVERSION:
 * When the user enters an amount in a non-base currency, the form fetches
 * exchange rates from the API route and shows the converted amount in real-time.
 * The rate is stored with the expense for historical accuracy.
 *
 * TAX CALCULATION:
 * If the "Tax applicable" checkbox is checked, VAT is calculated at the
 * default rate (16%) and displayed in the form before submission.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { expenseInsertSchema, type ExpenseInsert } from '@/entities/expense/schema'
import type { ExpenseWithCategory } from '@/entities/expense/types'
import { createExpense, updateExpense } from './actions'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useToast } from '@/shared/ui/toast'
import { createClient } from '@/shared/lib/supabase/client'
import { useActiveOrgId } from '@/shared/lib/org-helpers'
import { convertAmount } from '@/entities/exchange-rate/service'
import { calculateVAT, DEFAULT_VAT_RATE } from '@/shared/lib/vat'

interface Category {
  id: string
  name: string
  icon?: string | null
  color?: string | null
}

interface ExpenseFormProps {
  expense?: ExpenseWithCategory | null
  onSuccess: () => void
  onCancel: () => void
}

const CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']
const BASE_CURRENCY = 'USD'

export function ExpenseForm({ expense, onSuccess, onCancel }: ExpenseFormProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [rates, setRates] = useState<Record<string, number>>({})
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null)
  const [vatResult, setVatResult] = useState<{ tax: number; total: number } | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const orgId = useActiveOrgId()

  const isEditing = !!expense

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ExpenseInsert>({
    resolver: zodResolver(expenseInsertSchema),
    defaultValues: expense ? {
      amount_cents: expense.amount_cents ?? 0,
      currency: expense.currency ?? 'USD',
      category_id: expense.category_id ?? null,
      date: expense.date ? String(expense.date).slice(0, 16) : new Date().toISOString().slice(0, 16),
      notes: expense.notes ?? '',
      tax_applicable: expense.tax_applicable ?? false,
      is_taxable: expense.is_taxable ?? false,
    } : {
      currency: 'USD',
      date: new Date().toISOString().slice(0, 16),
      tax_applicable: false,
      is_taxable: false,
    },
  })

  /* eslint-disable react-hooks/incompatible-library */
  const watchedAmount = watch('amount_cents')
  const watchedCurrency = watch('currency')
  const watchedIsTaxable = watch('is_taxable')
  /* eslint-enable react-hooks/incompatible-library */

  const fetchCategories = useCallback(async () => {
    if (!orgId) return

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('org_id', orgId)
      .order('name')
    
    if (error) {
      console.error('Failed to fetch categories:', error.message)
      return
    }

    if (data) {
      setCategories(data)
    }
  }, [orgId, supabase])

  const fetchRates = useCallback(async () => {
    try {
      const response = await fetch(`/api/rates?base=${BASE_CURRENCY}`)
      if (response.ok) {
        const data = await response.json()
        setRates(data.rates)
      }
    } catch (error) {
      console.error('Error fetching rates:', error)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
    fetchRates()
  }, [fetchCategories, fetchRates])

  useEffect(() => {
    if (watchedAmount && watchedCurrency && rates) {
      const converted = convertAmount(watchedAmount, watchedCurrency, BASE_CURRENCY, rates)
      setConvertedAmount(Math.round(converted))
    }
  }, [watchedAmount, watchedCurrency, rates])

  useEffect(() => {
    if (watchedAmount && watchedIsTaxable) {
      const result = calculateVAT(watchedAmount, DEFAULT_VAT_RATE)
      setVatResult(result)
    } else {
      setVatResult(null)
    }
  }, [watchedAmount, watchedIsTaxable])

  const onSubmit = async (data: ExpenseInsert) => {
    try {
      const submissionData = {
        ...data,
        converted_amount_cents: convertedAmount ?? undefined,
        converted_currency: BASE_CURRENCY,
        exchange_rate_used: rates[data.currency] || 1,
        tax_rate_used: data.is_taxable ? DEFAULT_VAT_RATE : undefined,
        tax_amount_cents: vatResult?.tax,
      }

      if (isEditing && expense?.id) {
        const result = await updateExpense(expense.id, submissionData)
        if (result.error) {
          toast(result.error, 'error')
          return
        }
        toast('Expense updated successfully', 'success')
      } else {
        const result = await createExpense(submissionData)
        if (result.error) {
          toast(result.error, 'error')
          return
        }
        toast('Expense created successfully', 'success')
      }
      
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      reset()
      onSuccess()
    } catch {
      toast('An error occurred', 'error')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="amount_cents" className="text-sm font-medium">
            Amount (cents) *
          </label>
          <Input
            id="amount_cents"
            type="number"
            {...register('amount_cents', { valueAsNumber: true })}
            placeholder="0"
          />
          {errors.amount_cents && (
            <p className="text-sm text-red-500">{errors.amount_cents.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="currency" className="text-sm font-medium">
            Currency *
          </label>
          <select
            id="currency"
            {...register('currency')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </div>
      </div>

      {convertedAmount !== null && watchedCurrency !== BASE_CURRENCY && (
        <div className="p-3 bg-surface-container rounded-lg">
          <p className="text-sm text-on-surface-variant">
            Converted to {BASE_CURRENCY}:{' '}
            <span className="font-bold text-primary">
              ${(convertedAmount / 100).toFixed(2)}
            </span>
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            Rate: 1 {watchedCurrency} = {rates[watchedCurrency]?.toFixed(4)} {BASE_CURRENCY}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="category_id" className="text-sm font-medium">
            Category
          </label>
          <select
            id="category_id"
            {...register('category_id')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="date" className="text-sm font-medium">
            Date & Time *
          </label>
          <Input
            id="date"
            type="datetime-local"
            {...register('date')}
          />
          {errors.date && (
            <p className="text-sm text-red-500">{errors.date.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-medium">
          Notes
        </label>
        <Input
          id="notes"
          {...register('notes')}
          placeholder="Optional notes"
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="is_taxable"
          {...register('is_taxable')}
          className="h-4 w-4 rounded border-gray-300"
        />
        <label htmlFor="is_taxable" className="text-sm font-medium">
          Tax applicable (VAT {DEFAULT_VAT_RATE}%)
        </label>
      </div>

      {vatResult && (
        <div className="p-3 bg-surface-container rounded-lg">
          <p className="text-sm text-on-surface-variant">
            Tax ({DEFAULT_VAT_RATE}%):{' '}
            <span className="font-bold text-tertiary">
              ${(vatResult.tax / 100).toFixed(2)}
            </span>
          </p>
          <p className="text-sm text-on-surface-variant mt-1">
            Total with tax:{' '}
            <span className="font-bold text-on-surface">
              ${(vatResult.total / 100).toFixed(2)}
            </span>
          </p>
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}