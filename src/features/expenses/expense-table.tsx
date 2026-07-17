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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/ui/dialog'
import { MoreHorizontal, ArrowUpDown, ChevronLeft, ChevronRight, Trash2, Copy, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/shared/lib/utils'

interface Expense {
  id: string
  amount_cents: number
  currency: string
  date: string
  notes: string | null
  tax_applicable: boolean
  categories: {
    id: string
    name: string
    icon: string | null
    color: string | null
  } | null
}

interface ExpenseTableProps {
  data: Expense[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  sortField: 'date' | 'amount_cents'
  sortDirection: 'asc' | 'desc'
  onSort: (field: 'date' | 'amount_cents') => void
  onPageChange: (page: number) => void
  onEdit: (expense: Expense) => void
  onDelete?: (id: string) => void
  onDuplicate?: (id: string) => void
}

export function ExpenseTable({
  data,
  total,
  page,
  pageSize,
  totalPages,
  sortField,
  sortDirection,
  onSort,
  onPageChange,
  onEdit,
  onDelete,
  onDuplicate,
}: ExpenseTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)

  const formatAmount = (amountCents: number, currency: string) => {
    const amount = amountCents / 100
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount)
  }

  const handleDeleteClick = useCallback((expense: Expense) => {
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

  const SortButton = ({ field, children }: { field: 'date' | 'amount_cents'; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      onClick={() => onSort(field)}
      className="h-8 px-2 lg:px-3 text-on-surface-variant hover:text-on-surface"
    >
      {children}
      <ArrowUpDown className={cn(
        "ml-2 h-4 w-4",
        sortField === field ? "opacity-100" : "opacity-50"
      )} />
    </Button>
  )

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-on-surface-variant">No expenses found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-outline-variant bg-surface-container overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-outline-variant">
              <TableHead className="text-on-surface-variant">
                <SortButton field="date">Date</SortButton>
              </TableHead>
              <TableHead className="text-on-surface-variant">
                <SortButton field="amount_cents">Amount</SortButton>
              </TableHead>
              <TableHead className="text-on-surface-variant">Category</TableHead>
              <TableHead className="text-on-surface-variant">Notes</TableHead>
              <TableHead className="text-on-surface-variant">Tax</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((expense) => (
              <TableRow key={expense.id} className="border-outline-variant hover:bg-surface-variant transition-colors">
                <TableCell className="font-medium text-on-surface">
                  {format(new Date(expense.date), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="font-medium text-on-surface">
                  {formatAmount(expense.amount_cents, expense.currency)}
                </TableCell>
                <TableCell>
                  {expense.categories ? (
                    <Badge variant="secondary" className="bg-primary-container/20 text-primary">
                      {expense.categories.name}
                    </Badge>
                  ) : (
                    <span className="text-on-surface-variant">Uncategorized</span>
                  )}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-on-surface-variant">
                  {expense.notes || '-'}
                </TableCell>
                <TableCell>
                  {expense.tax_applicable ? (
                    <Badge variant="outline" className="text-primary border-primary/30">
                      VAT
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0 text-on-surface-variant hover:text-on-surface">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-surface-container border-outline-variant">
                      <DropdownMenuItem 
                        onClick={() => onEdit(expense)}
                        className="text-on-surface hover:bg-surface-variant cursor-pointer"
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDuplicate?.(expense.id)}
                        className="text-on-surface hover:bg-surface-variant cursor-pointer"
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteClick(expense)}
                        className="text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-on-surface-variant">
          Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} expenses
        </p>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="border-outline-variant text-on-surface hover:bg-surface-variant"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-on-surface">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="border-outline-variant text-on-surface hover:bg-surface-variant"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-surface-container border-outline-variant">
          <DialogHeader>
            <DialogTitle className="text-on-surface">Delete Expense</DialogTitle>
            <DialogDescription className="text-on-surface-variant">
              Are you sure you want to delete this expense? You can undo this action within 30 seconds.
            </DialogDescription>
          </DialogHeader>
          {expenseToDelete && (
            <div className="py-4">
              <div className="flex justify-between items-center p-3 bg-surface-variant rounded-lg">
                <div>
                  <p className="font-medium text-on-surface">
                    {format(new Date(expenseToDelete.date), 'MMM d, yyyy')}
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    {expenseToDelete.categories?.name || 'Uncategorized'}
                  </p>
                </div>
                <p className="font-bold text-on-surface">
                  {formatAmount(expenseToDelete.amount_cents, expenseToDelete.currency)}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              className="border-outline-variant text-on-surface hover:bg-surface-variant"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}