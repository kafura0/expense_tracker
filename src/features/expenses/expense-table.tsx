'use client'

import { useState, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Skeleton } from '@/shared/ui/skeleton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/ui/dialog'
import { MoreHorizontal, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Trash2, Copy, Pencil, Receipt, ReceiptText } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/shared/lib/utils'
import type { ExpenseWithCategory } from '@/entities/expense/types'

interface ExpenseTableProps {
  data: ExpenseWithCategory[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortField: 'date' | 'amount_cents'
  sortDirection: 'asc' | 'desc'
  onSort: (field: 'date' | 'amount_cents') => void
  onPageChange: (page: number) => void
  onEdit: (expense: ExpenseWithCategory) => void
  onDelete?: (id: string) => void
  onDuplicate?: (id: string) => void
}

function SortButton({
  field,
  currentField,
  currentDirection,
  onSort,
  children
}: {
  field: 'date' | 'amount_cents'
  currentField: 'date' | 'amount_cents'
  currentDirection: 'asc' | 'desc'
  onSort: (field: 'date' | 'amount_cents') => void
  children: React.ReactNode
}) {
  const isActive = currentField === field
  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
      {isActive ? (
        currentDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  )
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="w-[160px]"><Skeleton className="h-4 w-16" /></TableHead>
            <TableHead className="w-[130px]"><Skeleton className="h-4 w-14" /></TableHead>
            <TableHead className="w-[140px]"><Skeleton className="h-4 w-18" /></TableHead>
            <TableHead><Skeleton className="h-4 w-20" /></TableHead>
            <TableHead className="w-[80px]"><Skeleton className="h-4 w-10" /></TableHead>
            <TableHead className="w-[100px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i} className="border-border">
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-5 w-10 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-8 w-8 rounded-lg" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function ExpenseTable({
  data,
  total,
  page,
  pageSize,
  totalPages,
  sortField,
  sortDirection: _sortDirection,
  onSort,
  onPageChange,
  onEdit,
  onDelete,
  onDuplicate,
}: ExpenseTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseWithCategory | null>(null)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const formatAmount = (amountCents: number, currency: string) => {
    const amount = amountCents / 100
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  const handleDeleteClick = useCallback((expense: ExpenseWithCategory) => {
    setExpenseToDelete(expense)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(() => {
    if (expenseToDelete) {
      onDelete?.(expenseToDelete.id)
      setDeleteDialogOpen(false)
      setExpenseToDelete(null)
    }
  }, [expenseToDelete, onDelete])

  const startRow = ((page - 1) * pageSize) + 1
  const endRow = Math.min(page * pageSize, total)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-[160px] py-3">
                <SortButton field="date" currentField={sortField} currentDirection={_sortDirection} onSort={onSort}>
                  Date
                </SortButton>
              </TableHead>
              <TableHead className="w-[130px] py-3">
                <SortButton field="amount_cents" currentField={sortField} currentDirection={_sortDirection} onSort={onSort}>
                  Amount
                </SortButton>
              </TableHead>
              <TableHead className="w-[140px] py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Category
              </TableHead>
              <TableHead className="py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notes
              </TableHead>
              <TableHead className="w-[80px] py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tax
              </TableHead>
              <TableHead className="w-[100px] py-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
                      <ReceiptText className="h-8 w-8" />
                    </div>
                    <p className="text-base font-semibold text-foreground mb-1">No expenses found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your filters or add a new expense.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((expense, index) => (
                <TableRow
                  key={expense.id}
                  onMouseEnter={() => setHoveredRow(expense.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={cn(
                    "border-border transition-all duration-150",
                    index % 2 === 1 && "bg-muted/20",
                    hoveredRow === expense.id && "bg-accent/50 shadow-sm"
                  )}
                >
                  <TableCell className="py-3.5">
                    <span className="text-sm font-medium text-foreground">
                      {format(new Date(expense.date), 'MMM d, yyyy')}
                    </span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {format(new Date(expense.date), 'h:mm a')}
                    </span>
                  </TableCell>
                  <TableCell className="py-3.5 text-right">
                    <span className={cn(
                      "text-sm font-bold tabular-nums",
                      expense.amount_cents < 0 ? "text-emerald-500" : "text-foreground"
                    )}>
                      {formatAmount(expense.amount_cents, expense.currency)}
                    </span>
                  </TableCell>
                  <TableCell className="py-3.5">
                    {expense.categories ? (
                      <Badge
                        variant="secondary"
                        className="font-medium border"
                        style={{
                          backgroundColor: expense.categories.color ? `${expense.categories.color}15` : undefined,
                          borderColor: expense.categories.color ? `${expense.categories.color}30` : undefined,
                          color: expense.categories.color || undefined,
                        }}
                      >
                        {expense.categories.name}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Uncategorized</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3.5 max-w-[220px]">
                    <span className="text-sm text-muted-foreground truncate block">
                      {expense.notes || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="py-3.5">
                    {expense.tax_applicable ? (
                      <Badge variant="info" className="font-medium">
                        VAT
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="py-3.5">
                    <div className={cn(
                      "flex items-center gap-0.5 transition-opacity duration-150",
                      hoveredRow === expense.id ? "opacity-100" : "opacity-0"
                    )}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => onEdit(expense)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => onDuplicate?.(expense.id)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteClick(expense)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{startRow}</span> to{' '}
            <span className="font-medium text-foreground">{endRow}</span> of{' '}
            <span className="font-medium text-foreground">{total}</span> expenses
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => {
                if (totalPages <= 7) return true
                if (p === 1 || p === totalPages) return true
                if (Math.abs(p - page) <= 1) return true
                return false
              })
              .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                if (i > 0 && typeof arr[i - 1] === 'number' && p - (arr[i - 1] as number) > 1) {
                  acc.push('ellipsis')
                }
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === 'ellipsis' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground">...</span>
                ) : (
                  <Button
                    key={p}
                    variant={p === page ? 'default' : 'ghost'}
                    size="icon"
                    className={cn("h-8 w-8 text-sm", p === page && "shadow-sm")}
                    onClick={() => onPageChange(p as number)}
                  >
                    {p}
                  </Button>
                )
              )}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The expense will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          {expenseToDelete && (
            <div className="py-4">
              <div className="flex justify-between items-center p-4 bg-muted/50 rounded-xl border border-border">
                <div>
                  <p className="font-semibold text-foreground">
                    {format(new Date(expenseToDelete.date), 'MMM d, yyyy')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {expenseToDelete.categories?.name || 'Uncategorized'}
                  </p>
                </div>
                <p className="font-bold text-foreground text-lg">
                  {formatAmount(expenseToDelete.amount_cents, expenseToDelete.currency)}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { TableSkeleton }
