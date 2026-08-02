'use client'

import { useState } from 'react'
import { createInviteAction } from './actions'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { useToast } from '@/shared/ui/toast'
import { Mail, Send } from 'lucide-react'

export function InviteForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const result = await createInviteAction(email)

    if (result.error) {
      toast(result.error, 'error')
    } else {
      toast('Invite sent successfully', 'success')
      setEmail('')
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="invite-email" className="text-sm font-medium text-foreground">
          Email address
        </label>
        <Input
          id="invite-email"
          type="email"
          required
          placeholder="colleague@example.com"
          icon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <p className="text-xs text-muted-foreground/70">
        Invited members get full access to the organization&apos;s expenses, budgets, and reports.
      </p>

      <Button type="submit" disabled={loading || !email} loading={loading} className="w-full h-11">
        <Send className="h-4 w-4" />
        Send Invite
      </Button>
    </form>
  )
}
