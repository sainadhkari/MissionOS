import { BookOpen } from 'lucide-react'
import { ChartCard, DonutChart } from '../Charts'
import { buildExplainabilityCards } from '../../utils/explainability'
import type { MissionAnalysis } from '../../types/Analysis'

interface ReasoningCoverageChartProps {
  analysis: MissionAnalysis | null
}

/** Of every recommendation the four agents produced, how many come with an
 * explained rationale (a non-empty `reasoning` field, as already surfaced
 * on the Explainability Center's cards) versus a bare recommendation with
 * no traceable "why". Reuses `buildExplainabilityCards` so this and the
 * Explainability Center never disagree on what counts as "reasoned". */
function ReasoningCoverageChart({ analysis }: ReasoningCoverageChartProps) {
  const cards = analysis ? buildExplainabilityCards(analysis) : []
  const withReasoning = cards.filter((card) => card.reasoning !== null).length
  const withoutReasoning = cards.length - withReasoning

  return (
    <ChartCard
      title="Reasoning Coverage"
      icon={BookOpen}
      caption="Recommendations backed by an explained rationale"
      available={cards.length > 0}
    >
      <DonutChart
        data={[
          { name: 'With Reasoning', value: withReasoning, color: '#10b981' },
          { name: 'Without Reasoning', value: withoutReasoning, color: '#cbd5e1' },
        ].filter((entry) => entry.value > 0)}
        height={200}
      />
    </ChartCard>
  )
}

export default ReasoningCoverageChart
