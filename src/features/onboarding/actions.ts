'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { setActiveOrgId } from '@/shared/lib/org-context'

export async function completeOnboarding(orgName?: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (orgName) {
    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const { data: orgId, error: rpcError } = await supabase.rpc('create_org_for_user', {
      p_org_name: orgName,
      p_org_slug: slug,
      p_user_id: user.id,
      p_plan_slug: 'free',
    })

    if (rpcError) return { error: rpcError.message }

    await setActiveOrgId(orgId as string)

    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('user_id', user.id)

    revalidatePath('/')
    return { success: true, orgId: orgId as string }
  }

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
