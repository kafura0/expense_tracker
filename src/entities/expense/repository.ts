import { createClient } from '@/shared/lib/supabase/server'
import { getActiveOrgId } from '@/shared/lib/org-context'
import { escapeLikePattern } from '@/shared/lib/like-escape'
import { assertCategoryBudget } from '@/entities/budget/enforcement'
import { assertMonthlyExpenseCap } from '@/entities/billing/enforcement'
import { expenseSchema, type Expense, type ExpenseInsert, type ExpenseUpdate } from './schema'
import type { ExpenseListParams, ExpenseListResponse } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function orgScopeFilter(query: any, orgId: string | null, userId: string) {
  if (orgId) {
    return query.eq('org_id', orgId)
  }
  return query.eq('user_id', userId).is('org_id', null)
}

/** Escapes ILIKE/LIKE metacharacters so user input cannot widen a match. */
// (delegated to the shared escapeLikePattern helper imported above)

async function getOrgId(): Promise<string | null> {
  const activeOrgId = await getActiveOrgId()
  if (activeOrgId) return activeOrgId

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .order('created_at')
    .limit(1)
    .maybeSingle()

  if (!membership) return null
  return membership.org_id
}

/**
 * Fetches a paginated, filtered list of expenses for the current user's active org.
 *
 * This function builds a dynamic Supabase query with optional filters, sorting,
 * and pagination. Every query is scoped to the current org via `eq('org_id', orgId)`.
 *
 * @param params - Optional filtering, sorting, and pagination parameters.
 *   Defaults to page 1, 20 items per page, sorted by date descending.
 *   - `filters.search` — full-text search across notes and title (case-insensitive)
 *   - `filters.category_id` — filter by specific category
 *   - `filters.currency` — filter by currency code
 *   - `filters.tax_applicable` — filter by tax applicability
 *   - `filters.date_from` / `filters.date_to` — date range filter
 * @returns Paginated list of expenses with total counts and metadata
 *
 * @security
 * The org_id filter is applied at the application level. Supabase RLS policies
 * on the expenses table provide a second layer of protection — even if the
 * org_id filter were removed, RLS would still prevent cross-org data leakage.
 *
 * @example
 * ```ts
 * const result = await findAllExpenses({
 *   filters: { category_id: 'some-uuid', search: 'lunch' },
 *   pagination: { page: 1, page_size: 10 },
 *   sort: { field: 'amount_cents', direction: 'desc' },
 * })
 * ```
 */
export async function findAllExpenses(params: ExpenseListParams = {}): Promise<ExpenseListResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const orgId = await getOrgId()
  const { filters = {}, pagination = { page: 1, page_size: 20 }, sort = { field: 'date', direction: 'desc' } } = params

  // Clamp pagination so hostile/errant inputs cannot break range math.
  const page = Math.max(1, Math.floor(pagination.page))
  const page_size = Math.max(1, Math.min(100, Math.floor(pagination.page_size)))

  let query = supabase
    .from('expenses')
    .select('*, categories(id, name, icon, color)', { count: 'exact' })
    .eq('is_deleted', false)

  query = orgScopeFilter(query, orgId, user.id)

  // Apply optional filters. Each filter is conditionally added — only when
  // the caller provides a value. This keeps the query clean for unfiltered calls.
  if (filters.search) {
    // Full-text search across notes and title using PostgREST's ilike operator.
    // The `%` wildcards enable substring matching (PostgreSQL ILIKE syntax).
    // Escape Postgres ILIKE metacharacters so user input like "100%" cannot
    // widen the match into "everything".
    const escaped = escapeLikePattern(filters.search)
    query = query.or(`notes.ilike.%${escaped}%,title.ilike.%${escaped}%`)
  }
  if (filters.entry_type) {
    query = query.eq('entry_type', filters.entry_type)
  }
  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id)
  }
  if (filters.currency) {
    query = query.eq('currency', filters.currency)
  }
  if (filters.tax_applicable !== undefined) {
    query = query.eq('tax_applicable', filters.tax_applicable)
  }
  if (filters.date_from) {
    // gte = greater than or equal — for "from" date, we want expenses on or after this date
    query = query.gte('date', filters.date_from)
  }
  if (filters.date_to) {
    // lte = less than or equal — for "to" date, we want expenses on or before this date
    query = query.lte('date', filters.date_to)
  }

  // Apply sort — ascending for oldest-first, descending for newest-first.
  // PostgREST supports ordering by any column name passed as a string.
  query = query.order(sort.field, { ascending: sort.direction === 'asc' })

  // Calculate offset-based pagination range.
  // PostgREST `range(from, to)` is inclusive on both ends (0-indexed).
  // Example: page 1, size 20 → range(0, 19); page 2, size 20 → range(20, 39)
  const from = (page - 1) * page_size
  const to = from + page_size - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) throw new Error(`Failed to fetch expenses: ${error.message}`)

  const total = count || 0
  const total_pages = Math.ceil(total / page_size)

  return {
    data: data || [],
    total,
    page,
    page_size,
    total_pages,
  }
}

