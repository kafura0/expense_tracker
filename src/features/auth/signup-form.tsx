'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signup } from '@/features/auth/signup-actions'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { Mail, Lock, User, Eye, EyeOff, CheckCircle } from 'lucide-react'

export function SignupForm() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const router = useRouter()

  const strength = {
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }
  const score = Object.values(strength).filter(Boolean).length

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
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
          <CheckCircle className="h-6 w-6 text-emerald-400" />
        </div>
        <h2 className="text-xl font-semibold text-on-surface">
          Check your email
        </h2>
        <p className="text-on-surface-variant text-sm">
          We sent a verification code to <strong>{email}</strong>
        </p>
        <Button
          onClick={() => router.push(`/verify-otp?email=${encodeURIComponent(email)}`)}
          className="w-full h-11"
        >
          Enter verification code
        </Button>
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

      <div className="space-y-1.5">
        <label htmlFor="full_name" className="text-sm font-medium text-on-surface">
          Full Name
        </label>
        <Input
          id="full_name"
          name="full_name"
          type="text"
          required
          placeholder="John Doe"
          icon={<User className="h-4 w-4" />}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-on-surface">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          icon={<Mail className="h-4 w-4" />}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-on-surface">
          Password
        </label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 characters"
            icon={<Lock className="h-4 w-4" />}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {password.length > 0 && (
          <div className="mt-2 space-y-1.5">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                    score >= i
                      ? score <= 1
                        ? 'bg-red-500'
                        : score <= 2
                          ? 'bg-amber-500'
                          : score <= 3
                            ? 'bg-yellow-500'
                            : 'bg-emerald-500'
                      : 'bg-on-surface-variant/20'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-on-surface-variant/60">
              {score === 0 && 'Add uppercase, lowercase, number & symbol'}
              {score === 1 && 'Weak — add more character types'}
              {score === 2 && 'Fair — add more character types'}
              {score === 3 && 'Good — almost there'}
              {score === 4 && 'Strong password'}
            </p>
          </div>
        )}
      </div>

      <Button type="submit" disabled={loading} loading={loading} className="w-full h-11">
        Create account
      </Button>

      <p className="text-center text-sm text-on-surface-variant">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:text-primary/80 transition-colors font-medium">
          Sign in
        </Link>
      </p>
    </form>
  )
}
