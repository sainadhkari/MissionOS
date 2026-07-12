import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ChartCard, Gauge } from '../Charts'
import ScenarioProjectionBadge from './ScenarioProjectionBadge'

interface ScenarioMetricCardProps {
  title: string
  icon: LucideIcon
  caption: string
  baselineValue: number | null
  projectedValue: number | null
  delta: number | null
  inverted?: boolean
  /** When true, a delta is displayed but the gauge and headline number
   * intentionally hold at the baseline value — used for metrics (like
   * Business Readiness) this simulation doesn't model. */
  unaffected?: boolean
}

function DeltaIndicator({ delta, inverted }: { delta: number | null; inverted?: boolean }) {
  if (delta === null || delta === 0) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-neutral-400 dark:text-neutral-500">
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        No change
      </span>
    )
  }
  const isImprovement = inverted ? delta < 0 : delta > 0
  return (
    <span
      className={`flex items-center gap-1 text-xs font-semibold ${isImprovement ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}`}
    >
      {delta > 0 ? <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />}
      {delta > 0 ? '+' : ''}
      {delta} pts
    </span>
  )
}

/** The shared shape behind Business Impact, Risk, Confidence, Decision
 * Readiness, Mission Health, and Business Readiness projections — a gauge
 * showing the projected value, plus a delta readout against the mission's
 * real baseline, always carrying the "Scenario Projection" badge. */
function ScenarioMetricCard({ title, icon, caption, baselineValue, projectedValue, delta, inverted, unaffected }: ScenarioMetricCardProps) {
  return (
    <ChartCard title={title} icon={icon} caption={caption} available={projectedValue !== null}>
      <div className="flex flex-col items-center gap-3">
        <Gauge value={projectedValue} label={title} inverted={inverted} />
        <div className="flex items-center gap-2">
          <ScenarioProjectionBadge />
          {unaffected ? (
            <span className="text-xs italic text-neutral-400 dark:text-neutral-500">Unaffected by these assumptions</span>
          ) : (
            <DeltaIndicator delta={delta} inverted={inverted} />
          )}
        </div>
        {baselineValue !== null && projectedValue !== null && !unaffected && (
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
            Baseline {baselineValue}% → Projected {projectedValue}%
          </p>
        )}
      </div>
    </ChartCard>
  )
}

export default ScenarioMetricCard
