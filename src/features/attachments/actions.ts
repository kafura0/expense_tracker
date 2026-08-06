'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { createClient } from '@/shared/lib/supabase/server'
import { logAuditEvent } from '@/shared/lib/audit-logger'
import type { ExpenseAttachment, ExpenseAttachmentWithUrl } from '@/entities/attachment/types'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

/** Strip path separators and control characters so the value is safe in a storage key. */
function sanitizeFileName(name: string): string {
  const base = name.replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, '_')
  return base.slice(0, 80) || 'receipt'
}

export async function listAttachments(
  expenseId: string
): Promise<{ data: ExpenseAttachmentWithUrl[] | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data: rows, error } = await supabase
      .from('expense_attachments')
      .select('*')
      .eq('expense_id', expenseId)
      .order('created_at', { ascending: false })

    if (error) return { data: null, error: error.message }

    const withUrls = await Promise.all(
      (rows || []).map(async (row) => {
        const { data: signed } = await supabase.storage
          .from('receipts')
          .createSignedUrl(row.storage_path, 3600)
        return { ...row, url: signed?.signedUrl ?? '' } as ExpenseAttachmentWithUrl
      })
    )

    return { data: withUrls, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to load attachments' }
  }
}

export async function uploadReceipt(expenseId: string, file: File) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: null, error: 'Not authenticated' }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return { data: null, error: 'Only JPEG, PNG, and WebP images are allowed' }
    }
    if (file.size > MAX_BYTES) {
      return { data: null, error: 'File size must be less than 5MB' }
    }

    // Confirm the expense is visible to the caller (RLS enforces scope).
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('id, org_id, user_id, has_attachments')
      .eq('id', expenseId)
      .eq('is_deleted', false)
      .maybeSingle()
    if (expenseError) return { data: null, error: expenseError.message }
    if (!expense) return { data: null, error: 'Expense not found' }

    const path = `${user.id}/${expenseId}/${randomUUID()}-${sanitizeFileName(file.name)}`

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) return { data: null, error: uploadError.message }

    const { data, error: insertError } = await supabase
      .from('expense_attachments')
      .insert({
        expense_id: expenseId,
        user_id: user.id,
        org_id: expense.org_id,
        file_name: file.name,
        file_type: file.type,
        file_size_bytes: file.size,
        storage_path: path,
      })
      .select()
      .single()

    if (insertError) {
      await supabase.storage.from('receipts').remove([path]).catch(() => {})
      return { data: null, error: insertError.message }
    }

    if (!expense.has_attachments) {
      await supabase.from('expenses').update({ has_attachments: true }).eq('id', expenseId)
    }

    await logAuditEvent({
      action: 'attachment.upload',
      org_id: expense.org_id,
      entity_type: 'expense_attachment',
      entity_id: data.id,
      new_value: { file_name: file.name, file_size_bytes: file.size },
    })

    revalidatePath('/expenses')
    return { data: data as ExpenseAttachment, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to upload receipt' }
  }
}

export async function deleteAttachment(id: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()

    const { data: attachment, error: fetchError } = await supabase
      .from('expense_attachments')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (fetchError) return { error: fetchError.message }
    if (!attachment) return { error: 'Attachment not found' }

    const { error: removeError } = await supabase.storage
      .from('receipts')
      .remove([attachment.storage_path])
    if (removeError) return { error: removeError.message }

    const { error: deleteError } = await supabase
      .from('expense_attachments')
      .delete()
      .eq('id', id)
    if (deleteError) return { error: deleteError.message }

    // Clear the convenience flag when no attachments remain.
    const { count } = await supabase
      .from('expense_attachments')
      .select('id', { count: 'exact', head: true })
      .eq('expense_id', attachment.expense_id)
    if (count === 0) {
      await supabase
        .from('expenses')
        .update({ has_attachments: false })
        .eq('id', attachment.expense_id)
    }

    await logAuditEvent({
      action: 'attachment.delete',
      org_id: attachment.org_id,
      entity_type: 'expense_attachment',
      entity_id: attachment.id,
    })

    revalidatePath('/expenses')
    return { error: null }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to delete attachment' }
  }
}
