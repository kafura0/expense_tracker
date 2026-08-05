"use client"

import { GeistSans, GeistMono } from "geist/font"
import { Button } from "@/shared/ui/button"
import { AlertTriangle } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  console.error("Unhandled app error:", error)

  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
          </div>

          <div className="relative z-10 w-full max-w-lg rounded-3xl border border-border/50 bg-card/80 p-8 text-center shadow-2xl backdrop-blur-xl sm:p-12">
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                <AlertTriangle className="h-10 w-10 text-primary" />
              </div>
            </div>

            <h2 className="mb-3 font-headline text-2xl font-semibold text-foreground">
              Something went wrong
            </h2>

            <p className="mb-8 text-muted-foreground">
              An unexpected error occurred. Please try again or contact support
              if the issue persists.
            </p>

            <Button size="lg" onClick={reset}>
              Try Again
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}
