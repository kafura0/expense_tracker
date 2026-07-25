"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/ui/button"
import { Card } from "@/shared/ui/card"
import { LayoutDashboard, ArrowLeft, AlertTriangle } from "lucide-react"

export default function DashboardNotFound() {
  const router = useRouter()

  return (
    <div className="relative flex min-h-[60vh] items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <Card className="relative z-10 w-full max-w-lg border-border/50 bg-card/80 p-8 text-center shadow-2xl backdrop-blur-xl sm:p-12">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <AlertTriangle className="h-10 w-10 text-primary" />
          </div>
        </div>

        <h1 className="mb-2 font-headline text-8xl font-bold tracking-tighter text-foreground sm:text-9xl">
          <span className="bg-gradient-to-br from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
            404
          </span>
        </h1>

        <h2 className="mb-3 text-2xl font-semibold text-foreground">
          Page not found
        </h2>

        <p className="mb-8 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <Button variant="outline" size="lg" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </Card>
    </div>
  )
}
