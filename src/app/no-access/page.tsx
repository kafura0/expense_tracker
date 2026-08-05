'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/shared/ui/logo'
import { logout } from '@/features/auth/actions'
import { Button } from '@/shared/ui/button'
import { UserX, LogOut, UserPlus } from 'lucide-react'

export default function NoAccessPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    await logout()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-2 md:px-4 py-8 md:py-12 relative overflow-hidden text-center">
      <div className="absolute inset-0 hero-gradient pointer-events-none" />

      <div className="max-w-md w-full space-y-6 md:space-y-8 relative z-10 animate-fade-in">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block mb-4">
            <Logo size={48} />
          </Link>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
            <UserX className="h-8 w-8 text-amber-400" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            You no longer have access
          </h2>
          <p className="text-muted-foreground">
            Your membership in this organization was removed, so you can no longer view its
            expenses or settings. If you believe this is a mistake, ask an Org Admin to invite you
            again.
          </p>
        </div>

        <div className="space-y-3">
          <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/request-access">
              <UserPlus className="h-4 w-4" />
              Request access
            </Link>
          </Button>
          <Button onClick={handleLogout} disabled={loading} variant="outline" className="w-full">
            <LogOut className="h-4 w-4" />
            {loading ? 'Signing out...' : 'Sign out'}
          </Button>
        </div>
      </div>
    </div>
  )
}
