'use client'

import { useState } from 'react'
import { createInviteAction } from './actions'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { useToast } from '@/shared/ui/toast'
import { Mail, Send, Shield, Users } from 'lucide-react'

export function InviteForm() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'manager' | 'client'>('client')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const result = await createInviteAction(email, role)

    if (result.error) {
      toast(result.error, 'error')
    } else {
      toast('Invite sent successfully', 'success')
      setEmail('')
      setRole('client')
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="invite-email" className="text-sm font-medium text-on-surface">
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

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-on-surface">Role</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRole('client')}
            className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-medium transition-all duration-200 ${
              role === 'client'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-muted/50 text-on-surface-variant hover:border-muted-foreground/50'
            }`}
          >
            <Users className="h-4 w-4" />
            Client
          </button>
          <button
            type="button"
            onClick={() => setRole('manager')}
            className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-medium transition-all duration-200 ${
              role === 'manager'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-muted/50 text-on-surface-variant hover:border-muted-foreground/50'
            }`}
          >
            <Shield className="h-4 w-4" />
            Manager
          </button>
        </div>
        <p className="text-xs text-on-surface-variant/60">
          {role === 'client'
            ? 'Can view and submit expenses'
            : 'Can manage expenses, categories, and invite others'}
        </p>
      </div>

      <Button type="submit" disabled={loading || !email} loading={loading} className="w-full h-11">
        <Send className="h-4 w-4" />
        Send Invite
      </Button>
    </form>
  )
}
