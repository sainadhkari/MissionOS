import { Gauge as GaugeIcon } from 'lucide-react'
import { ChartCard, Gauge } from '../Charts'

interface DecisionStrengthGaugeProps {
  decisionStrengthPercent: number | null
}

/** Reads the same Decision Strength composite already computed for the AI
 * Collaboration Center's Consensus Dashboard (confidence + evidence
 * coverage + agent agreement), rendered here as a standalone gauge. */
function DecisionStrengthGauge({ decisionStrengthPercent }: DecisionStrengthGaugeProps) {
  return (
    <ChartCard
      title="Decision Strength"
      icon={GaugeIcon}
      caption="Composite of confidence, evidence coverage, and agreement"
      available={decisionStrengthPercent !== null}
    >
      <div className="flex justify-center">
        <Gauge value={decisionStrengthPercent} label="Decision Strength" />
      </div>
    </ChartCard>
  )
}

export default DecisionStrengthGauge
