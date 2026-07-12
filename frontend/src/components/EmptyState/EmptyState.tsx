import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-10 text-center ${className}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{title}</p>
        {description && (
          <p className="mt-1 max-w-xs text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export default EmptyState
