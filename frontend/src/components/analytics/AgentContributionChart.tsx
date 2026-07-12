import { Users } from 'lucide-react'
import { ChartCard, MiniBarList } from '../Charts'
import { buildRecommendationCategories } from '../../utils/analyticsCharts'
import type { MissionAnalysis } from '../../types/Analysis'

interface AgentContributionChartProps {
  analysis: MissionAnalysis | null
}

const COLORS = ['bg-primary-500', 'bg-info-500', 'bg-warning-500', 'bg-success-500']

/** How many output items each agent contributed to the final recommendation
 * set — a real, countable output size (not a weighted "importance" score;
 * see `KnowledgeContributionChart` for the evidence-citation-based view). */
function AgentContributionChart({ analysis }: AgentContributionChartProps) {
  const categories = buildRecommendationCategories(analysis)
  const total = categories?.reduce((sum, c) => sum + c.value, 0) ?? 0

  return (
    <ChartCard
      title="Agent Contribution"
      icon={Users}
      caption="Output items each agent contributed"
      available={Boolean(categories) && total > 0}
    >
      {categories && (
        <MiniBarList
          entries={categories.map((c, i) => ({
            label: c.label,
            value: c.value,
            percent: total > 0 ? (c.value / total) * 100 : 0,
            colorClassName: COLORS[i % COLORS.length],
          }))}
        />
      )}
    </ChartCard>
  )
}

export default AgentContributionChart
