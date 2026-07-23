'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function completeOnboarding() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/')
  return { success: true }
}

export async function getOnboardingStatus(): Promise<boolean> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return true

  const { data } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .single()

  return data?.onboarding_completed ?? false
}
