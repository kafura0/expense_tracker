import { createClient } from '@/shared/lib/supabase/server'

export interface OrgMember {
  id: string
  org_id: string
  user_id: string
  role: 'super_admin' | 'manager' | 'client'
  created_at: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  created_by: string | null
  status: 'pending' | 'active' | 'suspended' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface OrgContext {
  org_id: string
  org: Organization
  role: 'super_admin' | 'manager' | 'client'
}

/**
 * Resolve all orgs a user belongs to and their role in each.
 * Returns the first org as "current" for simple cases.
 */
export async function resolveUserOrgs(userId: string): Promise<OrgContext[]> {
  const supabase = await createClient()

  const { data: memberships, error } = await supabase
    .from('org_members')
    .select('org_id, role, organizations!inner(*)')
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to resolve orgs: ${error.message}`)
  }

  return (memberships || []).map((m) => ({
    org_id: m.org_id,
    org: m.organizations as unknown as Organization,
    role: m.role as OrgContext['role'],
  }))
}

/**
 * Get the current org context for a user.
 * Super admins get the first org or null.
 * Managers/Clients get their assigned org.
 */
export async function getCurrentOrg(userId: string): Promise<OrgContext | null> {
  const orgs = await resolveUserOrgs(userId)

  if (orgs.length === 0) return null

  // For non-super-admins, return their single org
  const nonSuperAdmin = orgs.find(o => o.role !== 'super_admin')
  if (nonSuperAdmin) return nonSuperAdmin

  // For super admins, return first org or null
  return orgs[0] || null
}

/**
 * Check if a user is a super admin.
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('org_members')
    .select('id')
    .eq('user_id', userId)
    .eq('role', 'super_admin')
    .limit(1)

  if (error) return false
  return (data && data.length > 0)
}

/**
 * Check if user can write (manager or super_admin) in an org.
 */
export async function canWriteInOrg(userId: string, orgId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .single()

  if (error || !data) return false
  return data.role === 'super_admin' || data.role === 'manager'
}

/**
 * Get user's role in a specific org.
 */
export async function getOrgRole(userId: string, orgId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .single()

  if (error || !data) return null
  return data.role
}

/**
 * Create a new organization with subscription and assign data.
 */
export async function createOrganization(
  name: string,
  slug: string,
  createdBy: string,
  planSlug: string = 'free'
): Promise<string> {
  const supabase = await createClient()

  // Use the SQL function
  const { data, error } = await supabase.rpc('create_org_for_user', {
    p_org_name: name,
    p_org_slug: slug,
    p_user_id: createdBy,
    p_plan_slug: planSlug,
  })

  if (error) {
    throw new Error(`Failed to create organization: ${error.message}`)
  }

  return data as string
}

/**
 * Audit log helper.
 */
export async function logAuditEvent(params: {
  org_id?: string
  user_id?: string
  action: string
  entity_type: string
  entity_id?: string
  old_value?: Record<string, unknown>
  new_value?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
}): Promise<void> {
  const supabase = await createClient()

  await supabase.from('audit_logs').insert({
    org_id: params.org_id || null,
    user_id: params.user_id || null,
    action: params.action,
    entity_type: params.entity_type,
    entity_id: params.entity_id || null,
    old_value: params.old_value || null,
    new_value: params.new_value || null,
    ip_address: params.ip_address || null,
    user_agent: params.user_agent || null,
  })
}
