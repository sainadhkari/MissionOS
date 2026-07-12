import { CheckCircle2, Circle } from 'lucide-react'
import Card from '../Card'
import { formatDateTime } from '../../utils/date'
import type { TimelineEntry } from '../../utils/collaborationCenter'

interface ExecutionTimelineSectionProps {
  entries: TimelineEntry[]
}

/** Shows a real timestamp wherever the backend recorded one, "Completed"
 * when we can confirm the step finished but not exactly when, and "Not
 * Available" only when we can't even confirm that much — never an
 * invented timestamp. */
function ExecutionTimelineSection({ entries }: ExecutionTimelineSectionProps) {
  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Execution Timeline</h2>
      <p className="mb-5 text-xs text-neutral-500 dark:text-neutral-400">
        Every stage from mission creation to report generation, timestamped wherever the backend recorded it.
      </p>
      <ol className="flex flex-col">
        {entries.map((entry, index) => {
          const known = entry.timestamp !== null || entry.completedFallback
          return (
            <li key={entry.label} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                    known
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : 'border-dashed border-neutral-300 text-neutral-300 dark:border-neutral-700 dark:text-neutral-700'
                  }`}
                >
                  {known ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Circle className="h-3 w-3" aria-hidden="true" />}
                </span>
                {index < entries.length - 1 && (
                  <span
                    className={`min-h-[20px] w-px flex-1 ${known ? 'bg-primary-300 dark:bg-primary-800' : 'bg-neutral-200 dark:bg-neutral-800'}`}
                  />
                )}
              </div>
              <div className="pb-5">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{entry.label}</p>
                <p
                  className={
                    entry.timestamp
                      ? 'text-xs text-neutral-500 dark:text-neutral-400'
                      : entry.completedFallback
                        ? 'text-xs text-success-600 dark:text-success-400'
                        : 'text-xs italic text-neutral-400 dark:text-neutral-600'
                  }
                >
                  {entry.timestamp ? formatDateTime(entry.timestamp) : entry.completedFallback ? 'Completed' : 'Not Available'}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

export default ExecutionTimelineSection
