'use client'

/**
 * org-provider.tsx
 *
 * Client-side organization context provider for Ledgerly's multi-tenant architecture.
 *
 * ROLE IN THE ARCHITECTURE:
 * This provider sits at the top of the dashboard component tree and:
 * 1. Bootstraps the full authenticated app context in ONE server-action round trip
 *    (`getAppContext`) — user id, display info, all org memberships, the resolved
 *    active org (repinning the httpOnly cookie when stale), and the effective
 *    base currency + VAT rate
 * 2. Provides org data + switchOrg function to all child components
 * 3. Syncs the active org between server and client state
 *
 * COOKIE SYNC:
 * - The active org lives ONLY in a server-set httpOnly cookie (not readable by JS)
 * - This provider reads it via the `getAppContext` server action (authenticated, server-side)
 * - When the user switches org, this provider calls the switchOrg() server action
 * - The server action validates membership and sets the new httpOnly cookie, then
 *   we reload to refetch all data
 *
 * WHY FULL PAGE RELOAD ON SWITCH:
 * Every component in the app has its own React Query cache keyed by org_id.
 * Rather than manually invalidating every query, we reload the page which:
 * 1. Clears all client-side state
 * 2. Re-renders the layout with the new org context
 * 3. All components refetch with the new org_id
 * This is the safest approach for data consistency across the entire app.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getAppContext, switchOrg as switchOrgAction } from '@/shared/lib/org-actions'

/**
 * Represents an organization the user belongs to.
 * Used for the org switcher dropdown and role-based UI decisions.
 */
interface OrgInfo {
  /** UUID of the organization — used in all data queries. */
  org_id: string
  /** Display name shown in the org switcher and header. */
  org_name: string
  /** URL-safe slug for potential routing. */
  org_slug: string
  /** User's role in this org: super_admin, org_admin, or member. */
  role: string
  /** Org status: pending, active, suspended, or cancelled. */
  status: string
}

/**
 * The shape of the OrgContext that child components consume.
 */
interface OrgContextType {
  /** All orgs the user belongs to — used by the org switcher dropdown. */
  orgs: OrgInfo[]
  /** The currently active org — drives all data queries. */
  activeOrg: OrgInfo | null
  /** True while the app context is being bootstrapped server-side. */
  loading: boolean
  /** Switch to a different org. Calls server action, validates access, reloads page. */
  switchOrg: (orgId: string) => Promise<void>
  /** Manually refetch org memberships (e.g., after admin adds user to a new org). */
  refreshOrgs: () => Promise<void>
  isSolo: boolean
  /** The authenticated user's id (null while loading / when signed out). */
  userId: string | null
  /** Effective base currency for the active org (or the user's solo preference). */
  baseCurrency: string
  /** Effective VAT rate for the active org (or the user's solo preference). */
  vatRate: number
  /** Display name for the sidebar/header. */
  userName: string
  /** Email address for the sidebar/header. */
  userEmail: string
}

/**
 * React context with safe defaults.
 * The defaults ensure components render without crashing if provider is missing,
 * though in practice the provider wraps the entire dashboard.
 */
const OrgContext = createContext<OrgContextType>({
  orgs: [],
  activeOrg: null,
  loading: true,
  switchOrg: async () => {},
  refreshOrgs: async () => {},
  isSolo: false,
  userId: null,
  baseCurrency: 'USD',
  vatRate: 16,
  userName: '',
  userEmail: '',
})

/**
 * Hook: Access the organization context from any child component.
 *
 * USAGE:
 * ```tsx
 * const { activeOrg, orgs, switchOrg } = useOrg()
 * // Use activeOrg.org_id in queries
 * // Use orgs.length to show/hide the org switcher
 * // Use switchOrg(id) when user selects a different org
 * ```
 */
export function useOrg() {
  return useContext(OrgContext)
}

/**
 * Provider component that manages organization state for the entire dashboard.
 *
 * INITIALIZATION FLOW:
 * 1. On mount, calls the `getAppContext` server action once — it authenticates
 *    the user, reads/repins the httpOnly active-org cookie, fetches memberships,
 *    and resolves the effective currency/VAT settings in a single round trip
 * 2. Populates orgs + activeOrg + user/currency state
 * 3. If the user has no orgs at all, leaves active org null (solo/no-access)
 *
 * SECURITY:
 * - All Supabase queries run server-side in the action under RLS
 * - The server action validates the cookie exists and is valid
 * - Users can only see orgs they are members of (org_members RLS policy)
 */
export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [orgs, setOrgs] = useState<OrgInfo[]>([])
  const [activeOrg, setActiveOrg] = useState<OrgInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [baseCurrency, setBaseCurrency] = useState('USD')
  const [vatRate, setVatRate] = useState(16)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')

  /**
   * Bootstrap the whole app context in a single server-action round trip.
   * The server-side action (getAppContext) resolves the active org cookie,
   * memberships, and effective currency/VAT settings atomically.
   */
  const fetchOrgs = useCallback(async () => {
    const ctx = await getAppContext()
    if (!ctx) {
      setLoading(false)
      return
    }

    setOrgs(ctx.orgs)
    setActiveOrg(ctx.orgs.find((o) => o.org_id === ctx.active_org_id) || null)
    setUserId(ctx.user_id)
    setBaseCurrency(ctx.base_currency)
    setVatRate(ctx.vat_rate)
    setUserName(ctx.full_name || ctx.email?.split('@')[0] || '')
    setUserEmail(ctx.email || '')
    setLoading(false)
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchOrgs()
  }, [fetchOrgs])
  /* eslint-enable react-hooks/set-state-in-effect */

  /**
   * Switch to a different organization.
   *
   * SECURITY FLOW:
   * 1. Call the switchOrg() server action — it authenticates the user and
   *    validates their membership in the target org
   * 2. If validation passes, the server sets the httpOnly cookie
   * 3. Reload the page so all React Query caches are invalidated
   *
   * No client-side cookie is ever written — the httpOnly cookie is the single
   * source of truth, and org membership is validated server-side only.
   */
  const switchOrg = useCallback(async (orgId: string) => {
    const result = await switchOrgAction(orgId)
    if (result.error) {
      throw new Error(result.error)
    }

    // Reload to refetch all data with the new org context
    window.location.reload()
  }, [])

  const refreshOrgs = useCallback(async () => {
    setLoading(true)
    await fetchOrgs()
  }, [fetchOrgs])

  const isSolo = !loading && orgs.length === 0

  return (
    <OrgContext.Provider
      value={{ orgs, activeOrg, loading, switchOrg, refreshOrgs, isSolo, userId, baseCurrency, vatRate, userName, userEmail }}
    >
      {children}
    </OrgContext.Provider>
  )
}
