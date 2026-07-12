import { ArrowDown, ArrowUp, Minus, ListChecks } from 'lucide-react'
import { ChartCard } from '../Charts'
import Badge from '../Badge'

import type { RecommendationChange } from '../../utils/scenarioSimulation'

interface RecommendationChangesListProps {
  changes: RecommendationChange[]
}

const SHIFT_META = {
  up: { icon: ArrowUp, label: 'Increasingly Relevant', className: 'text-success-600 dark:text-success-400' },
  down: { icon: ArrowDown, label: 'Decreasingly Relevant', className: 'text-danger-600 dark:text-danger-400' },
  unchanged: { icon: Minus, label: 'No Change', className: 'text-neutral-400 dark:text-neutral-500' },
} as const

/** Never generates new recommendation text — every item is a real string
 * an agent already produced. Only the relevance "shift" is derived, via a
 * keyword match against whichever sliders moved (see
 * `buildRecommendationChanges`), and the matched parameters are shown so
 * the reasoning stays auditable. */
function RecommendationChangesList({ changes }: RecommendationChangesListProps) {
  const moved = changes.filter((c) => c.shift !== 'unchanged')
  const display = moved.length > 0 ? moved : changes

  return (
    <ChartCard
      title="Recommendation Changes"
      icon={ListChecks}
      caption="How relevant each existing recommendation becomes under this scenario"
      available={changes.length > 0}
      emptyReason="No recommendations available from the current analysis."
    >
      {display.length === 0 ? (
        <p className="text-sm italic text-neutral-400 dark:text-neutral-600">No recommendations shifted under this scenario.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {display.slice(0, 8).map((change) => {
            const meta = SHIFT_META[change.shift]
            const Icon = meta.icon
            return (
              <li key={change.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 flex-1 text-sm text-neutral-700 dark:text-neutral-300">{change.text}</p>
                  <span className={`flex shrink-0 items-center gap-1 text-xs font-semibold ${meta.className}`}>
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {meta.label}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant="neutral">{change.agentName} Agent</Badge>
                  {change.matchedParameters.map((param) => (
                    <Badge key={param} variant="primary">
                      {param}
                    </Badge>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </ChartCard>
  )
}

export default RecommendationChangesList
