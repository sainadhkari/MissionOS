import { HeartPulse } from 'lucide-react'
import { ChartCard, Gauge } from '../Charts'
import { buildMissionHealthScore } from '../../utils/analyticsCharts'
import type { MissionAnalysis } from '../../types/Analysis'
import type { Dataset } from '../../types/Dataset'

interface MissionHealthScoreProps {
  analysis: MissionAnalysis | null
  datasets: Dataset[]
}

/** A single composite averaging AI confidence, dataset quality, and
 * evidence coverage — the same three metrics shown individually elsewhere
 * on this dashboard, combined into one headline number. */
function MissionHealthScore({ analysis, datasets }: MissionHealthScoreProps) {
  const value = buildMissionHealthScore(analysis, datasets)

  return (
    <ChartCard title="Mission Health" icon={HeartPulse} caption="Composite of AI confidence, dataset quality, and evidence coverage" available={value !== null}>
      <div className="flex justify-center">
        <Gauge value={value} label="Mission Health" />
      </div>
    </ChartCard>
  )
}

export default MissionHealthScore
