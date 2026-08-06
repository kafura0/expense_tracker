'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/shared/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { EmptyState } from '@/shared/ui/empty-state'
import { Skeleton } from '@/shared/ui/skeleton'
import { Input } from '@/shared/ui/input'
import { useToast } from '@/shared/ui/toast'
import { useDashboardScope, applyCategoryScope, applyBudgetScope, applyExpenseScope } from '@/features/dashboard/scope'
import { fetchBaseRates } from '@/entities/exchange-rate/base-rates'
import { getCategoryIcon } from '@/shared/lib/category-icons'
import { formatMoney } from '@/shared/lib/currency'
import { saveBudget, removeBudget } from '@/features/budgets/actions'
import { Plus, Tag, Save } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface CategoryRow {
  id: string
  name: string
  icon: string | null
  color: string | null
  budget_id: string | null
  budget_cents: number
  spent_cents: number
}

const ICON_CHOICES = [
  'briefcase', 'plane', 'utensils', 'monitor', 'megaphone', 'shopping-bag',
  'home', 'car', 'zap', 'heart', 'book', 'coffee', 'wifi', 'shirt',
  'user', 'music', 'gym', 'medical', 'delivery', 'misc',
]

const COLOR_CHOICES = [
  '#34d399', '#818cf8', '#f472b6', '#f59e0b', '#38bdf8',
  '#a78bfa', '#fb7185', '#facc15', '#2dd4bf', '#94a3b8',
]

