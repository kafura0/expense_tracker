'use server'

/**
 * org-actions.ts
 *
 * Server actions for organization context management.
 *
 * These functions are marked with 'use server' at the module level, which means
 * Next.js will serialize them and allow client components to call them remotely.
 * Only async functions can be exported from a 'use server' module.
 *
 * SECURITY:
 * Every function here:
 * 1. Validates the user is authenticated (via Supabase session)
 * 2. Validates the user has the required permissions (org membership check)
 * 3. Performs the action only if both checks pass
 *
 * This prevents:
 * - Unauthenticated clients from calling these actions
 * - Users from performing actions on orgs they don't belong to
 * - Org ID tampering via client-side manipulation
 */

import { cookies } from 'next/headers'
import { createClient } from '@/shared/lib/supabase/server'
import { ACTIVE_ORG_COOKIE, getActiveOrgId, validateOrgAccess } from './org-context'

/**
 * Server action: Get the active org ID for the current user.
 *
 * This exists so that client components can resolve the org_id from the httpOnly cookie.
 * The cookie is NOT readable by JavaScript (XSS protection), so client components
 * call this server action which reads the cookie server-side and returns the value.
 *
 * WHY THIS PATTERN:
 * - httpOnly cookies are secure because JavaScript can't read them
 * - But client components need to know the active org for filtering queries
 * - Server actions bridge this gap: client calls the action → action reads cookie → returns org_id
 * - The org_id itself is not a secret (it's a UUID), but protecting it from tampering is critical
 *
 * USAGE IN CLIENT COMPONENTS:
 * ```tsx
 * const orgId = await getActiveOrgIdAction()
 * if (!orgId) throw new Error('No active organization')
 * ```
 */
export async function getActiveOrgIdAction(): Promise<string | null> {
  return getActiveOrgId()
}

/**
 * Server action: bootstrap the entire authenticated app context in a single
 * round trip.
 *
 * Returns everything the dashboard shell and data-scoping layer need:
 *   - the authenticated user's id + display info
 *   - all org memberships (org switcher)
 *   - the resolved active org id (repinning the httpOnly cookie when stale,
 *     matching the resolution order previously spread across the client
 *     provider + `ensureActiveOrg`)
 *   - the effective base currency + VAT rate for the active org (or the
 *     user's personal settings when solo)
 *
 * WHY THIS MATTERS:
 * Previously the client fired up to six sequential network calls to reach the
 * same state: `auth.getUser()`, an RLS memberships query, `getActiveOrgIdAction`,
 * possibly `ensureActiveOrg` (a second round trip + duplicate DB query), and
 * then two more queries in `useDashboardScope` (settings + org defaults).
 * Collapsing all of that into one action removes the boot waterfall on every
 * dashboard route.
 */
