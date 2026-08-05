"use client"

import { Button } from "@/shared/ui/button"
import { Card } from "@/shared/ui/card"
import { AlertTriangle } from "lucide-react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  console.error("Dashboard error:", error)

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-lg border-border/50 bg-card/80 p-8 text-center shadow-2xl backdrop-blur-xl sm:p-12">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <AlertTriangle className="h-10 w-10 text-primary" />
          </div>
        </div>

        <h2 className="mb-3 font-headline text-2xl font-semibold text-foreground">
          Something went wrong
        </h2>

        <p className="mb-8 text-muted-foreground">
          An unexpected error occurred loading this page. Please try again or
          contact support if the issue persists.
        </p>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={reset}>
            Try Again
          </Button>
          <Button variant="outline" size="lg" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      </Card>
    </div>
  )
}
