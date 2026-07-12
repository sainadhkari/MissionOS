import { PieChart } from 'lucide-react'
import { ChartCard, DonutChart } from '../Charts'
import { buildKnowledgeContribution } from '../../utils/collaborationCenter'
import type { MissionAnalysis } from '../../types/Analysis'

interface KnowledgeContributionChartProps {
  analysis: MissionAnalysis | null
}

/** Each agent's share of the total evidence citations used across the
 * mission — reuses `buildKnowledgeContribution` (also used by the AI
 * Collaboration Center's bar-list view) so the two never disagree. */
function KnowledgeContributionChart({ analysis }: KnowledgeContributionChartProps) {
  const contributions = buildKnowledgeContribution(analysis)
  const hasData = contributions.some((c) => c.percent !== null)

  return (
    <ChartCard title="Knowledge Contribution" icon={PieChart} caption="Share of total evidence citations per agent" available={hasData}>
      <DonutChart
        data={contributions.filter((c) => c.percent !== null).map((c) => ({ name: `${c.agentName} Agent`, value: c.percent! }))}
        valueSuffix="%"
      />
    </ChartCard>
  )
}

export default KnowledgeContributionChart
