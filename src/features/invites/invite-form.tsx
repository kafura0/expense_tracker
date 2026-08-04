'use client'

import { useState } from 'react'
import { createInviteAction } from './actions'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { useToast } from '@/shared/ui/toast'
import { Mail, Send } from 'lucide-react'

interface InviteFormProps {
  onSent?: () => void
}

export function InviteForm({ onSent }: InviteFormProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await createInviteAction(email)

    if (result.error) {
      setError(result.error)
      toast(result.error, 'error')
    } else {
      toast('Invite sent successfully', 'success')
      setEmail('')
      onSent?.()
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="invite-email" className="text-sm font-medium text-foreground">
          Email address
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            id="invite-email"
            type="email"
            required
            placeholder="colleague@example.com"
            icon={<Mail className="h-4 w-4" />}
            value={email}
            error={!!error}
            onChange={(e) => {
              setEmail(e.target.value)
              setError('')
            }}
          />
          <Button type="submit" disabled={loading || !email} loading={loading} className="sm:shrink-0">
            <Send className="h-4 w-4" />
            Send Invite
          </Button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <p className="text-xs text-muted-foreground/70">
        Invites last 7 days and are single-use. Invited members get full access to the
        organization&apos;s expenses, budgets, and reports.
      </p>
    </form>
  )
}
