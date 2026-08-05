import Image from "next/image"
import { cn } from "@/shared/lib/utils"

/**
 * Ledgerly brand logo (square mark, transparent background).
 * Sourced from `public/logo.png` and reused for the favicon (`src/app/icon.png`).
 */
export function Logo({
  size = 32,
  className,
  priority = false,
}: {
  size?: number
  className?: string
  priority?: boolean
}) {
  return (
    <Image
      src="/logo.png"
      alt="Ledgerly"
      width={size}
      height={size}
      className={cn("h-auto w-auto object-contain", className)}
      priority={priority}
    />
  )
}
