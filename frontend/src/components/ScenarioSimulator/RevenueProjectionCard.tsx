import { TrendingUp } from 'lucide-react'
import { ChartCard } from '../Charts'
import ScenarioProjectionBadge from './ScenarioProjectionBadge'

interface RevenueProjectionCardProps {
  revenueIndex: number
  revenueIndexDelta: number
}

/** The backend has no real revenue/dollar figure anywhere, so this is
 * expressed as an index relative to the mission's current baseline (100 =
 * no change) rather than a fabricated dollar amount — the only honest way
 * to show a "revenue projection" without inventing financial data. */
function RevenueProjectionCard({ revenueIndex, revenueIndexDelta }: RevenueProjectionCardProps) {
  const isUp = revenueIndexDelta > 0
  const isDown = revenueIndexDelta < 0

  return (
    <ChartCard title="Revenue Projection" icon={TrendingUp} caption="Index relative to current baseline (100 = no change)">
      <div className="flex flex-col items-center gap-3 py-4">
        <span
          className={`text-4xl font-bold ${isUp ? 'text-success-600 dark:text-success-400' : isDown ? 'text-danger-600 dark:text-danger-400' : 'text-neutral-900 dark:text-neutral-100'}`}
        >
          {revenueIndex}
        </span>
        <div className="flex items-center gap-2">
          <ScenarioProjectionBadge />
          <span
            className={`text-xs font-semibold ${isUp ? 'text-success-600 dark:text-success-400' : isDown ? 'text-danger-600 dark:text-danger-400' : 'text-neutral-400 dark:text-neutral-500'}`}
          >
            {revenueIndexDelta > 0 ? '+' : ''}
            {revenueIndexDelta} pts vs. baseline
          </span>
        </div>
      </div>
    </ChartCard>
  )
}

export default RevenueProjectionCard
