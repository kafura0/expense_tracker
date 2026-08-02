'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { validatePasswordStrength } from '@/shared/lib/password'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const passwordError = validatePasswordStrength(password)
  if (passwordError) {
    return { error: passwordError }
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || '',
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

export async function verifyOtp(email: string, token: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'signup',
  })

  if (error) {
    if (error.message.includes('expired')) {
      return { error: 'OTP has expired. Please request a new one.' }
    }
    return { error: 'Invalid OTP. Please try again.' }
  }

  return { success: true }
}

export async function resendOtp(email: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
