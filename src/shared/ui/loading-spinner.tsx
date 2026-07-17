import { cn } from '@/shared/lib/utils'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({ className, size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  return (
    <Loader2
      className={cn('animate-spin text-muted-foreground', sizeClasses[size], className)}
    />
  )
}

interface LoadingPageProps {
  className?: string
}

export function LoadingPage({ className }: LoadingPageProps) {
  return (
    <div className={cn('flex items-center justify-center min-h-[400px]', className)}>
      <LoadingSpinner size="lg" />
    </div>
  )
}