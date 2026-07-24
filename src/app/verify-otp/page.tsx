import { Metadata } from 'next'
import { Suspense } from 'react'
import { OtpForm } from '@/features/auth/otp-form'

export const metadata: Metadata = {
  title: 'Verify Email — Ledgerly',
  description: 'Verify your email address',
}

export default function VerifyOtpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Ledgerly</h1>
          <p className="text-muted-foreground mt-2">Verify your email</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <Suspense fallback={<div className="text-center text-muted-foreground">Loading...</div>}>
            <OtpForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
