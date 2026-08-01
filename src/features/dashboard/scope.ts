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
 * - platform-admin : super_admin role — org-wide view of their active org.
 * - org-admin      : manager who created the org — Command Center.
 * - manager        : manager role — Team Pulse (org-wide).
 * - client         : client role — own expenses only.
 * - solo           : no org membership — personal expenses only.
 *
 * SECURITY NOTE
 * -------------
 * Scoping is applied at the application layer; Supabase RLS remains the
 * authoritative boundary. `applyExpenseScope` for the client persona filters
 * to `user_id` so clients only see their own rows in the UI even though the
 * org-client RLS policy permits viewing org expenses.
 */

import { useEffect, useState } from 'react'
import type { PostgrestFilterBuilder } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/client'
import { useOrg } from '@/shared/lib/org-provider'

export type DashboardPersona = 'platform-admin' | 'org-admin' | 'manager' | 'client' | 'solo'

export interface DashboardScope {
  orgId: string | null
  userId: string
  persona: DashboardPersona
  /** Base currency for the scope (solo personal budgets default to KES). */
  baseCurrency: string
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
    case 'client':
      q = q.eq('org_id', scope.orgId).eq('user_id', scope.userId)
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
 * personal (scope='user') budgets; managers and org-admins read org budgets.
 */
export function applyBudgetScope<B extends AnyFilterBuilder>(query: B, scope: DashboardScope): B {
  let q: AnyFilterBuilder = query
  switch (scope.persona) {
    case 'solo':
      q = q.eq('scope', 'user').eq('user_id', scope.userId).is('org_id', null)
      break
    case 'client':
      q = q.eq('scope', 'user').eq('user_id', scope.userId).eq('org_id', scope.orgId)
      break
    default:
      q = q.eq('scope', 'org').eq('org_id', scope.orgId)
  }
  return q as B
}

/**
 * Resolve the current user's dashboard scope.
 *
 * Combines the org context from `useOrg` with the authenticated user id, the
 * org creator (to separate org-admins from managers), and the user's base
 * currency preference from settings.
 *
 * Returns `{ scope, loading }`. While loading, `scope` is null — callers should
 * render skeletons. Once resolved the scope object is memoized per session.
 */
export function useDashboardScope(): ResolvedScopeState {
  const { activeOrg, isSolo, loading: orgLoading } = useOrg()
  const [state, setState] = useState<ResolvedScopeState>({ scope: null, loading: true })

  useEffect(() => {
    let cancelled = false

    const resolve = async () => {
      if (orgLoading) return

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) setState({ scope: null, loading: false })
        return
      }

      let orgId: string | null = null
      let persona: DashboardPersona = 'solo'
      let baseCurrency = 'USD'

      if (!isSolo && activeOrg) {
        orgId = activeOrg.org_id
        const role = activeOrg.role

        if (role === 'super_admin') {
          persona = 'platform-admin'
        } else if (role === 'client') {
          persona = 'client'
        } else {
          // manager — distinguish org-admin (org creator) from plain manager
          const { data: org } = await supabase
            .from('organizations')
            .select('created_by')
            .eq('id', orgId)
            .maybeSingle()

          persona =
            org && (org as { created_by?: string | null }).created_by === user.id
              ? 'org-admin'
              : 'manager'
        }

        const { data: settings } = await supabase
          .from('settings')
          .select('base_currency')
          .eq('user_id', user.id)
          .eq('org_id', orgId)
          .maybeSingle()

        if (settings) {
          baseCurrency = (settings as { base_currency?: string }).base_currency || 'USD'
        }
      } else {
        const { data: settings } = await supabase
          .from('settings')
          .select('base_currency')
          .eq('user_id', user.id)
          .is('org_id', null)
          .maybeSingle()

        if (settings) {
          baseCurrency = (settings as { base_currency?: string }).base_currency || 'USD'
        }
      }

      if (!cancelled) {
        setState({
          scope: { orgId, userId: user.id, persona, baseCurrency },
          loading: false,
        })
      }
    }

    void resolve()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrg?.org_id, orgLoading, isSolo])

  return state
}
