'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { expenseInsertSchema, type ExpenseInsert } from '@/entities/expense/schema'
import { createExpense, updateExpense } from './actions'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useToast } from '@/shared/ui/toast'
import { createClient } from '@/shared/lib/supabase/client'
import { convertAmount } from '@/entities/exchange-rate/service'
import { calculateVAT, DEFAULT_VAT_RATE } from '@/shared/lib/vat'

const CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']
const BASE_CURRENCY = 'USD'

interface ExpenseFormProps {
  expense?: any
  onSuccess: () => void
  onCancel: () => void
}

export function ExpenseForm({ expense, onSuccess, onCancel }: ExpenseFormProps) {
  const [categories, setCategories] = useState<any[]>([])
  const [rates, setRates] = useState<Record<string, number>>({})
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null)
  const [vatResult, setVatResult] = useState<{ tax: number; total: number } | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const supabase = createClient()

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
      amount_cents: expense.amount_cents,
      currency: expense.currency,
      category_id: expense.category_id,
      date: expense.date.split('T')[0],
      notes: expense.notes || '',
      tax_applicable: expense.tax_applicable,
      is_taxable: expense.is_taxable || false,
    } : {
      currency: 'USD',
      date: new Date().toISOString().split('T')[0],
      tax_applicable: false,
      is_taxable: false,
    },
  })

  const watchedAmount = watch('amount_cents')
  const watchedCurrency = watch('currency')
  const watchedIsTaxable = watch('is_taxable')

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .order('name')
      
      if (data) {
        setCategories(data)
      }
    }

    const fetchRates = async () => {
      try {
        const response = await fetch(`/api/rates?base=${BASE_CURRENCY}`)
        if (response.ok) {
          const data = await response.json()
          setRates(data.rates)
        }
      } catch (error) {
        console.error('Error fetching rates:', error)
      }
    }

    fetchCategories()
    fetchRates()
  }, [])

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
        converted_amount_cents: convertedAmount,
        converted_currency: BASE_CURRENCY,
        exchange_rate_used: rates[data.currency] || 1,
        tax_rate_used: data.is_taxable ? DEFAULT_VAT_RATE : undefined,
        tax_amount_cents: vatResult?.tax,
      }

      if (isEditing) {
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
    } catch (error) {
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
            Date *
          </label>
          <Input
            id="date"
            type="date"
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