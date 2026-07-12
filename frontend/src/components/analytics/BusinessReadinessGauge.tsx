import { CheckCircle2 } from 'lucide-react'
import { ChartCard, Gauge } from '../Charts'
import { buildBusinessReadiness } from '../../utils/analyticsCharts'
import type { MissionAnalysis } from '../../types/Analysis'
import type { Dataset } from '../../types/Dataset'

interface BusinessReadinessGaugeProps {
  analysis: MissionAnalysis | null
  datasets: Dataset[]
}

/** "Is the underlying data and evidence solid enough to trust this
 * recommendation" — a composite of dataset quality and evidence coverage.
 * Deliberately distinct from `DeploymentReadinessGauge`, which factors
 * confidence and risk instead. */
function BusinessReadinessGauge({ analysis, datasets }: BusinessReadinessGaugeProps) {
  const value = buildBusinessReadiness(analysis, datasets)

  return (
    <ChartCard title="Business Readiness" icon={CheckCircle2} caption="Dataset quality + evidence coverage" available={value !== null}>
      <div className="flex justify-center">
        <Gauge value={value} label="Business Readiness" />
      </div>
    </ChartCard>
  )
}

export default BusinessReadinessGauge
