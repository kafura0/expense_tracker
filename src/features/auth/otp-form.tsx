'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { verifyOtp, resendOtp } from '@/features/auth/signup-actions'
import { Button } from '@/shared/ui/button'

export function OtpForm() {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(60)
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`)
      next?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`)
      prev?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6)
    const newOtp = pasted
      .split('')
      .concat(Array(6).fill(''))
      .slice(0, 6)
    setOtp(newOtp)
    const lastFilled = pasted.length - 1
    const next = document.getElementById(`otp-${Math.min(lastFilled, 5)}`)
    next?.focus()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = otp.join('')
    if (token.length !== 6) {
      setError('Please enter all 6 digits')
      return
    }

    setLoading(true)
    setError('')

    const result = await verifyOtp(email, token)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push('/onboarding')
      router.refresh()
    }
  }

  const handleResend = async () => {
    if (cooldown > 0) return
    setResending(true)
    setError('')

    const result = await resendOtp(email)

    if (result?.error) {
      setError(result.error)
    } else {
      setCooldown(60)
    }
    setResending(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <p className="text-sm text-on-surface-variant mb-4">
          Enter the 6-digit code sent to{' '}
          <strong className="text-on-surface">{email}</strong>
        </p>

        <div className="flex gap-2 sm:gap-2.5 justify-center">
          {otp.map((digit, i) => (
            <input
              key={i}
              id={`otp-${i}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-mono bg-muted/50 border border-input rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 hover:border-muted-foreground/50"
            />
          ))}
        </div>
      </div>

      <Button type="submit" disabled={loading} loading={loading} className="w-full h-11">
        Verify email
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || resending}
          className="text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cooldown > 0
            ? `Resend code in ${cooldown}s`
            : resending
              ? 'Sending...'
              : 'Resend code'}
        </button>
      </div>
    </form>
  )
}
