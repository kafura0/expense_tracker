'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signup } from '@/features/auth/signup-actions'

export function SignupForm() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const result = await signup(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setEmail(result.email || '')
      setSuccess(true)
      setLoading(false)
      router.push(
        `/verify-otp?email=${encodeURIComponent(result.email || '')}`
      )
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-primary text-3xl">
            mail
          </span>
        </div>
        <h2 className="text-xl font-semibold text-on-surface">
          Check your email
        </h2>
        <p className="text-on-surface-variant text-sm">
          We sent a verification code to <strong>{email}</strong>
        </p>
        <Link
          href={`/verify-otp?email=${encodeURIComponent(email)}`}
          className="inline-block w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-on-primary bg-primary hover:brightness-110 transition-all text-center"
        >
          Enter verification code
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="full_name"
          className="block text-sm font-medium text-on-surface mb-1.5"
        >
          Full Name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          className="block w-full px-4 py-2.5 bg-surface-dim border border-outline-variant rounded-lg text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
          placeholder="John Doe"
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-on-surface mb-1.5"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="block w-full px-4 py-2.5 bg-surface-dim border border-outline-variant rounded-lg text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-on-surface mb-1.5"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="block w-full px-4 py-2.5 bg-surface-dim border border-outline-variant rounded-lg text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
          placeholder="Min 8 characters"
        />
        <p className="mt-1.5 text-xs text-on-surface-variant/60">
          Must include uppercase, lowercase, number, and special character
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2.5 px-4 rounded-lg text-sm font-semibold text-on-primary bg-primary hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-50"
      >
        {loading ? 'Creating account...' : 'Create account'}
      </button>

      <p className="text-center text-sm text-on-surface-variant">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-primary hover:text-primary/80 transition-colors font-medium"
        >
          Sign in
        </Link>
      </p>
    </form>
  )
}