export async function getAppContext(): Promise<{
  user_id: string
  full_name: string | null
  email: string | null
  orgs: Array<{
    org_id: string
    org_name: string
    org_slug: string
    role: string
    status: string
  }>
  active_org_id: string | null
  base_currency: string
  vat_rate: number
} | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: memberships } = await supabase
    .from('org_members')
    .select('org_id, role, created_at, organizations!inner(id, name, slug, status)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const orgs = (memberships || []).map((m) => ({
    org_id: m.org_id,
    org_name: (m.organizations as unknown as { name: string }).name,
    org_slug: (m.organizations as unknown as { slug: string }).slug,
    role: m.role,
    status: (m.organizations as unknown as { status: string }).status,
  }))

  let activeOrgId = await getActiveOrgId()
  if (activeOrgId && !orgs.some((o) => o.org_id === activeOrgId)) activeOrgId = null
  if (!activeOrgId && orgs.length > 0) {
    const active = orgs.find((o) => o.status === 'active')
    const target = (active || orgs[0]).org_id
    activeOrgId = target
    await setActiveOrgCookie(target)
  }

  const activeOrg = orgs.find((o) => o.org_id === activeOrgId) || null
  const resolvedOrgId = activeOrg?.org_id ?? null

  let baseCurrency = 'USD'
  let vatRate = 16

  if (activeOrg && resolvedOrgId) {
    const [{ data: settings }, { data: org }] = await Promise.all([
      supabase
        .from('settings')
        .select('base_currency, vat_rate')
        .eq('user_id', user.id)
        .eq('org_id', resolvedOrgId)
        .maybeSingle(),
      supabase
        .from('organizations')
        .select('default_currency, default_vat_rate')
        .eq('id', resolvedOrgId)
        .maybeSingle(),
    ])

    baseCurrency = settings?.base_currency || org?.default_currency || 'USD'
    vatRate =
      settings?.vat_rate != null
        ? Number(settings.vat_rate)
        : org?.default_vat_rate != null
          ? Number(org.default_vat_rate)
          : 16
  } else {
    const { data: settings } = await supabase
      .from('settings')
      .select('base_currency, vat_rate')
      .eq('user_id', user.id)
      .is('org_id', null)
      .maybeSingle()

    if (settings?.base_currency) baseCurrency = settings.base_currency
    if (settings?.vat_rate != null) vatRate = Number(settings.vat_rate)
  }

  return {
    user_id: user.id,
    full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
    email: user.email ?? null,
    orgs,
    active_org_id: activeOrgId,
    base_currency: baseCurrency,
    vat_rate: vatRate,
  }
}

function setActiveOrgCookie(orgId: string) {
  return cookies().then((cookieStore) =>
    cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
  )
}

/**
 * Server action: resolve the active org, repinning the httpOnly cookie when it
 * is absent, invalid, or stale (FR-2, AD-3).
 *
 * Resolution order:
 *   1. If the cookie exists and still references a real membership, keep it.
 *   2. Otherwise, repin to the caller's earliest-`created_at` membership
 *      (preferring an ACTIVE organization) and write the cookie server-side.
 *   3. A user with no memberships resolves to null — no cookie is written and
 *      org-scoped queries return no rows (RLS), never an error.
 *
 * The cookie is only ever written by server code; client code contains no
 * `document.cookie` write for it.
 */
export async function ensureActiveOrg(): Promise<{ org_id: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { org_id: null }

  const current = await getActiveOrgId()
  if (current) {
    const access = await validateOrgAccess(user.id, current)
    if (access?.hasAccess) return { org_id: current }
    // Cookie references a membership that no longer exists — repin below.
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let memberships: any[] | null = null
  try {
    const result = await supabase
      .from('org_members')
      .select('org_id, created_at, organizations!inner(id, status)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    memberships = result.data
  } catch {
    return { org_id: null }
  }

  if (!memberships || memberships.length === 0) return { org_id: null }

  // Prefer the earliest membership whose org is still active.
  const active = memberships.find(
    (m) => (m.organizations as unknown as { status?: string } | null)?.status === 'active'
  )
  const target = active?.org_id || memberships[0].org_id

  await setActiveOrgCookie(target)
  return { org_id: target }
}

/**
 * Server action: Switch the active organization.
 *
 * Called by the OrgSwitcher component when the user selects a different org.
 *
 * SECURITY FLOW:
 * 1. Authenticate the user (get their session)
 * 2. Validate they have a membership in the target org
 * 3. Only then set the cookie
 *
 * This prevents:
 * - Unauthenticated users from setting an org cookie
 * - Users from switching to orgs they don't belong to (horizontal privilege escalation)
 * - Org ID tampering (the cookie is httpOnly, but this adds a server-side check too)
 */
export async function switchOrg(orgId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Validate user has access to this org — defense-in-depth check
  const access = await validateOrgAccess(user.id, orgId)
  if (!access?.hasAccess) {
    return { error: 'You do not have access to this organization' }
  }

  // Do not allow switching to a suspended/cancelled org.
  const { data: org } = await supabase
    .from('organizations')
    .select('status')
    .eq('id', orgId)
    .maybeSingle()
  if (org && org.status !== 'active') {
    return { error: 'This organization is not active' }
  }

  await setActiveOrgCookie(orgId)

  return { success: true }
}
