import type { PropsWithChildren, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import Card from '../Card'
import ChartEmptyState from './ChartEmptyState'

interface ChartCardProps {
  title: string
  caption?: string
  icon?: LucideIcon
  /** When false, renders the elegant "Not Available" state instead of children. */
  available?: boolean
  emptyReason?: string
  actions?: ReactNode
  className?: string
}

/** The one wrapper every analytics chart in the app should render through —
 * consistent title/caption/spacing, and a single shared "Not Available"
 * fallback so an unavailable chart never looks like a bug. */
function ChartCard({
  title,
  caption,
  icon: Icon,
  available = true,
  emptyReason,
  actions,
  className = '',
  children,
}: PropsWithChildren<ChartCardProps>) {
  return (
    <Card className={className}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {Icon && <Icon className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />}
            <span className="truncate">{title}</span>
          </h3>
          {caption && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{caption}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {available ? children : <ChartEmptyState reason={emptyReason} />}
    </Card>
  )
}

export default ChartCard
