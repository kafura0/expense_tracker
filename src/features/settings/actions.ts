'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { getActiveOrgId } from '@/shared/lib/org-context'
import { revalidatePath } from 'next/cache'

export interface UserSettings {
  theme: 'light' | 'dark' | 'system'
  base_currency: string
  vat_rate: number
  display_name: string
}

async function getOrgId(): Promise<string> {
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

  if (!membership) throw new Error('No organization membership found')
  return membership.org_id
}

export async function getSettings(): Promise<UserSettings> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const orgId = await getOrgId()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .single()

  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .single()

  return {
    theme: (settings?.theme as 'light' | 'dark' | 'system') || 'dark',
    base_currency: settings?.base_currency || 'USD',
    vat_rate: settings?.vat_rate || 16,
    display_name: profile?.display_name || user.email?.split('@')[0] || '',
  }
}

export async function updateSettings(settings: Partial<UserSettings>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const orgId = await getOrgId()

  if (settings.display_name !== undefined) {
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: settings.display_name })
      .eq('user_id', user.id)
      .eq('org_id', orgId)
    if (error) return { error: error.message }
  }

  const settingsUpdate: Record<string, string | number> = {}
  if (settings.theme !== undefined) settingsUpdate.theme = settings.theme
  if (settings.base_currency !== undefined) settingsUpdate.base_currency = settings.base_currency
  if (settings.vat_rate !== undefined) {
    if (settings.vat_rate < 0 || settings.vat_rate > 100) {
      return { error: 'VAT rate must be between 0 and 100' }
    }
    settingsUpdate.vat_rate = settings.vat_rate
  }

  if (Object.keys(settingsUpdate).length > 0) {
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

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('user_id', user.id)
    .eq('org_id', orgId)

  if (updateError) return { error: updateError.message }

  revalidatePath('/settings')
  return { success: true, url: publicUrl }
}
