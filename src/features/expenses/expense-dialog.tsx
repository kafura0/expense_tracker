'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { ExpenseForm } from './expense-form'

interface ExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense?: any
}

export function ExpenseDialog({ open, onOpenChange, expense }: ExpenseDialogProps) {
  const isEditing = !!expense

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Expense' : 'Add Expense'}
          </DialogTitle>
        </DialogHeader>
        <ExpenseForm
          expense={expense}
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}