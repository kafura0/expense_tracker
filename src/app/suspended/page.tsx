'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/shared/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/shared/ui/button'
import { Ban, LogOut, MailQuestion } from 'lucide-react'

export default function SuspendedPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

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
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
            <Ban className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Account Suspended
          </h2>
          <p className="text-muted-foreground">
            Your account has been suspended. If you believe this is a mistake, please reach out to
            support and we&apos;ll help you resolve it.
          </p>
        </div>

        <div className="space-y-3">
          <Button onClick={handleLogout} disabled={loading} variant="outline" className="w-full">
            <LogOut className="h-4 w-4" />
            {loading ? 'Signing out...' : 'Sign out'}
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link href="mailto:support@ledgerly.app">
              <MailQuestion className="h-4 w-4" />
              Contact support
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
