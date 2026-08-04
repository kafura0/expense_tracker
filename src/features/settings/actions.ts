'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { getActiveOrgId } from '@/shared/lib/org-context'
import { SUPPORTED_CURRENCIES } from '@/entities/exchange-rate/types'
import { logAuditEvent } from '@/shared/lib/audit-logger'
import {
  resolveEffectiveSettings,
  isValidOrgSlug,
} from '@/shared/lib/effective-settings'
import { revalidatePath } from 'next/cache'

export interface UserSettings {
  theme: 'light' | 'dark' | 'system'
  /** Effective base currency (personal override → org default → USD). */
  base_currency: string
  /** Effective VAT rate (personal override → org default → 16). */
  vat_rate: number
  display_name: string
  /** True when the personal base_currency override is active. */
  currency_override: boolean
  /** True when the personal vat_rate override is active. */
  vat_override: boolean
  org_default_currency: string | null
  org_default_vat_rate: number | null
  is_org_member: boolean
}

export interface SettingsContext {
  hasOrg: boolean
  isOrgAdmin: boolean
}

export async function getSettingsContext(): Promise<SettingsContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { hasOrg: false, isOrgAdmin: false }

  const orgId = await getOrgId()
  if (!orgId) return { hasOrg: false, isOrgAdmin: false }

  const { data } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle()

  return {
    hasOrg: true,
    isOrgAdmin: data?.role === 'org_admin',
  }
}

async function getOrgId(): Promise<string | null> {
  const activeOrgId = await getActiveOrgId()
  if (activeOrgId) return activeOrgId

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .order('created_at')
    .limit(1)
    .maybeSingle()

  if (!membership) return null
  return membership.org_id
}

export async function getSettings(): Promise<UserSettings> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const orgId = await getOrgId()

  let profileQuery = supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
  if (orgId) {
    profileQuery = profileQuery.eq('org_id', orgId)
  } else {
    profileQuery = profileQuery.is('org_id', null)
  }

  let settingsQuery = supabase
    .from('settings')
    .select('*')
    .eq('user_id', user.id)
  if (orgId) {
    settingsQuery = settingsQuery.eq('org_id', orgId)
  } else {
    settingsQuery = settingsQuery.is('org_id', null)
  }

  const { data: profile } = await profileQuery.maybeSingle()
  const { data: settings } = await settingsQuery.maybeSingle()

  let orgDefaults: { default_currency: string | null; default_vat_rate: number | null } = {
    default_currency: null,
    default_vat_rate: null,
  }
  if (orgId) {
    const { data: org } = await supabase
      .from('organizations')
      .select('default_currency, default_vat_rate')
      .eq('id', orgId)
      .maybeSingle()
    if (org) {
      orgDefaults = {
        default_currency: org.default_currency ?? null,
        default_vat_rate: org.default_vat_rate != null ? Number(org.default_vat_rate) : null,
      }
    }
  }

  const effective = resolveEffectiveSettings(
    orgDefaults,
    {
      base_currency: settings?.base_currency ?? null,
      vat_rate: settings?.vat_rate != null ? Number(settings.vat_rate) : null,
    }
  )

  return {
    theme: (settings?.theme as 'light' | 'dark' | 'system') || 'dark',
    base_currency: effective.base_currency,
    vat_rate: effective.vat_rate,
    display_name: profile?.display_name || user.email?.split('@')[0] || '',
    currency_override: effective.currency_override,
    vat_override: effective.vat_override,
    org_default_currency: effective.org_default_currency,
    org_default_vat_rate: effective.org_default_vat_rate,
    is_org_member: Boolean(orgId),
  }
}

export interface SettingsUpdateInput {
  theme?: 'light' | 'dark' | 'system'
  display_name?: string
  /** Effective currency; null clears a personal override (use org default). */
  base_currency?: string | null
  /** Effective VAT; null clears a personal override (use org default). */
  vat_rate?: number | null
}

