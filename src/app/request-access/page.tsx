'use client'

import { useState } from 'react'
import { requestAccess } from '@/features/auth/actions'
import Link from 'next/link'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { Mail, User, Building2, Phone, CheckCircle } from 'lucide-react'

export default function RequestAccessPage() {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const formData = new FormData(e.currentTarget)
    const result = await requestAccess(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else if (result?.success) {
      setSuccess(result.success)
      setLoading(false)
      ;(e.target as HTMLFormElement).reset()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-sm md:px-4 py-8 md:py-12 relative overflow-hidden text-center">
      <div className="absolute inset-0 hero-gradient pointer-events-none" />

      <div className="max-w-md w-full space-y-6 md:space-y-8 relative z-10 animate-fade-in">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block mb-4">
            <span className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
              Ledgerly
            </span>
          </Link>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Request Access
          </h2>
          <p className="text-sm text-muted-foreground">
            Professional expense management for your business
          </p>
          <p className="text-xs text-muted-foreground/60">
            Submit your request and our team will review it within 24 hours.
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 md:p-8 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg">
                {error}
              </div>
            )}
            {success && (
              <div className="p-4 text-sm text-emerald-400 bg-emerald-900/20 border border-emerald-800/30 rounded-lg flex items-start gap-3">
                <CheckCircle className="h-5 w-5 mt-0.5 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-foreground">
                Full Name
              </label>
              <Input
                id="name"
                name="name"
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
              <label htmlFor="business_name" className="text-sm font-medium text-foreground">
                Business Name
              </label>
              <Input
                id="business_name"
                name="business_name"
                type="text"
                placeholder="Acme Corp"
                icon={<Building2 className="h-4 w-4" />}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-sm font-medium text-foreground">
                Phone <span className="text-muted-foreground/50">(optional)</span>
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                icon={<Phone className="h-4 w-4" />}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="message" className="text-sm font-medium text-foreground">
                Message <span className="text-muted-foreground/50">(optional)</span>
              </label>
              <textarea
                id="message"
                name="message"
                rows={3}
                className="flex w-full rounded-lg border border-input bg-muted/50 px-3 py-2.5 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground hover:border-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring resize-none"
                placeholder="Tell us about your expense management needs..."
              />
            </div>

            <Button type="submit" disabled={loading} loading={loading} className="w-full h-11">
              Request Access
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:text-primary/80 transition-colors font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
