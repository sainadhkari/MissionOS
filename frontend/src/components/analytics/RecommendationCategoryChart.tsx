import { ListChecks } from 'lucide-react'
import { ChartCard, DonutChart } from '../Charts'
import { buildRecommendationCategories } from '../../utils/analyticsCharts'
import type { MissionAnalysis } from '../../types/Analysis'

interface RecommendationCategoryChartProps {
  analysis: MissionAnalysis | null
}

/** How the full recommendation set breaks down by the agent category it
 * came from (Business Next Steps, Strategic Initiatives, Risk Mitigations,
 * Executive Trade-offs) — real item counts per category. */
function RecommendationCategoryChart({ analysis }: RecommendationCategoryChartProps) {
  const categories = buildRecommendationCategories(analysis)
  const total = categories?.reduce((sum, c) => sum + c.value, 0) ?? 0

  return (
    <ChartCard title="Recommendation Categories" icon={ListChecks} caption="Breakdown of all recommendation items by source" available={total > 0}>
      {categories && <DonutChart data={categories.map((c) => ({ name: c.label, value: c.value }))} />}
    </ChartCard>
  )
}

export default RecommendationCategoryChart
