import { Copy } from 'lucide-react'
import { ChartCard, MiniBarList } from '../Charts'
import { buildDuplicateDistribution } from '../../utils/analyticsCharts'
import type { Dataset } from '../../types/Dataset'

interface DuplicateDistributionChartProps {
  datasets: Dataset[]
}

/** Share of rows that are exact duplicates, per profiled dataset —
 * `duplicate_row_count / row_count`, both real profile fields. */
function DuplicateDistributionChart({ datasets }: DuplicateDistributionChartProps) {
  const series = buildDuplicateDistribution(datasets)

  return (
    <ChartCard
      title="Duplicate Distribution"
      icon={Copy}
      caption="Share of duplicate rows per dataset"
      available={Boolean(series)}
      emptyReason="No duplicate rows detected in any profiled dataset."
    >
      {series && (
        <MiniBarList
          entries={series.map((s) => ({ label: s.label, value: s.value, percent: s.value, caption: s.caption, colorClassName: 'bg-danger-500' }))}
          valueSuffix="%"
        />
      )}
    </ChartCard>
  )
}

export default DuplicateDistributionChart