export default function CategoriesPage() {
  const { scope, loading: scopeLoading } = useDashboardScope()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [budgetInputs, setBudgetInputs] = useState<Record<string, string>>({})
  const [addOpen, setAddOpen] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [addName, setAddName] = useState('')
  const [addIcon, setAddIcon] = useState(ICON_CHOICES[0])
  const [addColor, setAddColor] = useState(COLOR_CHOICES[0])

  const monthStart = useMemo(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }, [])

  const { data, error } = useQuery({
    queryKey: ['categories-with-budgets', scope?.orgId, scope?.persona, scope?.userId],
    queryFn: async () => {
      if (!scope) throw new Error('No scope resolved')

      let catQuery = supabase.from('categories').select('id, name, icon, color')
      catQuery = applyCategoryScope(catQuery, scope)
      const { data: categories, error: catError } = await catQuery.order('name')
      if (catError) throw catError

      let budgetQuery = supabase.from('budgets').select('id, category_id, amount_cents')
      budgetQuery = applyBudgetScope(budgetQuery, scope)
      const { data: budgets, error: budgetError } = await budgetQuery
      if (budgetError) throw budgetError

      let expQuery = supabase
        .from('expenses')
        .select('category_id, amount_cents, currency')
        .eq('is_deleted', false)
        .eq('entry_type', 'expense')
        .gte('date', monthStart)
      expQuery = applyExpenseScope(expQuery, scope)
      const { data: expenses, error: expError } = await expQuery
      if (expError) throw expError

      const rates = await fetchBaseRates(supabase, scope.baseCurrency)

      const budgetByCat = new Map<string, { id: string; amount_cents: number }>()
      for (const b of budgets || []) budgetByCat.set(b.category_id, { id: b.id, amount_cents: b.amount_cents })

      const spentByCat = new Map<string, number>()
      for (const e of expenses || []) {
        if (!e.category_id) continue
        const converted = e.currency === scope.baseCurrency
          ? e.amount_cents
          : (rates[e.currency] ? Math.round(e.amount_cents / rates[e.currency]) : 0)
        spentByCat.set(e.category_id, (spentByCat.get(e.category_id) || 0) + converted)
      }

      return (categories || []).map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        budget_id: budgetByCat.get(c.id)?.id ?? null,
        budget_cents: budgetByCat.get(c.id)?.amount_cents ?? 0,
        spent_cents: spentByCat.get(c.id) || 0,
      })) as CategoryRow[]
    },
    enabled: !!scope,
  })

  const budgetScope = scope && scope.persona === 'solo' ? 'user' : 'org'

  const totalBudget = useMemo(() => (data || []).reduce((a, c) => a + c.budget_cents, 0), [data])
  const totalSpent = useMemo(() => (data || []).reduce((a, c) => a + c.spent_cents, 0), [data])

  const canManageCategories = true

  const inputValue = (cat: CategoryRow) =>
    budgetInputs[cat.id] ?? (cat.budget_cents > 0 ? String(cat.budget_cents / 100) : '')

  const handleSaveBudget = async (cat: CategoryRow) => {
    if (!scope) return
    setSavingId(cat.id)
    const raw = parseFloat(budgetInputs[cat.id] ?? '')
    const cents = Number.isFinite(raw) && raw > 0 ? Math.round(raw * 100) : 0

    if (cat.budget_cents > 0 && cents === 0) {
      if (cat.budget_id) await removeBudget(cat.budget_id)
    } else {
      const result = await saveBudget({
        scope: budgetScope,
        category_id: cat.id,
        amount_cents: cents,
      })
      if (result.error) {
        toast(result.error, 'error')
        setSavingId(null)
        return
      }
    }

    setBudgetInputs((prev) => {
      const next = { ...prev }
      delete next[cat.id]
      return next
    })
    queryClient.invalidateQueries({ queryKey: ['categories-with-budgets'] })
    toast(cents === 0 ? 'Budget cleared' : 'Budget saved', 'success')
    setSavingId(null)
  }

  const handleAddCategory = async () => {
    if (!scope || !addName.trim()) return
    const { error } = await supabase.from('categories').insert({
      name: addName.trim(),
      icon: addIcon,
      color: addColor,
      user_id: scope.userId,
      org_id: scope.orgId,
    })
    if (error) {
      toast(error.message, 'error')
      return
    }
    setAddName('')
    setAddOpen(false)
    queryClient.invalidateQueries({ queryKey: ['categories-with-budgets'] })
    toast('Category created', 'success')
  }

  if (scopeLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !scope) {
    return (
      <div className="space-y-6">
        <h1 className="font-headline text-3xl font-bold tracking-tight">Categories</h1>
        <EmptyState
          icon={<Tag className="h-8 w-8" />}
          title="Could not load categories"
          description={error ? (error as Error).message : 'Sign in to view categories.'}
        />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight">Categories</h1>
            <p className="text-muted-foreground">Manage your spending categories</p>
          </div>
        </div>
        <EmptyState
          icon={<Tag className="h-8 w-8" />}
          title="No categories yet"
          description="Create your first category to start tracking your budget by spending area."
          action={canManageCategories ? { label: 'Add Category', onClick: () => setAddOpen(true) } : undefined}
        />
        {canManageCategories && <AddCategoryModal
          open={addOpen}
          onOpenChange={setAddOpen}
          name={addName}
          setName={setAddName}
          icon={addIcon}
          setIcon={setAddIcon}
          color={addColor}
          setColor={setAddColor}
          onSubmit={handleAddCategory}
        />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">Manage your spending categories and budgets</p>
        </div>
        {canManageCategories && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{formatMoney(totalBudget, scope.baseCurrency)}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Spent This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-500 tabular-nums">{formatMoney(totalSpent, scope.baseCurrency)}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold tabular-nums ${totalBudget - totalSpent < 0 ? 'text-destructive' : 'text-amber-500'}`}>
              {formatMoney(totalBudget - totalSpent, scope.baseCurrency)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((category) => {
          const Icon: LucideIcon = getCategoryIcon(category.icon)
          const percentage = category.budget_cents > 0
            ? Math.min((category.spent_cents / category.budget_cents) * 100, 100)
            : category.spent_cents > 0 ? 100 : 0
          const isOverBudget = category.budget_cents > 0 && category.spent_cents > category.budget_cents
          const isAtBudget = category.budget_cents > 0 && category.spent_cents === category.budget_cents

          return (
            <Card key={category.id} className="group transition-all duration-200 hover:shadow-md hover:shadow-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50"
                      style={category.color ? { color: category.color } : undefined}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{category.name}</CardTitle>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatMoney(category.spent_cents, scope.baseCurrency)} of {formatMoney(category.budget_cents, scope.baseCurrency)}
                      </p>
                    </div>
                  </div>
                  {isOverBudget ? (
                    <Badge variant="destructive">Over</Badge>
                  ) : isAtBudget ? (
                    <Badge variant="warning">At Limit</Badge>
                  ) : category.budget_cents > 0 && percentage > 80 ? (
                    <Badge variant="warning">Close</Badge>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOverBudget
                          ? 'bg-destructive'
                          : isAtBudget
                            ? 'bg-amber-500'
                            : percentage > 80
                              ? 'bg-orange-500'
                              : 'bg-primary'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-right text-xs text-muted-foreground tabular-nums">
                    {category.budget_cents > 0 ? `${percentage.toFixed(0)}% used` : 'No budget set'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={inputValue(category)}
                      onChange={(e) => setBudgetInputs((prev) => ({ ...prev, [category.id]: e.target.value }))}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant={category.budget_cents > 0 ? 'outline' : 'default'}
                    onClick={() => handleSaveBudget(category)}
                    disabled={savingId === category.id}
                  >
                    {savingId === category.id ? (
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : category.budget_cents > 0 ? (
                      <Save className="h-4 w-4" />
                    ) : (
                      'Set'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <AddCategoryModal
        open={addOpen}
        onOpenChange={setAddOpen}
        name={addName}
        setName={setAddName}
        icon={addIcon}
        setIcon={setAddIcon}
        color={addColor}
        setColor={setAddColor}
        onSubmit={handleAddCategory}
      />
    </div>
  )
}

function AddCategoryModal({
  open,
  onOpenChange,
  name,
  setName,
  icon,
  setIcon,
  color,
  setColor,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  setName: (v: string) => void
  icon: string
  setIcon: (v: string) => void
  color: string
  setColor: (v: string) => void
  onSubmit: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h2 className="font-headline text-lg font-bold">Add Category</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Name</label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Groceries"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void onSubmit()
              }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Icon</label>
            <div className="grid grid-cols-5 gap-2">
              {ICON_CHOICES.map((name) => {
                const Icon = getCategoryIcon(name)
                const active = icon === name
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setIcon(name)}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all ${
                      active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/40 text-muted-foreground hover:border-muted-foreground/50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_CHOICES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-10 w-10 rounded-full border-2 transition-all ${color === c ? 'scale-110 border-foreground' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void onSubmit()} disabled={!name.trim()}>Create</Button>
        </div>
      </div>
    </div>
  )
}
