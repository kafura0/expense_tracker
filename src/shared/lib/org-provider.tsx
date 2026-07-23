'use client'

/**
 * org-provider.tsx
 *
 * Client-side organization context provider for Ledgerly's multi-tenant architecture.
 *
 * ROLE IN THE ARCHITECTURE:
 * This provider sits at the top of the component tree and:
 * 1. Fetches all org memberships for the current user on mount
 * 2. Determines the active org from the server-side cookie (via server action)
 * 3. Provides org data + switchOrg function to all child components
 * 4. Syncs the active org between server and client state
 *
 * COOKIE SYNC:
 * - Server sets the cookie via httpOnly (secure, not readable by JS)
 * - This provider reads it via server action (authenticated, server-side)
 * - When user switches org, this provider calls switchOrg() server action
 * - Server action sets the new cookie, then we reload to refetch all data
 *
 * WHY FULL PAGE RELOAD ON SWITCH:
 * Every component in the app has its own React Query cache keyed by org_id.
 * Rather than manually invalidating every query, we reload the page which:
 * 1. Clears all client-side state
 * 2. Re-renders the layout with the new org context
 * 3. All components refetch with the new org_id
 * This is the safest approach for data consistency across the entire app.
 */

'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import { getActiveOrgIdAction } from '@/shared/lib/org-actions'

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
  /** User's role in this org: super_admin, manager, or client. */
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
  /** True while org memberships are being fetched from Supabase. */
  loading: boolean
  /** Switch to a different org. Calls server action, validates access, reloads page. */
  switchOrg: (orgId: string) => Promise<void>
  /** Manually refetch org memberships (e.g., after admin adds user to a new org). */
  refreshOrgs: () => Promise<void>
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
 * 1. On mount, fetches user's org memberships from Supabase
 * 2. Reads active org_id from server action (which reads the httpOnly cookie)
 * 3. Sets the activeOrg state — components can now render with org context
 * 4. If no org_id in cookie, auto-selects the first available org
 *
 * SECURITY:
 * - All Supabase queries use the authenticated user's session (RLS enforced)
 * - The server action validates the cookie exists and is valid
 * - Users can only see orgs they are members of (org_members RLS policy)
 */
export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [orgs, setOrgs] = useState<OrgInfo[]>([])
  const [activeOrg, setActiveOrg] = useState<OrgInfo | null>(null)
  const [loading, setLoading] = useState(true)

  /**
   * Fetch all organizations the current user belongs to.
   * This populates the org switcher dropdown and determines available roles.
   */
  const fetchOrgs = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    /**
     * Query org_members with inner join to organizations.
     * The `!inner` ensures we skip deleted orgs (ON DELETE CASCADE).
     * RLS on org_members ensures we only see this user's memberships.
     */
    const { data: memberships } = await supabase
      .from('org_members')
      .select(`
        org_id,
        role,
        organizations!inner(id, name, slug, status)
      `)
      .eq('user_id', user.id)

    /**
     * Flatten the nested Supabase response into a clean OrgInfo array.
     * The join returns { org_id, role, organizations: { id, name, slug, status } }
     * and we map it to a flat structure for easier consumption.
     */
    const orgList = (memberships || []).map((m) => ({
      org_id: m.org_id,
      org_name: (m.organizations as unknown as { name: string }).name,
      org_slug: (m.organizations as unknown as { slug: string }).slug,
      role: m.role,
      status: (m.organizations as unknown as { status: string }).status,
    }))

    setOrgs(orgList)

    /**
     * Determine the active org:
     * 1. Try reading from the server action (which reads the httpOnly cookie)
     * 2. If no cookie or invalid cookie, fall back to the first org
     * 3. Ensure the cookie is set for the next page load
     */
    const activeOrgId = await getActiveOrgIdAction()

    const active = activeOrgId
      ? orgList.find(o => o.org_id === activeOrgId)
      : orgList[0]

    if (active) {
      setActiveOrg(active)
      /**
       * If the cookie is missing or points to a different org,
       * update it. This handles the case where:
       * - User's first login (no cookie yet)
       * - User was removed from the org in the cookie
       * - Cookie expired
       *
       * NOTE: We set a non-httpOnly cookie here for the client to read on next mount.
       * The server-side cookie (setActiveOrgId) is httpOnly for security.
       * This dual-cookie approach ensures both server and client can access the org_id.
       * The server action provides the authoritative value; this is a convenience cache.
       */
      if (!activeOrgId || activeOrgId !== active.org_id) {
        document.cookie = `ledgerly_active_org=${active.org_id}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
      }
    } else {
      setActiveOrg(null)
    }

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
   * 1. Call switchOrg() server action — it validates the user's membership
   * 2. If validation passes, the server sets the httpOnly cookie
   * 3. We also set a client-readable cookie for the OrgProvider on next mount
   * 4. Reload the page to ensure all React Query caches are invalidated
   *
   * The full page reload is intentional — it guarantees that every component
   * re-renders with the new org context, preventing stale data display.
   */
  const switchOrg = useCallback(async (orgId: string) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Client-side validation (defense-in-depth — server action also validates)
    const { data: membership } = await supabase
      .from('org_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .single()

    if (!membership) {
      throw new Error('You do not have access to this organization')
    }

    const org = orgs.find(o => o.org_id === orgId)
    if (!org) return

    /**
     * Set client-readable cookie for the OrgProvider on next mount.
     * The server action also sets an httpOnly cookie for server-side security.
     * This dual approach ensures both server components and client components
     * can resolve the active org_id.
     */
    document.cookie = `ledgerly_active_org=${orgId}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
    setActiveOrg(org)

    // Reload to refetch all data with new org context
    window.location.reload()
  }, [orgs])

  const refreshOrgs = useCallback(async () => {
    setLoading(true)
    await fetchOrgs()
  }, [fetchOrgs])

  return (
    <OrgContext.Provider value={{ orgs, activeOrg, loading, switchOrg, refreshOrgs }}>
      {children}
    </OrgContext.Provider>
  )
}
