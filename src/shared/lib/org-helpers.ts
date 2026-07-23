'use client'

/**
 * org-helpers.ts
 *
 * Client-side organization helpers for Ledgerly's multi-tenant architecture.
 *
 * SECURITY MODEL:
 * The active org ID is stored in an httpOnly cookie, which JavaScript CANNOT read.
 * This is by design — it prevents XSS attacks from tampering with the org context.
 *
 * Instead, client components use the `useActiveOrgId()` hook, which calls a server
 * action (`getActiveOrgIdAction`) to read the cookie server-side and return the value.
 *
 * WHY NOT JUST READ THE COOKIE?
 * If we made the cookie non-httpOnly, any XSS vulnerability could:
 * 1. Read the org_id
 * 2. Modify it to point to a different org
 * 3. Exfiltrate data from other organizations
 *
 * By keeping it httpOnly and using server actions, we ensure:
 * - The org_id can only be read by trusted server code
 * - Every read is authenticated (server actions require a valid session)
 * - The cookie value is never exposed to the browser's JavaScript context
 *
 * FALLBACK:
 * If the server action fails (e.g., network error), we gracefully return null.
 * Components should handle null by showing a loading state or error message.
 */

import { useState, useEffect, useCallback } from 'react'
import { getActiveOrgIdAction } from './org-actions'

/**
 * Hook: Get the active org ID for the current user.
 *
 * Calls the server action on mount and returns the org_id.
 * Automatically handles loading state and errors.
 *
 * USAGE:
 * ```tsx
 * function MyComponent() {
 *   const orgId = useActiveOrgId()
 *   if (orgId === undefined) return <Loading />
 *   if (orgId === null) return <NoOrg />
 *   // orgId is a string — safe to use in queries
 * }
 * ```
 *
 * RETURN VALUES:
 * - undefined → still loading (call server action)
 * - null → no active org (user needs to request access or switch)
 * - string → the active org_id (safe to use in all queries)
 *
 * NOTE: We use `undefined` vs `null` to distinguish between "loading" and "no org".
 * This is important for UX — loading shows a spinner, null shows an error/empty state.
 */
export function useActiveOrgId(): string | undefined | null {
  const [orgId, setOrgId] = useState<string | undefined | null>(undefined)

  useEffect(() => {
    let cancelled = false

    const fetchOrgId = async () => {
      try {
        const id = await getActiveOrgIdAction()
        if (!cancelled) {
          setOrgId(id)
        }
      } catch {
        if (!cancelled) {
          setOrgId(null)
        }
      }
    }

    fetchOrgId()

    return () => {
      cancelled = true
    }
  }, [])

  return orgId
}

/**
 * Hook: Get the active org ID with a refetch function.
 *
 * Same as useActiveOrgId but also returns a refetch function
 * for cases where the org might change (e.g., after org switch).
 *
 * USAGE:
 * ```tsx
 * function MyComponent() {
 *   const { orgId, refetch } = useActiveOrgIdWithRefetch()
 *   // Call refetch() after org switch to get the new org_id
 * }
 * ```
 */
export function useActiveOrgIdWithRefetch(): {
  orgId: string | undefined | null
  refetch: () => Promise<void>
} {
  const [orgId, setOrgId] = useState<string | undefined | null>(undefined)

  const fetchOrgId = useCallback(async () => {
    try {
      const id = await getActiveOrgIdAction()
      setOrgId(id)
    } catch {
      setOrgId(null)
    }
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchOrgId()
  }, [fetchOrgId])
  /* eslint-enable react-hooks/set-state-in-effect */

  return { orgId, refetch: fetchOrgId }
}
