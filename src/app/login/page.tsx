import Link from 'next/link'
import { LoginForm } from '@/features/auth/login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const { message } = await searchParams

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
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Sign in to your account
          </p>
        </div>

        {message && (
          <div className="p-3 text-sm text-primary bg-primary/10 border border-primary/20 rounded-lg">
            {message}
          </div>
        )}

        <div className="glass-card border-outline-variant rounded-xl p-6">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
