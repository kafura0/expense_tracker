/**
 * @fileoverview Service-role user lookups (AD-9).
 *
 * Member emails are resolved ONLY via the service-role `auth.admin.listUsers`
 * endpoint — there is no `profiles.email` column and no direct SQL against
 * `auth.users`. These helpers are server-only and must only be called from
 * code paths that have already authorized the caller.
 */

import { createServiceClient } from '@/shared/lib/supabase/service'

/**
 * Load every auth user email into a Map<user_id, email>.
 * Keeps paging until a short page is returned so large installs are not
 * silently truncated.
 */
export async function lookupEmailMap(): Promise<Map<string, string>> {
  const service = createServiceClient()
  if (!service) return new Map()
  const map = new Map<string, string>()
  const perPage = 1000
  let page = 1
  for (;;) {
    const { data } = await service.auth.admin.listUsers({ page, perPage })
    const users = data?.users || []
    for (const u of users) map.set(u.id, u.email || '')
    if (users.length < perPage) break
    page += 1
  }
  return map
}

/** Load emails only for a specific set of user ids (filters the full map). */
export async function lookupEmailsFor(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map()
  const all = await lookupEmailMap()
  const subset = new Map<string, string>()
  const wanted = new Set(userIds)
  for (const [id, email] of all) {
    if (wanted.has(id)) subset.set(id, email)
  }
  return subset
}