export async function updateSettings(settings: SettingsUpdateInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const orgId = await getOrgId()

  if (settings.display_name !== undefined) {
    let profileQuery = supabase
      .from('profiles')
      .update({ display_name: settings.display_name })
      .eq('user_id', user.id)
    if (orgId) {
      profileQuery = profileQuery.eq('org_id', orgId)
    } else {
      profileQuery = profileQuery.is('org_id', null)
    }
    const { error } = await profileQuery
    if (error) return { error: error.message }
  }

  const settingsUpdate: Record<string, string | number | null> = {}
  if (settings.theme !== undefined) settingsUpdate.theme = settings.theme
  if (settings.base_currency !== undefined) {
    if (settings.base_currency !== null) {
      if (!SUPPORTED_CURRENCIES.includes(settings.base_currency as (typeof SUPPORTED_CURRENCIES)[number])) {
        return { error: 'Unsupported currency' }
      }
      settingsUpdate.base_currency = settings.base_currency
    } else {
      settingsUpdate.base_currency = null
    }
  }
  if (settings.vat_rate !== undefined) {
    if (settings.vat_rate !== null) {
      const vatRate = Number(settings.vat_rate)
      if (Number.isNaN(vatRate) || vatRate < 0 || vatRate > 100) {
        return { error: 'VAT rate must be a number between 0 and 100' }
      }
      settingsUpdate.vat_rate = vatRate
    } else {
      settingsUpdate.vat_rate = null
    }
  }

  if (Object.keys(settingsUpdate).length > 0) {
    if (orgId) {
      const { error } = await supabase
        .from('settings')
        .upsert({
          user_id: user.id,
          org_id: orgId,
          ...settingsUpdate,
        }, {
          onConflict: 'user_id,org_id',
        })
      if (error) return { error: error.message }
    } else {
      const existingQuery = supabase
        .from('settings')
        .select('id')
        .eq('user_id', user.id)
        .is('org_id', null)
      const { data: existing } = await existingQuery.maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update(settingsUpdate)
          .eq('id', existing.id)
        if (error) return { error: error.message }
      } else {
        const { error } = await supabase
          .from('settings')
          .insert({
            user_id: user.id,
            org_id: null,
            ...settingsUpdate,
          })
        if (error) return { error: error.message }
      }
    }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function uploadAvatar(file: File) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Only JPEG, PNG, and WebP images are allowed' }
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: 'File size must be less than 5MB' }
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}/avatar.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, { upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName)

  const orgId = await getOrgId()

  let profileUpdate = supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('user_id', user.id)
  if (orgId) {
    profileUpdate = profileUpdate.eq('org_id', orgId)
  } else {
    profileUpdate = profileUpdate.is('org_id', null)
  }

  const { error: updateError } = await profileUpdate

  if (updateError) return { error: updateError.message }

  revalidatePath('/settings')
  return { success: true, url: publicUrl }
}

export interface OrgSettings {
  name: string
  slug: string
  default_currency: string | null
  default_vat_rate: number | null
}

async function requireOrgAdmin(orgId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: allowed, error } = await supabase.rpc('can_admin_org', {
    target_org_id: orgId,
  })
  if (error || !allowed) return { error: 'You do not have permission to manage this organization' }
  return {}
}

export async function getOrgSettings(): Promise<
  { data?: OrgSettings; error?: string | null }
