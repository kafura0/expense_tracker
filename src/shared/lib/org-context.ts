/**
 * org-context.ts
 *
 * Server-side organization context management for Ledgerly's multi-tenant architecture.
 *
 * ARCHITECTURE:
 * The active organization is stored in an httpOnly cookie (ledgerly_active_org).
 * This cookie is set server-side and is NOT readable by client-side JavaScript,
 * which is the correct security posture — the org_id is never exposed to the browser
 * where it could be tampered with.
 *
 * FLOW:
 * 1. User logs in → middleware resolves their org memberships
 * 2. First org is auto-selected → cookie is set via setActiveOrgId()
 * 3. User switches org via OrgSwitcher → switchOrg() validates access then sets cookie
 * 4. Every server component / server action reads the cookie via getActiveOrgId()
 * 5. Every query filters by this org_id — this is the PRIMARY isolation mechanism
 *
 * RLS DEFENSE-IN-DEPTH:
 * Even if application code is bypassed, Supabase RLS policies enforce the same
 * org-based filtering at the database level. The helper functions (is_org_member,
 * can_write_in_org, etc.) are defined in the migration and run as SECURITY DEFINER,
 * meaning they execute with the privileges of the function owner, not the calling user.
 *
 * COOKIE SECURITY:
 * - httpOnly: true → JavaScript cannot read the cookie (XSS protection)
 * - secure: true in production → only sent over HTTPS
 * - sameSite: 'lax' → sent with top-level navigations but not cross-site requests
 * - maxAge: 30 days → persistent across browser sessions
 * - path: '/' → available on all routes
 *
 * NOTE:
 * This file does NOT have the 'use server' directive because it exports constants,
 * types, and interfaces which are not allowed in a 'use server' module. Server
 * actions live in org-actions.ts. Client components should import from org-actions.ts
 * (for server actions) and this file (for types and constants).
 */

import { cookies } from 'next/headers'
import { createClient } from '@/shared/lib/supabase/server'

/** The name of the cookie that stores the active organization ID. */
export const ACTIVE_ORG_COOKIE = 'ledgerly_active_org'

/**
 * Represents the current user's context within an organization.
 * This is the core data structure that drives role-based access control
 * across the entire application.
 */
export interface OrgContext {
  /** The UUID of the active organization — used in every data query. */
  org_id: string
  /** Human-readable org name for display in the UI. */
  org_name: string
  /** URL-safe slug for routing. */
  org_slug: string
  /** The user's role in THIS org — different users can have different roles in different orgs. */
  role: 'super_admin' | 'manager' | 'client'
  /** Org status — only 'active' orgs should allow data access. */
  status: string
}

/**
 * Read the active org ID from the httpOnly cookie.
 *
 * This is the SERVER-SIDE entry point for org resolution. Every server component,
 * server action, and API route calls this to determine which org's data to operate on.
 *
 * WHY THIS MATTERS:
 * If this returns null, it means either:
 * (a) The user hasn't been assigned to any org yet, or
 * (b) The cookie was cleared/expired
 *
 * In both cases, the calling code should throw or redirect — never guess.
 */
export async function getActiveOrgId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(ACTIVE_ORG_COOKIE)?.value || null
}

/**
 * Set the active org cookie with maximum security settings.
 *
 * Called when:
 * - User first logs in (middleware sets the first available org)
 * - User switches orgs via the OrgSwitcher component
 * - Admin approves a client request (sets the new org)
 *
 * SECURITY NOTES:
 * - httpOnly: true prevents XSS attacks from reading the org_id
 * - secure: true ensures the cookie is only sent over HTTPS in production
 * - sameSite: 'lax' prevents CSRF attacks while allowing normal navigation
 */
export async function setActiveOrgId(orgId: string) {
  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days — matches typical session lifetime
  })
}

/**
 * Clear the active org cookie on logout.
 * This ensures no stale org context persists between sessions.
 */
export async function clearActiveOrgId() {
  const cookieStore = await cookies()
  cookieStore.delete(ACTIVE_ORG_COOKIE)
}

/**
 * Fetch the complete org context for the current user.
 *
 * Returns ALL organizations the user belongs to (for the org switcher dropdown)
 * plus the currently active org (from the cookie).
 *
 * DATA STRUCTURE:
 * - orgs: Array of all org memberships with role and status
 * - active_org_id: The org_id from the cookie (or first org if cookie is missing)
 * - active_org: Full details of the active org including role
 *
 * RLS IMPLICATION:
 * This query reads from org_members and organizations. The RLS policies on these
 * tables ensure that only valid memberships are returned — a user cannot see orgs
 * they don't belong to, even if they craft a direct Supabase query.
 */
export async function getUserOrgContext(userId: string): Promise<{
  orgs: Array<{
    org_id: string
    org_name: string
    org_slug: string
    role: string
    status: string
  }>
  active_org_id: string | null
  active_org: {
    org_id: string
    org_name: string
    org_slug: string
    role: string
    status: string
  } | null
}> {
  const supabase = await createClient()
  const activeOrgId = await getActiveOrgId()

  /**
   * Query org_members with an inner join to organizations.
   * The `!inner` join ensures we only get memberships for orgs that still exist
   * (deleted orgs are cascaded via ON DELETE CASCADE).
   */
  const { data: memberships, error } = await supabase
    .from('org_members')
    .select(`
      org_id,
      role,
      organizations!inner(id, name, slug, status)
    `)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to fetch org context: ${error.message}`)
  }

  /**
   * Flatten the joined data into a clean structure.
   * The Supabase join returns nested objects; we map them to a flat OrgContext shape.
   */
  const orgs = (memberships || []).map((m) => ({
    org_id: m.org_id,
    org_name: (m.organizations as unknown as { name: string }).name,
    org_slug: (m.organizations as unknown as { slug: string }).slug,
    role: m.role,
    status: (m.organizations as unknown as { status: string }).status,
  }))

  /**
   * Resolve the active org:
   * 1. If cookie has a valid org_id → use it
   * 2. If cookie is missing or invalid → fall back to the first org
   * 3. If user has no orgs at all → null (they need to request access)
   */
  const activeOrg = activeOrgId
    ? orgs.find(o => o.org_id === activeOrgId) || null
    : orgs[0] || null

  return {
    orgs,
    active_org_id: activeOrg?.org_id || activeOrgId || null,
    active_org: activeOrg,
  }
}

/**
 * Validate that a specific user has access to a specific org.
 *
 * Used by:
 * - switchOrg() to prevent users from switching to an org they don't belong to
 * - Admin actions to verify permissions before modifying org data
 * - Middleware to validate the active org cookie on every request
 *
 * Returns both the access flag AND the role, so callers can make
 * role-based decisions in a single call.
 */
export async function validateOrgAccess(userId: string, orgId: string): Promise<{
  hasAccess: boolean
  role: string | null
} | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .single()

  if (error || !data) {
    return { hasAccess: false, role: null }
  }

  return { hasAccess: true, role: data.role }
}
