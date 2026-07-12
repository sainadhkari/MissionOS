import { FileBarChart } from 'lucide-react'
import { ChartCard, MiniBarList } from '../Charts'
import { buildDatasetSizeSeries } from '../../utils/analyticsCharts'
import type { Dataset } from '../../types/Dataset'

interface FileSizeComparisonChartProps {
  datasets: Dataset[]
}

/** Absolute file size per dataset (top 8, largest first) — the same
 * underlying sizes as `StorageUsageChart`, read here as a direct
 * comparison instead of a share of the whole. */
function FileSizeComparisonChart({ datasets }: FileSizeComparisonChartProps) {
  const series = buildDatasetSizeSeries(datasets)
  const max = series ? Math.max(1, ...series.map((s) => s.value)) : 1

  return (
    <ChartCard title="File Size Comparison" icon={FileBarChart} caption="Largest datasets by file size" available={Boolean(series)}>
      {series && (
        <MiniBarList entries={series.map((s) => ({ label: s.label, value: s.value, percent: (s.value / max) * 100 }))} valueSuffix=" KB" />
      )}
    </ChartCard>
  )
}

export default FileSizeComparisonChart