/**
 * Fetches a single expense by ID, scoped to the current user's org.
 *
 * Returns null (not an error) when the expense is not found. This is intentional —
 * a missing expense could mean it doesn't exist, was soft-deleted, or belongs to
 * a different org. The caller should handle the null case gracefully.
 *
 * @param id - The UUID of the expense to fetch
 * @returns The expense with its category data, or null if not found/not accessible
 *
 * @security
 * The `.eq('org_id', orgId)` filter ensures this can only return expenses
 * belonging to the current user's org. Combined with RLS, even a direct
 * Supabase client call would be blocked from cross-org access.
 */
export async function findExpenseById(id: string): Promise<Expense | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const orgId = await getOrgId()

  let query = supabase
    .from('expenses')
    .select('*, categories(id, name, icon, color)')
    .eq('id', id)
    .eq('is_deleted', false)

  query = orgScopeFilter(query, orgId, user.id)

  const { data, error } = await query.single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to fetch expense: ${error.message}`)
  }

  return data
}

/**
 * Creates a new expense record for the current user's active org.
 *
 * Automatically sets `user_id` and `org_id` from the authenticated session
 * and active org context. These fields are NEVER taken from caller input —
 * this prevents a user from creating an expense in someone else's org or
 * impersonating another user.
 *
 * @param expense - The expense data (title, amount, category, date, etc.)
 *   The `user_id` and `org_id` fields will be overwritten regardless of input.
 * @returns The newly created expense, validated against the Zod schema
 * @throws {Error} If the user is not authenticated
 * @throws {Error} If the insert fails (RLS violation, constraint violation, etc.)
 *
 * @security
 * - user_id is derived from the authenticated session (supabase.auth.getUser())
 * - org_id is derived from the validated org context (getOrgId())
 * - RLS INSERT policy on expenses validates the user belongs to the org
 */
export async function createExpense(expense: ExpenseInsert): Promise<Expense> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const orgId = await getOrgId()

  // Enforce category budgets before persisting (throws BudgetExceededError).
  await assertCategoryBudget(supabase, {
    userId: user.id,
    orgId,
    categoryId: expense.category_id ?? null,
    amountCents: expense.amount_cents,
    currency: expense.currency,
    entryType: expense.entry_type ?? 'expense',
    date: new Date(expense.date).toISOString(),
    convertedAmountCents: expense.converted_amount_cents,
    convertedCurrency: expense.converted_currency,
  })

  // Enforce the plan's monthly expense cap before persisting (throws
  // ExpenseCapExceededError). Applies to orgs with a subscription only.
  await assertMonthlyExpenseCap(supabase, { orgId })

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      ...expense,
      user_id: user.id,
      org_id: orgId,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create expense: ${error.message}`)
  return expenseSchema.parse(data)
}

