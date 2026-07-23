/**
 * @fileoverview Data access layer for the expenses entity with org-scoped isolation.
 *
 * This repository is the ONLY way application code accesses expense data.
 * Every function enforces organization-level data isolation through a two-layer
 * defense strategy:
 *
 * ## Layer 1: Application-level org scoping (this file)
 * Every query includes `.eq('org_id', orgId)` to scope results to the current
 * user's active organization. The orgId is resolved via `getOrgId()`, which
 * checks the active org context first, then falls back to the user's first
 * org membership.
 *
 * ## Layer 2: Database-level RLS (Supabase Row Level Security)
 * The `expenses` table has RLS policies that check `auth.uid()` and the
 * user's `org_members` row. Even if the application-level `.eq('org_id', orgId)`
 * were removed, the RLS policy would still prevent cross-org data access.
 *
 * ## Why both layers?
 * - Application-level scoping prevents accidental cross-org queries (bugs)
 * - RLS prevents malicious cross-org access (security)
 * - Neither alone is sufficient; together they form defense-in-depth
 *
 * ## Org ID resolution strategy
 * The `getOrgId()` helper uses a two-step resolution:
 * 1. Check the active org context (set by the client-side OrgProvider from the
 *    `ledgerly_active_org` cookie)
 * 2. Fall back to the user's first org membership (sorted by created_at)
 *
 * This ensures the repository works even if the org cookie is missing (e.g.,
 * server-side rendering, background jobs, or first visit before client hydration).
 *
 * @see {@link src/shared/lib/supabase/middleware.ts} for route-level org validation
 * @see {@link src/shared/lib/org-context.ts} for the active org context provider
 */
import { createClient } from '@/shared/lib/supabase/server'
import { getActiveOrgId } from '@/shared/lib/org-context'
import { expenseSchema, type Expense, type ExpenseInsert, type ExpenseUpdate } from './schema'
import type { ExpenseListParams, ExpenseListResponse } from './types'

/**
 * Resolves the current user's active organization ID.
 *
 * Uses a two-step resolution strategy with fallback:
 * 1. **Primary**: Reads the active org from the OrgContext (set by client-side
 *    OrgProvider based on the `ledgerly_active_org` cookie). This is the normal
 *    path for most requests.
 * 2. **Fallback**: Queries the `org_members` table for the user's first membership
 *    (ordered by created_at ascending). This handles edge cases where:
 *    - The org cookie hasn't been set yet (first visit, SSR)
 *    - The org cookie references a membership that was revoked
 *    - The cookie was cleared by the browser
 *
 * @throws {Error} If the user is not authenticated (no session found)
 * @throws {Error} If the user has no org memberships at all
 * @returns The UUID of the user's active organization
 *
 * @security
 * This function only returns org IDs that the user has a valid membership for.
 * The org_members table is itself protected by RLS — users can only see their
 * own memberships. A compromised request cannot specify an arbitrary org_id.
 */
async function getOrgId(): Promise<string> {
  // Step 1: Check the active org context (cookie-based, set by client)
  const activeOrgId = await getActiveOrgId()
  if (activeOrgId) return activeOrgId

  // Step 2: Fallback — query the database for the user's first org membership.
  // This is a defense-in-depth measure: if the cookie is missing or stale,
  // we still resolve to a valid org rather than failing.
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

  if (!membership) throw new Error('No organization membership found')
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
  const orgId = await getOrgId()
  const { filters = {}, pagination = { page: 1, page_size: 20 }, sort = { field: 'date', direction: 'desc' } } = params

  // Build the base query with org scoping and soft-delete filter.
  // `count: 'exact'` tells PostgREST to return the total row count
  // for pagination metadata (separate from the returned rows).
  let query = supabase
    .from('expenses')
    .select('*, categories(id, name, icon, color)', { count: 'exact' })
    .eq('is_deleted', false)
    .eq('org_id', orgId)

  // Apply optional filters. Each filter is conditionally added — only when
  // the caller provides a value. This keeps the query clean for unfiltered calls.
  if (filters.search) {
    // Full-text search across notes and title using PostgREST's ilike operator.
    // The `%` wildcards enable substring matching (PostgreSQL ILIKE syntax).
    query = query.or(`notes.ilike.%${filters.search}%,title.ilike.%${filters.search}%`)
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
  const from = (pagination.page - 1) * pagination.page_size
  const to = from + pagination.page_size - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) throw new Error(`Failed to fetch expenses: ${error.message}`)

  const total = count || 0
  const total_pages = Math.ceil(total / pagination.page_size)

  return {
    data: data || [],
    total,
    page: pagination.page,
    page_size: pagination.page_size,
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
  const orgId = await getOrgId()

  const { data, error } = await supabase
    .from('expenses')
    .select('*, categories(id, name, icon, color)')
    .eq('id', id)
    // Org scoping: ensures this expense belongs to the current user's org
    .eq('org_id', orgId)
    .eq('is_deleted', false)
    .single()

  if (error) {
    // PGRST116 = "Row not found" (PostgREST single() with no results).
    // We return null instead of throwing so callers can distinguish between
    // "not found" and actual database errors.
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

  // Spread the caller's data but override user_id and org_id.
  // This is a security pattern: never trust caller-supplied identity fields.
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
  // Validate the returned data against the Zod schema to ensure type safety
  // and catch any unexpected data shapes from the database
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
  const orgId = await getOrgId()

  const { data, error } = await supabase
    .from('expenses')
    .update({
      ...expense,
      // Always override updated_at to ensure accurate audit trail
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    // Org scoping: prevents updating expenses in other orgs
    .eq('org_id', orgId)
    // Soft-delete guard: cannot update a deleted expense
    .eq('is_deleted', false)
    .select()
    .single()

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
  const orgId = await getOrgId()

  const { error } = await supabase
    .from('expenses')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    // Org scoping: prevents deleting expenses in other orgs
    .eq('org_id', orgId)

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
  const orgId = await getOrgId()

  const { data, error } = await supabase
    .from('expenses')
    .update({
      is_deleted: false,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    // Org scoping: prevents restoring expenses in other orgs
    .eq('org_id', orgId)
    .select()
    .single()

  if (error) throw new Error(`Failed to restore expense: ${error.message}`)
  return expenseSchema.parse(data)
}
