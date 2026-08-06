'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Skeleton } from '@/shared/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { useToast } from '@/shared/ui/toast'
import { listRecurring, updateRecurring, deleteRecurring } from './actions'
import type { RecurringWithCategory } from '@/entities/recurring/types'
import type { DashboardScope } from '@/features/dashboard/scope'
import { RecurringDialog } from './recurring-dialog'
import { Repeat, Plus, Pencil, Pause, Play, Trash2, CalendarClock } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/shared/lib/utils'

interface RecurringSectionProps {
  scope: DashboardScope
}

function formatAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amountCents / 100)
}

export function RecurringSection({ scope }: RecurringSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringWithCategory | null>(null)
  const [toDelete, setToDelete] = useState<RecurringWithCategory | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['recurring', scope.orgId ?? scope.userId, scope.persona],
    queryFn: listRecurring,
    enabled: scope !== null,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['recurring'] })
  }

  const handleAdd = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const handleEdit = (recurring: RecurringWithCategory) => {
    setEditing(recurring)
    setDialogOpen(true)
  }

  const handleToggle = async (recurring: RecurringWithCategory) => {
    const result = await updateRecurring(recurring.id, { is_active: !recurring.is_active })
    if (result.error) {
      toast(result.error, 'error')
      return
    }
    toast(recurring.is_active ? 'Recurring expense paused' : 'Recurring expense resumed', 'success')
    invalidate()
  }

  const handleDeleteConfirm = async () => {
    if (!toDelete) return
    const result = await deleteRecurring(toDelete.id)
    if (result.error) {
      toast(result.error, 'error')
      setToDelete(null)
      return
    }
    toast('Recurring expense deleted', 'default')
    invalidate()
    setToDelete(null)
  }

  const recurring = data?.data ?? []

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Repeat className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="font-headline text-sm font-semibold text-foreground">
              Recurring expenses
            </h2>
            <p className="text-xs text-muted-foreground">
              Auto-recorded each period · {recurring.filter((r) => r.is_active).length} active
            </p>
          </div>
        </div>
        <Button size="sm" onClick={handleAdd} className="shadow-sm">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        ) : recurring.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
              <CalendarClock className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-0.5">
              No recurring expenses yet
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Automate rent, subscriptions, and salaries.
            </p>
            <Button size="sm" variant="outline" onClick={handleAdd}>
              <Plus className="h-3.5 w-3.5" />
              Create one
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {recurring.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {item.description}
                    </span>
                    <Badge
                      variant={item.entry_type === 'income' ? 'success' : 'secondary'}
                      className="capitalize"
                    >
                      {item.entry_type}
                    </Badge>
                    <Badge
                      variant={item.is_active ? 'default' : 'outline'}
                      className={cn(!item.is_active && 'text-muted-foreground')}
                    >
                      {item.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <span className="font-medium text-foreground">
                      {formatAmount(item.amount_cents, item.currency)}
                    </span>
                    · {item.frequency}
                    {item.categories ? ` · ${item.categories.name}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="hidden sm:inline text-xs text-muted-foreground mr-1">
                    Next: {format(new Date(`${item.next_due_date}T00:00:00`), 'MMM d')}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleToggle(item)}
                        aria-label={item.is_active ? 'Pause' : 'Resume'}
                      >
                        {item.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{item.is_active ? 'Pause' : 'Resume'}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleEdit(item)}
                        aria-label={`Edit ${item.description}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setToDelete(item)}
                        aria-label={`Delete ${item.description}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <RecurringDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        recurring={editing}
      />

      <Dialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Recurring Expense</DialogTitle>
            <DialogDescription>
              This removes the pattern only. Expenses already recorded are kept.
            </DialogDescription>
          </DialogHeader>
          {toDelete && (
            <div className="py-2">
              <p className="text-sm font-semibold text-foreground">{toDelete.description}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {formatAmount(toDelete.amount_cents, toDelete.currency)} · {toDelete.frequency}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
