import { HardDrive } from 'lucide-react'
import { ChartCard, DonutChart } from '../Charts'
import { buildDatasetSizeSeries } from '../../utils/analyticsCharts'
import type { Dataset } from '../../types/Dataset'

interface StorageUsageChartProps {
  datasets: Dataset[]
}

/** Share of total storage each dataset occupies (top 8 by size) — real
 * `file_size` bytes already returned per dataset. */
function StorageUsageChart({ datasets }: StorageUsageChartProps) {
  const series = buildDatasetSizeSeries(datasets)

  return (
    <ChartCard title="Storage Usage" icon={HardDrive} caption="Share of total storage by dataset (KB)" available={Boolean(series)}>
      {series && <DonutChart data={series.map((s) => ({ name: s.label, value: s.value }))} valueSuffix=" KB" />}
    </ChartCard>
  )
}

export default StorageUsageChart
