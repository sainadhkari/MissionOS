import { BarChart3 } from 'lucide-react'

interface ChartEmptyStateProps {
  reason?: string
}

/** The single shared "this chart genuinely has no backing data" state —
 * used instead of ever inventing placeholder numbers. Deliberately quieter
 * than `EmptyState` (no bordered icon badge) since it renders inside an
 * already-titled `ChartCard`. */
function ChartEmptyState({ reason }: ChartEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <BarChart3 className="h-6 w-6 text-neutral-300 dark:text-neutral-700" aria-hidden="true" />
      <p className="text-sm font-medium italic text-neutral-400 dark:text-neutral-600">Not Available</p>
      {reason && <p className="max-w-xs text-xs text-neutral-400 dark:text-neutral-600">{reason}</p>}
    </div>
  )
}

export default ChartEmptyState
