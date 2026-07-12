import { AlertCircle } from 'lucide-react'
import { ChartCard, MiniBarList } from '../Charts'
import { buildMissingValuesSeries } from '../../utils/analyticsCharts'
import type { Dataset } from '../../types/Dataset'

interface MissingValuesChartProps {
  datasets: Dataset[]
}

/** Total missing cell count per profiled dataset — summed directly from
 * `DatasetProfile.missing_values`. */
function MissingValuesChart({ datasets }: MissingValuesChartProps) {
  const series = buildMissingValuesSeries(datasets)
  const max = series ? Math.max(1, ...series.map((s) => s.value)) : 1

  return (
    <ChartCard
      title="Missing Values"
      icon={AlertCircle}
      caption="Total missing cells per dataset"
      available={Boolean(series)}
      emptyReason="No missing values detected in any profiled dataset."
    >
      {series && (
        <MiniBarList
          entries={series.map((s) => ({ label: s.label, value: s.value, percent: (s.value / max) * 100, colorClassName: 'bg-warning-500' }))}
        />
      )}
    </ChartCard>
  )
}

export default MissingValuesChart
