import { FileText } from 'lucide-react'
import ScenarioProjectionBadge from './ScenarioProjectionBadge'

interface ScenarioSummaryCardProps {
  summary: string
}

/** A fixed-template sentence (see `buildScenarioSummary`) — deterministic,
 * no AI call, always the same output for the same sliders. */
function ScenarioSummaryCard({ summary }: ScenarioSummaryCardProps) {
  return (
    <div className="rounded-2xl border border-primary-200 bg-primary-50/60 p-6 dark:border-primary-900 dark:bg-primary-950/30">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          <FileText className="h-4 w-4 text-primary-500" aria-hidden="true" />
          Scenario Summary
        </h2>
        <ScenarioProjectionBadge />
      </div>
      <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{summary}</p>
    </div>
  )
}

export default ScenarioSummaryCard
