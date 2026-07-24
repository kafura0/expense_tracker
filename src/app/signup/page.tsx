import { Metadata } from 'next'
import { SignupForm } from '@/features/auth/signup-form'

export const metadata: Metadata = {
  title: 'Sign Up — Ledgerly',
  description: 'Create your Ledgerly account',
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Ledgerly</h1>
          <p className="text-muted-foreground mt-2">
            Create your account to get started
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <SignupForm />
        </div>
      </div>
    </div>
  )
}
