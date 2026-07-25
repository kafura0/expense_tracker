'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog'
import { ExpenseForm } from './expense-form'
import type { ExpenseWithCategory } from '@/entities/expense/types'
import { ReceiptText, Pencil } from 'lucide-react'

interface ExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense?: ExpenseWithCategory | null
}

export function ExpenseDialog({ open, onOpenChange, expense }: ExpenseDialogProps) {
  const isEditing = !!expense

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto backdrop-blur-xl">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {isEditing ? <Pencil className="h-5 w-5" /> : <ReceiptText className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-lg">
                {isEditing ? 'Edit Expense' : 'New Expense'}
              </DialogTitle>
              <DialogDescription className="text-sm mt-0">
                {isEditing ? 'Update the details of this expense.' : 'Record a new expense transaction.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="pt-2">
          <ExpenseForm
            expense={expense}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
