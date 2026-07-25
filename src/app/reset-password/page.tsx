'use client'

import { useState } from 'react'
import { createClient } from '@/shared/lib/supabase/client'
import Link from 'next/link'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess('Check your email for password reset link')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 hero-gradient pointer-events-none" />

      <div className="max-w-md w-full space-y-8 relative z-10 animate-fade-in">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block mb-4">
            <span className="text-2xl font-bold text-on-surface tracking-tight">
              Ledgerly
            </span>
          </Link>
          <h2 className="text-3xl font-bold text-on-surface tracking-tight">
            Reset your password
          </h2>
          <p className="text-sm text-on-surface-variant">
            Enter your email to receive a reset link
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8 animate-slide-up">
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
              <label htmlFor="email" className="text-sm font-medium text-on-surface">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                icon={<Mail className="h-4 w-4" />}
              />
            </div>

            <Button type="submit" disabled={loading} loading={loading} className="w-full h-11">
              Send reset link
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
