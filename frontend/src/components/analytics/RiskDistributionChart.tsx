import { ShieldAlert } from 'lucide-react'
import { ChartCard, GroupedBarChart } from '../Charts'
import { buildRiskSeverityDistribution } from '../../utils/analyticsCharts'
import type { RiskAnalysis } from '../../types/Analysis'

interface RiskDistributionChartProps {
  risk: RiskAnalysis | null
}

/** How many critical risks fall into each severity bucket — a real
 * distribution over `critical_risks`, not the risk *categories* chart
 * (which groups by `category` instead of `severity`). */
function RiskDistributionChart({ risk }: RiskDistributionChartProps) {
  const distribution = buildRiskSeverityDistribution(risk)

  return (
    <ChartCard title="Risk Distribution" icon={ShieldAlert} caption="Critical risks grouped by severity" available={Boolean(distribution)}>
      {distribution && (
        <GroupedBarChart
          data={distribution.map((entry) => ({ severity: entry.label, count: entry.value }))}
          categoryKey="severity"
          series={[{ key: 'count', label: 'Risks', color: '#f59e0b' }]}
          horizontal
        />
      )}
    </ChartCard>
  )
}

export default RiskDistributionChart
