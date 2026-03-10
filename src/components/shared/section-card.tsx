import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface SectionCardProps {
  title?: string
  description?: string
  children: ReactNode
  className?: string
  headerAction?: ReactNode
}

export function SectionCard({ title, description, children, className, headerAction }: SectionCardProps) {
  return (
    <div className={cn('bg-card rounded-xl border shadow-sm', className)}>
      {(title || headerAction) && (
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            {title && <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>}
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {headerAction}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}
