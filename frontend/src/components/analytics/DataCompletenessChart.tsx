import { CheckCircle2 } from 'lucide-react'
import { ChartCard, MiniBarList } from '../Charts'
import { buildCompletenessSeries } from '../../utils/analyticsCharts'
import type { Dataset } from '../../types/Dataset'

interface DataCompletenessChartProps {
  datasets: Dataset[]
}

/** Share of non-missing cells per profiled dataset — `1 - missingCells /
 * totalCells`, both derived from real profile fields. */
function DataCompletenessChart({ datasets }: DataCompletenessChartProps) {
  const series = buildCompletenessSeries(datasets)

  return (
    <ChartCard title="Data Completeness" icon={CheckCircle2} caption="Share of non-missing cells per dataset" available={Boolean(series)}>
      {series && (
        <MiniBarList
          entries={series.map((s) => ({ label: s.label, value: s.value, percent: s.value, colorClassName: 'bg-success-500' }))}
          valueSuffix="%"
        />
      )}
    </ChartCard>
  )
}

export default DataCompletenessChart
