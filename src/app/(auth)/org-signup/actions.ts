'use server'

import { createClient } from '@/shared/lib/supabase/server'

export async function orgSignup(formData: FormData) {
  const supabase = await createClient()

  const orgName = formData.get('org_name') as string
  const fullName = formData.get('full_name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!orgName || orgName.trim().length === 0) {
    return { error: 'Organization name is required' }
  }

  if (!fullName || fullName.trim().length === 0) {
    return { error: 'Full name is required' }
  }

  if (!email) {
    return { error: 'Email is required' }
  }

  if (!password || password.length < 8) {
    return { error: 'Password must be at least 8 characters' }
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        org_name: orgName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/onboarding`,
    },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'An account with this email already exists' }
    }
    return { error: error.message }
  }

  return { success: true, email }
}
