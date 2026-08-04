'use client'

/**
 * dashboard-scope.ts
 *
 * Client-side persona resolution and query scoping for Ledgerly dashboards.
 *
 * Every dashboard widget receives a `DashboardScope` describing exactly whose
 * data it may read, and applies the matching filter to its Supabase queries via
 * `applyExpenseScope`, `applyCategoryScope`, and `applyBudgetScope`.
 *
 * PERSONAS
 * --------
 * - platform-admin : super_admin role — lives on the /admin console.
 * - org            : any organization member — org-wide view.
 * - solo           : no org membership — personal expenses only.
 *
 * SECURITY NOTE
 * -------------
 * Scoping is applied at the application layer; Supabase RLS remains the
 * authoritative boundary.
 */

import { useMemo } from 'react'
import type { PostgrestFilterBuilder } from '@supabase/supabase-js'
import { useOrg } from '@/shared/lib/org-provider'

export type DashboardPersona = 'platform-admin' | 'org' | 'solo'

export interface DashboardScope {
  orgId: string | null
  userId: string
  persona: DashboardPersona
  /** Effective base currency (personal override → org default → USD). */
  baseCurrency: string
  /** Effective VAT rate (personal override → org default → 16). */
  vatRate: number
}

interface ResolvedScopeState {
  scope: DashboardScope | null
  loading: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFilterBuilder = PostgrestFilterBuilder<any, any, any, any, any>

/**
 * Apply the persona-appropriate expense filter to a query builder.
 */
export function applyExpenseScope<B extends AnyFilterBuilder>(query: B, scope: DashboardScope): B {
  let q: AnyFilterBuilder = query
  switch (scope.persona) {
    case 'solo':
      q = q.eq('user_id', scope.userId).is('org_id', null)
      break
    default:
      q = q.eq('org_id', scope.orgId)
  }
  return q as B
}

/**
 * Apply the persona-appropriate categories filter. Categories are org-scoped for
 * every org persona; solo users read their personal categories.
 */
export function applyCategoryScope<B extends AnyFilterBuilder>(query: B, scope: DashboardScope): B {
  let q: AnyFilterBuilder = query
  if (scope.persona === 'solo') {
    q = q.eq('user_id', scope.userId).is('org_id', null)
  } else {
    q = q.eq('org_id', scope.orgId)
  }
  return q as B
}

/**
 * Apply the persona-appropriate budgets filter. Clients and solo users read
 * personal (scope='user') budgets; org members read org budgets.
 */
export function applyBudgetScope<B extends AnyFilterBuilder>(query: B, scope: DashboardScope): B {
  let q: AnyFilterBuilder = query
  switch (scope.persona) {
    case 'solo':
      q = q.eq('scope', 'user').eq('user_id', scope.userId).is('org_id', null)
      break
    default:
      q = q.eq('scope', 'org').eq('org_id', scope.orgId)
  }
  return q as B
}

/**
 * Resolve the current user's dashboard scope.
 *
 * Derives the scope synchronously from the org context, which the provider
 * bootstraps in a single server-action round trip (user id, memberships, active
 * org, and the effective base currency + VAT rate). No additional network calls.
 *
 * Returns `{ scope, loading }`. While loading, `scope` is null — callers should
 * render skeletons.
 */
export function useDashboardScope(): ResolvedScopeState {
  const { activeOrg, isSolo, loading, userId, baseCurrency, vatRate } = useOrg()

  const scope = useMemo<DashboardScope | null>(() => {
    if (!userId) return null

    let persona: DashboardPersona
    if (isSolo) {
      persona = 'solo'
    } else if (activeOrg?.role === 'super_admin') {
      persona = 'platform-admin'
    } else {
      // Every org member sees the same org-wide view — manager/client
      // roles are no longer differentiated at the persona level.
      persona = 'org'
    }

    return {
      orgId: activeOrg?.org_id ?? null,
      userId,
      persona,
      baseCurrency,
      vatRate,
    }
  }, [activeOrg, isSolo, userId, baseCurrency, vatRate])

  return { scope, loading }
}
