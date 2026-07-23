import { LoginForm } from '@/features/auth/login-form'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const { message } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">L</span>
            </div>
          </div>
          <h2 className="text-3xl font-headline font-bold text-foreground tracking-tight">
            Sign in to Ledgerly
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Intelligence for your capital
          </p>
        </div>

        {message && (
          <div className="p-3 text-sm text-primary bg-primary/10 border border-primary/20 rounded-lg">
            {message}
          </div>
        )}

        <LoginForm />
      </div>
    </div>
  )
}