> {
  try {
    const orgId = await getActiveOrgId()
    if (!orgId) return { data: undefined, error: 'No active organization' }

    const supabase = await createClient()
    const { data: org, error } = await supabase
      .from('organizations')
      .select('name, slug, default_currency, default_vat_rate')
      .eq('id', orgId)
      .maybeSingle()
    if (error) return { error: error.message }
    if (!org) return { error: 'Organization not found' }

    return {
      data: {
        name: org.name,
        slug: org.slug,
        default_currency: org.default_currency ?? null,
        default_vat_rate: org.default_vat_rate != null ? Number(org.default_vat_rate) : null,
      },
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to load organization settings' }
  }
}

export async function updateOrgProfile(input: { name: string; slug: string }) {
  try {
    const orgId = await getActiveOrgId()
    if (!orgId) return { error: 'No active organization' }
    const authz = await requireOrgAdmin(orgId)
    if (authz.error) return { error: authz.error }

    const name = input.name.trim()
    const slug = input.slug.trim().toLowerCase()

    if (name.length < 2) return { error: 'Organization name must be at least 2 characters' }
    if (name.length > 80) return { error: 'Organization name must be at most 80 characters' }
    if (!isValidOrgSlug(slug)) {
      return { error: 'Slug must be lowercase letters, numbers, and single hyphens (e.g. acme-corp)' }
    }

    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .neq('id', orgId)
      .maybeSingle()
    if (existing) return { error: 'That slug is already taken' }

    const { data: before } = await supabase
      .from('organizations')
      .select('name, slug')
      .eq('id', orgId)
      .maybeSingle()

    const { error } = await supabase
      .from('organizations')
      .update({ name, slug })
      .eq('id', orgId)
    if (error) return { error: error.message }

    await logAuditEvent({
      action: 'org.profile_update',
      org_id: orgId,
      entity_type: 'organization',
      entity_id: orgId,
      old_value: before ? { name: before.name, slug: before.slug } : undefined,
      new_value: { name, slug },
    })

    revalidatePath('/settings')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to update organization' }
  }
}

export async function updateOrgDefaults(input: {
  default_currency: string | null
  default_vat_rate: number | null
}) {
  try {
    const orgId = await getActiveOrgId()
    if (!orgId) return { error: 'No active organization' }
    const authz = await requireOrgAdmin(orgId)
    if (authz.error) return { error: authz.error }

    const { default_currency, default_vat_rate } = input

    if (default_currency !== null && !SUPPORTED_CURRENCIES.includes(default_currency as (typeof SUPPORTED_CURRENCIES)[number])) {
      return { error: 'Unsupported currency' }
    }
    if (default_vat_rate !== null) {
      const vat = Number(default_vat_rate)
      if (Number.isNaN(vat) || vat < 0 || vat > 100) {
        return { error: 'VAT rate must be a number between 0 and 100' }
      }
    }

    const supabase = await createClient()

    const { data: before } = await supabase
      .from('organizations')
      .select('default_currency, default_vat_rate')
      .eq('id', orgId)
      .maybeSingle()

    const { error } = await supabase
      .from('organizations')
      .update({
        default_currency,
        default_vat_rate: default_vat_rate != null ? Number(default_vat_rate) : null,
      })
      .eq('id', orgId)
    if (error) return { error: error.message }

    await logAuditEvent({
      action: 'org.defaults_update',
      org_id: orgId,
      entity_type: 'organization',
      entity_id: orgId,
      old_value: before
        ? {
            default_currency: before.default_currency,
            default_vat_rate: before.default_vat_rate != null ? Number(before.default_vat_rate) : null,
          }
        : undefined,
      new_value: { default_currency, default_vat_rate },
    })

    revalidatePath('/settings')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to update organization defaults' }
  }
}

export async function clearPersonalOverride(field: 'currency' | 'vat') {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const orgId = await getActiveOrgId()
    if (!orgId) return { error: 'No active organization' }

    const update: Record<string, string | number | null> =
      field === 'currency' ? { base_currency: null } : { vat_rate: null }

    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('settings')
        .update(update)
        .eq('id', existing.id)
      if (error) return { error: error.message }
    }

    await logAuditEvent({
      action: 'settings.update',
      org_id: orgId,
      entity_type: 'settings',
      entity_id: existing?.id ?? null,
      old_value: update,
      new_value: undefined,
    })

    revalidatePath('/settings')
    return { success: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to clear override' }
  }
}
