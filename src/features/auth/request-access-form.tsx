'use client'

import { useState } from 'react'
import { requestAccess } from '@/features/auth/actions'
import Link from 'next/link'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { Mail, User, Building2, Phone, CheckCircle } from 'lucide-react'

export function RequestAccessForm() {
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
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:text-primary/80 transition-colors font-medium">
          Sign in
        </Link>
      </p>
    </form>
  )
}