/**
 * Updates an existing expense record, scoped to the current user's org.
 *
 * Uses three WHERE conditions to ensure the update targets exactly one row:
 * - `id` — the specific expense
 * - `org_id` — belongs to the current user's org (prevents cross-org updates)
 * - `is_deleted = false` — cannot update soft-deleted expenses (must restore first)
 *
 * @param id - The UUID of the expense to update
 * @param expense - Partial expense data to update (only provided fields are changed)
 * @returns The updated expense, validated against the Zod schema
 * @throws {Error} If the update fails (not found, org mismatch, constraint violation, etc.)
 *
 * @security
 * The org_id filter ensures this can only update expenses in the current org.
 * Supabase RLS UPDATE policies provide a second layer of protection.
 * The `updated_at` timestamp is always set server-side to prevent caller manipulation.
 */
export async function updateExpense(id: string, expense: ExpenseUpdate): Promise<Expense> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const orgId = await getOrgId()

  // Load the current row so the budget guard can exclude it from the month's
  // spent total and use effective values for any fields not being changed.
  const existing = await findExpenseById(id)
  if (!existing) throw new Error('Expense not found')

  await assertCategoryBudget(supabase, {
    userId: user.id,
    orgId,
    categoryId: (expense.category_id ?? existing.category_id) ?? null,
    amountCents: expense.amount_cents ?? existing.amount_cents,
    currency: expense.currency ?? existing.currency,
    entryType: expense.entry_type ?? existing.entry_type,
    date: new Date(expense.date ?? existing.date).toISOString(),
    convertedAmountCents: expense.converted_amount_cents,
    convertedCurrency: expense.converted_currency,
    excludeExpenseId: id,
  })

  let query = supabase
    .from('expenses')
    .update({
      ...expense,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('is_deleted', false)

  query = orgScopeFilter(query, orgId, user.id)

  const { data, error } = await query.select().single()

  if (error) throw new Error(`Failed to update expense: ${error.message}`)
  return expenseSchema.parse(data)
}

/**
 * Soft-deletes an expense by setting `is_deleted = true` and recording the deletion timestamp.
 *
 * This is a SOFT delete — the row remains in the database with `is_deleted = true`.
 * This approach:
 * - Preserves data for audit trails and compliance
 * - Allows restoration via `restoreExpense()`
 * - Prevents accidental permanent data loss
 * - Filters out deleted rows at the query level (all other functions filter on `is_deleted = false`)
 *
 * @param id - The UUID of the expense to soft-delete
 * @throws {Error} If the update fails (not found, org mismatch, etc.)
 *
 * @security
 * Org-scoped via `.eq('org_id', orgId)`. RLS DELETE (or UPDATE) policies
 * on the expenses table provide a second layer of protection.
 */
export async function softDeleteExpense(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const orgId = await getOrgId()

  let query = supabase
    .from('expenses')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  query = orgScopeFilter(query, orgId, user.id)

  const { error } = await query

  if (error) throw new Error(`Failed to delete expense: ${error.message}`)
}

/**
 * Restores a soft-deleted expense by resetting `is_deleted = false`.
 *
 * Clears the `deleted_at` timestamp and updates `updated_at` to reflect
 * the restoration. The expense becomes visible again in all queries that
 * filter on `is_deleted = false`.
 *
 * @param id - The UUID of the expense to restore
 * @returns The restored expense, validated against the Zod schema
 * @throws {Error} If the restore fails (not found, org mismatch, etc.)
 *
 * @security
 * Org-scoped via `.eq('org_id', orgId)`. This function can only restore
 * expenses that belong to the current user's organization.
 */
export async function restoreExpense(id: string): Promise<Expense> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const orgId = await getOrgId()

  let query = supabase
    .from('expenses')
    .update({
      is_deleted: false,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  query = orgScopeFilter(query, orgId, user.id)

  const { data, error } = await query.select().single()

  if (error) throw new Error(`Failed to restore expense: ${error.message}`)
  return expenseSchema.parse(data)
}
