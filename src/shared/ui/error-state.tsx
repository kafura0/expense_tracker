import { cn } from '@/shared/lib/utils'
import { AlertCircle } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  description?: string
  error?: Error | null
  className?: string
  children?: React.ReactNode
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while loading the data.',
  error,
  className,
  children,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
    >
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      {error && process.env.NODE_ENV === 'development' && (
        <p className="text-xs text-muted-foreground mt-2 font-mono">
          {error.message}
        </p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}