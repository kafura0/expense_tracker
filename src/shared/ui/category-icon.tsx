import { createElement } from 'react'
import { getCategoryIcon } from '@/shared/lib/category-icons'
import { cn } from '@/shared/lib/utils'

interface CategoryIconTileProps {
  icon?: string | null
  color?: string | null
  className?: string
  iconClassName?: string
}

export function CategoryIconTile({ icon, color, className, iconClassName }: CategoryIconTileProps) {
  return (
    <div
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted/60 ring-1 ring-white/5',
        className
      )}
      style={color ? { color } : undefined}
    >
      {createElement(getCategoryIcon(icon), { className: cn('h-5 w-5', iconClassName) })}
    </div>
  )
}
