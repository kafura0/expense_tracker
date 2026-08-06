'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog'
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
import { RECURRING_FREQUENCIES } from '@/entities/recurring/schema'
import type { RecurringWithCategory } from '@/entities/recurring/types'
import { createRecurring, updateRecurring } from './actions'
import { Repeat, CalendarDays, Save, X, AlertCircle } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface RecurringDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recurring?: RecurringWithCategory | null
}

const CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']
const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

interface CategoryOption {
  id: string
  name: string
}

export function RecurringDialog({ open, onOpenChange, recurring }: RecurringDialogProps) {
  const isEditing = !!recurring
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const supabase = createClient()
  const { scope } = useDashboardScope()

  const [description, setDescription] = useState('')
  const [entryType, setEntryType] = useState<'expense' | 'income'>('expense')
  const [amountCents, setAmountCents] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [categoryId, setCategoryId] = useState('')
  const [frequency, setFrequency] = useState('monthly')
  const [startDate, setStartDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const resetForm = () => {
    setDescription(recurring?.description ?? '')
    setEntryType(recurring?.entry_type ?? 'expense')
    setAmountCents(recurring ? String(recurring.amount_cents) : '')
    setCurrency(recurring?.currency ?? scope?.baseCurrency ?? 'USD')
    setCategoryId(recurring?.category_id ?? '')
    setFrequency(recurring?.frequency ?? 'monthly')
    setStartDate(recurring?.start_date ?? new Date().toISOString().slice(0, 10))
  }

  const { data: categories } = useQuery({
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

  const handleSubmit = async () => {
    const parsedAmount = Number(amountCents)
    if (!description.trim()) {
      toast('Please enter a description', 'error')
      return
    }
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      toast('Amount must be a whole number greater than 0', 'error')
      return
    }
    if (!startDate) {
      toast('Please choose a start date', 'error')
      return
    }

    setSubmitting(true)
    try {
      if (isEditing && recurring) {
        const result = await updateRecurring(recurring.id, {
          description: description.trim(),
          entry_type: entryType,
          amount_cents: parsedAmount,
          currency: currency as RecurringWithCategory['currency'],
          category_id: categoryId || null,
          frequency: frequency as RecurringWithCategory['frequency'],
        })
        if (result.error) {
          toast(result.error, 'error')
          return
        }
        toast('Recurring expense updated', 'success')
      } else {
        const result = await createRecurring({
          description: description.trim(),
          entry_type: entryType,
          amount_cents: parsedAmount,
          currency: currency as RecurringWithCategory['currency'],
          category_id: categoryId || null,
          frequency: frequency as RecurringWithCategory['frequency'],
          start_date: startDate,
        })
        if (result.error) {
          toast(result.error, 'error')
          return
        }
        toast('Recurring expense created', 'success')
      }
      queryClient.invalidateQueries({ queryKey: ['recurring'] })
      onOpenChange(false)
    } catch {
      toast('An error occurred', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) resetForm()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto backdrop-blur-xl">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Repeat className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {isEditing ? 'Edit Recurring Expense' : 'New Recurring Expense'}
              </DialogTitle>
              <DialogDescription className="text-sm mt-0">
                {isEditing
                  ? 'Update this recurring pattern.'
                  : 'Set a pattern and Ledgerly records it automatically each period.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <label htmlFor="recurring-description" className="text-sm font-semibold text-foreground">
              Description
            </label>
            <Input
              id="recurring-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Office rent, Netflix subscription"
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 bg-muted/50 rounded-xl border border-border">
            {(['expense', 'income'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setEntryType(type)}
                className={`rounded-lg py-2 text-sm font-medium capitalize transition-all ${
                  entryType === type
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
              <label htmlFor="recurring-amount" className="text-sm font-semibold text-foreground">
                Amount (cents)
              </label>
              <Input
                id="recurring-amount"
                type="number"
                min={1}
                value={amountCents}
                onChange={(e) => setAmountCents(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Currency
              </label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger aria-label="Currency" className="w-full bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Frequency
              </label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger aria-label="Frequency" className="w-full bg-muted/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRING_FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f}>
                      {FREQUENCY_LABELS[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="recurring-start" className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                {isEditing ? 'Start Date' : 'Start Date'}
              </label>
              <Input
                id="recurring-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Category
            </label>
            <Select
              value={categoryId}
              onValueChange={(v) => setCategoryId(v)}
            >
              <SelectTrigger aria-label="Category" className="w-full bg-muted/50">
                <SelectValue placeholder={categories?.length ? 'Select category (optional)' : 'Loading categories…'} />
              </SelectTrigger>
              <SelectContent>
                {(categories || []).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              Next due date is set from the start date and your frequency.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              loading={submitting}
              className={cn(entryType === 'income' && 'bg-emerald-500 hover:bg-emerald-600')}
            >
              <Save className="h-4 w-4" />
              {isEditing ? 'Save Changes' : 'Create Recurring'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
