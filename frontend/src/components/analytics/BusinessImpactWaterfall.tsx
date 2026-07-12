import { TrendingUp } from 'lucide-react'
import { ChartCard, WaterfallChart } from '../Charts'
import { buildBusinessImpactWaterfallSteps } from '../../utils/analyticsCharts'
import type { MissionAnalysis } from '../../types/Analysis'

interface BusinessImpactWaterfallProps {
  analysis: MissionAnalysis | null
}

/** How the final recommendation set accumulates as each agent stage adds
 * its own items. There is no cost/revenue field anywhere in the backend,
 * so this waterfall is deliberately an item count, not a fabricated dollar
 * figure — see `buildBusinessImpactWaterfallSteps`. */
function BusinessImpactWaterfall({ analysis }: BusinessImpactWaterfallProps) {
  const steps = buildBusinessImpactWaterfallSteps(analysis)

  return (
    <ChartCard
      title="Business Impact Waterfall"
      icon={TrendingUp}
      caption="How the recommendation set built up across agents (item count)"
      available={Boolean(steps)}
    >
      {steps && <WaterfallChart steps={steps} valueLabel="items" />}
    </ChartCard>
  )
}

export default BusinessImpactWaterfall
