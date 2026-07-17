'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface UserSettings {
  theme: 'light' | 'dark' | 'system'
  base_currency: string
  vat_rate: number
  display_name: string
}

export async function getSettings(): Promise<UserSettings> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', user.id)
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

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Update profile
  if (settings.display_name !== undefined) {
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: settings.display_name })
      .eq('id', user.id)

    if (error) {
      return { error: error.message }
    }
  }

  // Update settings
  const settingsUpdate: Record<string, any> = {}
  if (settings.theme !== undefined) settingsUpdate.theme = settings.theme
  if (settings.base_currency !== undefined) settingsUpdate.base_currency = settings.base_currency
  if (settings.vat_rate !== undefined) settingsUpdate.vat_rate = settings.vat_rate

  if (Object.keys(settingsUpdate).length > 0) {
    const { error } = await supabase
      .from('settings')
      .upsert({
        user_id: user.id,
        ...settingsUpdate,
      }, {
        onConflict: 'user_id',
      })

    if (error) {
      return { error: error.message }
    }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function uploadAvatar(file: File) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}/avatar.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, { upsert: true })

  if (uploadError) {
    return { error: uploadError.message }
  }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName)

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/settings')
  return { success: true, url: publicUrl }
}