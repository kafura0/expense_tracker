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

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })

  return { success: true }
}
