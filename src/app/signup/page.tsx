import Link from 'next/link'
import { Metadata } from 'next'
import { SignupForm } from '@/features/auth/signup-form'

export const metadata: Metadata = {
  title: 'Sign Up — Ledgerly',
  description: 'Create your Ledgerly account',
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 hero-gradient pointer-events-none" />

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <Link href="/" className="inline-block mb-6">
            <span className="font-headline-md text-headline-lg font-bold text-on-surface">
              Ledgerly
            </span>
          </Link>
          <h2 className="text-3xl font-headline font-bold text-on-surface tracking-tight">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Start tracking your expenses with precision
          </p>
        </div>

        <div className="glass-card border-outline-variant rounded-xl p-6">
          <SignupForm />
        </div>
      </div>
    </div>
  )
}
