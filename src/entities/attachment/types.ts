export interface ExpenseAttachment {
  id: string
  expense_id: string
  user_id: string
  org_id: string | null
  file_name: string
  file_type: string
  file_size_bytes: number
  storage_path: string
  created_at: string
}

export interface ExpenseAttachmentWithUrl extends ExpenseAttachment {
  url: string
}
