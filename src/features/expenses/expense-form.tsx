'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { expenseFormSchema, type ExpenseInsert } from '@/entities/expense/schema'
import type { ExpenseWithCategory } from '@/entities/expense/types'
import { createExpense, updateExpense } from './actions'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { useToast } from '@/shared/ui/toast'
import { createClient } from '@/shared/lib/supabase/client'
import { useDashboardScope, applyCategoryScope } from '@/features/dashboard/scope'
import { toLocalDateTimeLocal } from '@/shared/lib/datetime'
import { currencySymbol } from '@/shared/lib/currency'
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

interface ExpenseFormProps {
  expense?: ExpenseWithCategory | null
  onSuccess: () => void
  onCancel: () => void
}

const CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']
const BASE_CURRENCY = 'USD'
const EXISTING_CATEGORY_VALUE = '__existing'

interface CategoryOption {
  id: string
  name: string
  icon: string | null
  color: string | null
}

export function ExpenseForm({ expense, onSuccess, onCancel }: ExpenseFormProps) {
  const [categoryId, setCategoryId] = useState<string | null>(expense?.category_id ?? null)
  const [rates, setRates] = useState<Record<string, number>>({})
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null)
  const [vatResult, setVatResult] = useState<{ tax: number; total: number } | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { scope } = useDashboardScope()

  // Effective values (AD-8): personal override → org default → fallback.
  const effectiveCurrency = scope?.baseCurrency || BASE_CURRENCY
  const effectiveVatRate = scope?.vatRate ?? DEFAULT_VAT_RATE

  const isEditing = !!expense

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ExpenseInsert>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: expense ? {
      amount_cents: expense.amount_cents ?? 0,
      entry_type: expense.entry_type ?? 'expense',
      currency: expense.currency ?? 'USD',
      category_id: expense.category_id ?? null,
      date: expense.date ? toLocalDateTimeLocal(expense.date) : toLocalDateTimeLocal(new Date()),
      notes: expense.notes ?? '',
      tax_applicable: expense.tax_applicable ?? false,
      is_taxable: expense.is_taxable ?? false,
    } : {
      entry_type: 'expense',
      currency: effectiveCurrency as ExpenseInsert['currency'],
      date: toLocalDateTimeLocal(new Date()),
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

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories', scope?.orgId, scope?.persona, scope?.userId],
    queryFn: async () => {
      if (!scope) throw new Error('No scope resolved')
      let query = supabase.from('categories').select('id, name, icon, color')
      query = applyCategoryScope(query, scope)
      const { data, error } = await query.order('name')
      if (error) throw error
      return (data ?? []) as CategoryOption[]
    },
    enabled: !!scope,
  })

  const editingCategoryMissing =
    isEditing && !!expense?.category_id && !categories?.some((c) => c.id === expense.category_id)
  const selectedCategory = categories?.find((c) => c.id === categoryId)

  const handleTypeChange = (type: 'expense' | 'income') => {
    setValue('entry_type', type, { shouldDirty: true })
  }

  const handleCategoryChange = (value: string) => {
    if (value === EXISTING_CATEGORY_VALUE) {
      setCategoryId(expense?.category_id ?? null)
    } else {
      setCategoryId(value || null)
    }
  }

  const fetchRates = useCallback(async () => {
    try {
      const response = await fetch(`/api/rates?base=${effectiveCurrency}`)
      if (response.ok) {
        const data = await response.json()
        setRates(data.rates)
      }
    } catch (error) {
      console.error('Error fetching rates:', error)
    }
  }, [effectiveCurrency])

  useEffect(() => {
    fetchRates()
  }, [fetchRates])

  useEffect(() => {
    if (watchedAmount && watchedCurrency) {
      const converted = convertAmount(watchedAmount, watchedCurrency, effectiveCurrency, rates)
      setConvertedAmount(converted !== null ? Math.round(converted) : null)
    } else {
      setConvertedAmount(null)
    }
  }, [watchedAmount, watchedCurrency, rates, effectiveCurrency])

  useEffect(() => {
    if (watchedAmount && watchedIsTaxable) {
      const result = calculateVAT(watchedAmount, effectiveVatRate)
      setVatResult(result)
    } else {
      setVatResult(null)
    }
  }, [watchedAmount, watchedIsTaxable, effectiveVatRate])

  const onSubmit = async (data: ExpenseInsert) => {
    try {
      const needsConversion = data.currency !== effectiveCurrency
      const rate = rates[data.currency]

      // Never store a silently 1:1 converted amount — require a real rate.
      if (needsConversion && rate === undefined) {
        toast(`Exchange rate for ${data.currency} is unavailable. Try again shortly.`, 'error')
        return
      }

      const submissionData = {
        ...data,
        category_id: categoryId,
        date: new Date(data.date).toISOString(),
        converted_amount_cents: needsConversion ? convertedAmount : undefined,
        converted_currency: effectiveCurrency,
        exchange_rate_used: needsConversion ? rate : undefined,
        tax_rate_used: data.is_taxable ? effectiveVatRate : undefined,
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
            onClick={() => handleTypeChange(type)}
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
              {currencySymbol(watchedCurrency)}
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
          <Controller
            name="currency"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="currency" aria-label="Currency" className="w-full bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {convertedAmount !== null && watchedCurrency !== effectiveCurrency && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ArrowRightLeft className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-foreground">
              Converted: <span className="font-bold text-primary">
                {currencySymbol(effectiveCurrency)}{(convertedAmount / 100).toFixed(2)} {effectiveCurrency}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rate: 1 {watchedCurrency} = {rates[watchedCurrency]?.toFixed(4)} {effectiveCurrency}
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
          <Select
            value={editingCategoryMissing ? EXISTING_CATEGORY_VALUE : (categoryId ?? '')}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger id="category_id" aria-label="Category" className="w-full bg-muted/50">
              <SelectValue placeholder={categoriesLoading ? 'Loading categories…' : 'Select category'} />
            </SelectTrigger>
            <SelectContent>
              {(categories || []).map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
              {editingCategoryMissing && (
                <SelectItem value={EXISTING_CATEGORY_VALUE}>
                  {expense?.categories?.name || 'Existing category'}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {selectedCategory && (
            <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
              {selectedCategory.name}
            </p>
          )}
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
            Tax applicable (VAT {effectiveVatRate}%)
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
              Tax ({effectiveVatRate}%):{' '}
              <span className="font-bold text-amber-600">
                {currencySymbol(watchedCurrency)}{(vatResult.tax / 100).toFixed(2)}
              </span>
            </p>
            <p className="text-sm text-foreground">
              Total with tax:{' '}
              <span className="font-bold text-foreground">
                {currencySymbol(watchedCurrency)}{(vatResult.total / 100).toFixed(2)}
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
