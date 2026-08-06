'use client'

import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { useToast } from '@/shared/ui/toast'
import { listAttachments, uploadReceipt, deleteAttachment } from './actions'
import type { ExpenseAttachmentWithUrl } from '@/entities/attachment/types'
import type { ExpenseWithCategory } from '@/entities/expense/types'
import { Paperclip, Upload, Trash2, ExternalLink, ImageIcon, FileText, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface AttachmentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: ExpenseWithCategory | null
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentsDialog({ open, onOpenChange, expense }: AttachmentsDialogProps) {
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const expenseId = expense?.id ?? ''

  const { data, isLoading } = useQuery({
    queryKey: ['attachments', expenseId],
    queryFn: () => listAttachments(expenseId),
    enabled: open && !!expenseId,
  })

  const attachments = data?.data ?? []

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['attachments', expenseId] })
    queryClient.invalidateQueries({ queryKey: ['expenses'] })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !expenseId) return

    setUploading(true)
    try {
      const result = await uploadReceipt(expenseId, file)
      if (result.error) {
        toast(result.error, 'error')
        return
      }
      toast('Receipt uploaded', 'success')
      invalidate()
    } catch {
      toast('Upload failed', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const result = await deleteAttachment(id)
    setDeletingId(null)
    if (result.error) {
      toast(result.error, 'error')
      return
    }
    toast('Receipt deleted', 'default')
    invalidate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto backdrop-blur-xl">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Paperclip className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Receipts</DialogTitle>
              <DialogDescription className="text-sm mt-0">
                {expense
                  ? `${formatAmount(expense.amount_cents, expense.currency)} · ${expense.notes || 'Expense'}`
                  : 'Attach receipts to this expense.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : attachments.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8 rounded-xl border border-dashed border-border">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
                <ImageIcon className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-0.5">No receipts yet</p>
              <p className="text-xs text-muted-foreground mb-3">
                Upload a photo of the receipt (JPEG, PNG, or WebP · max 5MB)
              </p>
              <Button
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload receipt
              </Button>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {attachments.map((attachment: ExpenseAttachmentWithUrl) => (
                  <li key={attachment.id} className="flex items-center gap-3 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                      {attachment.file_type.startsWith('image/') ? (
                        <ImageIcon className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {attachment.file_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(attachment.file_size_bytes)} · {format(new Date(attachment.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    {attachment.url && (
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        aria-label={`Open ${attachment.file_name}`}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(attachment.id)}
                      disabled={deletingId === attachment.id}
                      aria-label={`Delete ${attachment.file_name}`}
                    >
                      {deletingId === attachment.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? 'Uploading…' : 'Add another receipt'}
              </Button>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </DialogContent>
    </Dialog>
  )
}

function formatAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amountCents / 100)
}
