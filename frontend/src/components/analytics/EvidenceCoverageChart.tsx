import { Quote } from 'lucide-react'
import { ChartCard, DonutChart } from '../Charts'
import type { MissionAnalysis } from '../../types/Analysis'

interface EvidenceCoverageChartProps {
  analysis: MissionAnalysis | null
}

/** Of the four agents, how many grounded their output in retrieved
 * evidence (`evidence_used.length > 0`) versus not — a real yes/no split,
 * not a percentage that implies partial credit. */
function EvidenceCoverageChart({ analysis }: EvidenceCoverageChartProps) {
  const outputs = analysis
    ? [analysis.business_analysis, analysis.strategy_analysis, analysis.risk_analysis, analysis.executive_analysis].filter(
        (o): o is NonNullable<typeof o> => o !== null
      )
    : []

  const withEvidence = outputs.filter((o) => o.evidence_used.length > 0).length
  const withoutEvidence = outputs.length - withEvidence

  return (
    <ChartCard
      title="Evidence Coverage"
      icon={Quote}
      caption="Agents that grounded their output in retrieved evidence"
      available={outputs.length > 0}
    >
      <DonutChart
        data={[
          { name: 'With Evidence', value: withEvidence, color: '#10b981' },
          { name: 'Without Evidence', value: withoutEvidence, color: '#cbd5e1' },
        ].filter((entry) => entry.value > 0)}
        height={200}
      />
    </ChartCard>
  )
}

export default EvidenceCoverageChart
