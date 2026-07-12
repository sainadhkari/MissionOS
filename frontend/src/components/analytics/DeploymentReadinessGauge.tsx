import { Rocket } from 'lucide-react'
import { ChartCard, Gauge } from '../Charts'
import { deploymentReadinessPercent } from '../../utils/analyticsCharts'
import { deploymentReadinessLabel } from '../../utils/collaborationCenter'
import type { MissionAnalysis } from '../../types/Analysis'

interface DeploymentReadinessGaugeProps {
  analysis: MissionAnalysis | null
}

/** A transparent formula over confidence and risk level (see
 * `deploymentReadinessPercent`) — not an invented status. */
function DeploymentReadinessGauge({ analysis }: DeploymentReadinessGaugeProps) {
  const executive = analysis?.executive_analysis ?? null
  const overallConfidencePercent = executive ? Math.round(executive.confidence * 100) : null
  const riskLevel = analysis?.risk_analysis?.overall_risk_level ?? null
  const value = deploymentReadinessPercent(overallConfidencePercent, riskLevel)
  const label = deploymentReadinessLabel(overallConfidencePercent, riskLevel)

  return (
    <ChartCard title="Deployment Readiness" icon={Rocket} caption="Derived from AI confidence and risk assessment" available={value !== null}>
      <div className="flex justify-center">
        <Gauge value={value} label="Deployment Readiness" sublabel={label ?? undefined} />
      </div>
    </ChartCard>
  )
}

export default DeploymentReadinessGauge
