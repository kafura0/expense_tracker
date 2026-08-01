'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { orgSignup } from './actions'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { Mail, Lock, User, Building2, Eye, EyeOff } from 'lucide-react'

export default function OrgSignupPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const result = await orgSignup(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push(`/verify-otp?email=${encodeURIComponent(result.email || '')}`)
    }
  }

  const strength = {
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }
  const score = Object.values(strength).filter(Boolean).length

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-2 md:px-4 py-8 md:py-12 relative overflow-hidden text-center">
      <div className="absolute inset-0 hero-gradient pointer-events-none" />

      <div className="max-w-md w-full space-y-6 md:space-y-8 relative z-10 animate-fade-in">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block mb-4">
            <span className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
              Ledgerly
            </span>
          </Link>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Create your organization
          </h2>
          <p className="text-sm text-muted-foreground">
            Set up your team&apos;s expense tracking workspace
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 md:p-8 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="org_name" className="text-sm font-medium text-foreground">
                Organization Name
              </label>
              <Input
                id="org_name"
                name="org_name"
                type="text"
                required
                placeholder="Acme Corp"
                icon={<Building2 className="h-4 w-4" />}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="full_name" className="text-sm font-medium text-foreground">
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
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@company.com"
                icon={<Mail className="h-4 w-4" />}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                            : 'bg-muted/20'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground/60">
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
              Create Organization
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:text-primary/80 transition-colors font-medium">
                Log in
              </Link>
            </p>
            <p className="text-sm text-muted-foreground">
              Just need personal tracking?{' '}
              <Link href="/signup" className="text-primary hover:text-primary/80 transition-colors font-medium">
                Sign up free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
