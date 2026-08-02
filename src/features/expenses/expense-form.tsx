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
import { convertAmount } from '@/entities/exchange-rate/utils'
import { calculateVAT, DEFAULT_VAT_RATE } from '@/shared/lib/vat'
import {
  DollarSign,
  Calendar,
  Tag,
  FileText,
  Percent,
  Save,
  X,
  AlertCircle,
  ArrowRightLeft,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'

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
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ExpenseInsert>({
    resolver: zodResolver(expenseInsertSchema),
    defaultValues: expense ? {
      amount_cents: expense.amount_cents ?? 0,
      entry_type: expense.entry_type ?? 'expense',
      currency: expense.currency ?? 'USD',
      category_id: expense.category_id ?? null,
      date: expense.date ? String(expense.date).slice(0, 16) : new Date().toISOString().slice(0, 16),
      notes: expense.notes ?? '',
      tax_applicable: expense.tax_applicable ?? false,
      is_taxable: expense.is_taxable ?? false,
    } : {
      entry_type: 'expense',
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
  const watchedType = watch('entry_type') || 'expense'
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
        date: new Date(data.date).toISOString(),
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-2 gap-1 p-1 bg-muted/50 rounded-xl border border-border">
        {(['expense', 'income'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setValue('entry_type', type, { shouldDirty: true })}
            className={`rounded-lg py-2 text-sm font-medium capitalize transition-all ${
              watchedType === type
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="amount_cents" className="text-sm font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            Amount (cents)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground pointer-events-none">
              $
            </span>
            <Input
              id="amount_cents"
              type="number"
              {...register('amount_cents', { valueAsNumber: true })}
              placeholder="0"
              error={!!errors.amount_cents}
              className={cn("pl-7", errors.amount_cents && "border-destructive focus-visible:ring-destructive/50")}
            />
          </div>
          {errors.amount_cents && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.amount_cents.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="currency" className="text-sm font-semibold text-foreground">
            Currency
          </label>
          <div className="relative">
            <select
              id="currency"
              {...register('currency')}
              className="flex h-10 w-full rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm text-foreground transition-all duration-200 hover:border-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring appearance-none"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {convertedAmount !== null && watchedCurrency !== BASE_CURRENCY && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ArrowRightLeft className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-foreground">
              Converted: <span className="font-bold text-primary">
                ${(convertedAmount / 100).toFixed(2)} {BASE_CURRENCY}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rate: 1 {watchedCurrency} = {rates[watchedCurrency]?.toFixed(4)} {BASE_CURRENCY}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="category_id" className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            Category
          </label>
          <div className="relative">
            <select
              id="category_id"
              {...register('category_id')}
              className="flex h-10 w-full rounded-lg border border-input bg-muted/50 px-3 py-2 text-sm text-foreground transition-all duration-200 hover:border-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring appearance-none"
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="date" className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            Date & Time
          </label>
          <Input
            id="date"
            type="datetime-local"
            {...register('date')}
            error={!!errors.date}
            className={cn(errors.date && "border-destructive focus-visible:ring-destructive/50")}
          />
          {errors.date && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.date.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          Notes
        </label>
        <textarea
          id="notes"
          {...register('notes')}
          placeholder="Add any notes about this expense..."
          rows={3}
          className="flex w-full rounded-lg border border-input bg-muted/50 px-3 py-2.5 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground hover:border-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring resize-none"
        />
      </div>

      {watchedType === 'expense' && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border">
          <input
            type="checkbox"
            id="is_taxable"
            {...register('is_taxable')}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50 cursor-pointer"
          />
          <label htmlFor="is_taxable" className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-2">
            <Percent className="h-3.5 w-3.5 text-muted-foreground" />
            Tax applicable (VAT {DEFAULT_VAT_RATE}%)
          </label>
        </div>
      )}

      {vatResult && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
            <Percent className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-foreground">
              Tax ({DEFAULT_VAT_RATE}%):{' '}
              <span className="font-bold text-amber-600">
                ${(vatResult.tax / 100).toFixed(2)}
              </span>
            </p>
            <p className="text-sm text-foreground">
              Total with tax:{' '}
              <span className="font-bold text-foreground">
                ${(vatResult.total / 100).toFixed(2)}
              </span>
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4" />
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} loading={isSubmitting}>
          <Save className="h-4 w-4" />
          {isEditing ? `Update ${watchedType}` : `Create ${watchedType}`}
        </Button>
      </div>
    </form>
  )
}
