import { ShieldAlert } from 'lucide-react'
import { ChartCard, Gauge } from '../Charts'
import { riskLevelToPercent } from '../../utils/analyticsCharts'
import type { RiskAnalysis } from '../../types/Analysis'

interface RiskGaugeProps {
  risk: RiskAnalysis | null
}

/** A "lower is better" gauge reading `overall_risk_level` — green near the
 * bottom, red near the top, the inverse of every confidence gauge. */
function RiskGauge({ risk }: RiskGaugeProps) {
  const value = riskLevelToPercent(risk?.overall_risk_level ?? null)
  return (
    <ChartCard title="Risk Score" icon={ShieldAlert} caption="Overall assessed risk level" available={value !== null}>
      <div className="flex justify-center">
        <Gauge value={value} label="Risk Score" sublabel={risk?.overall_risk_level} inverted />
      </div>
    </ChartCard>
  )
}

export default RiskGauge
