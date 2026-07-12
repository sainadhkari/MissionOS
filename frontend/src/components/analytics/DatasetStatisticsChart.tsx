import { Table2 } from 'lucide-react'
import { ChartCard } from '../Charts'
import { buildRowsVsColumnsSeries } from '../../utils/analyticsCharts'
import type { Dataset } from '../../types/Dataset'

interface DatasetStatisticsChartProps {
  datasets: Dataset[]
}

/** Rows vs. columns per dataset — the two most basic, always-real
 * dimensions a profile reports. Rendered as a compact stat table rather
 * than a shared-axis bar chart, since row counts (thousands) and column
 * counts (tens) sit on wildly different scales — a shared axis would make
 * the column bars invisible next to the row bars. */
function DatasetStatisticsChart({ datasets }: DatasetStatisticsChartProps) {
  const series = buildRowsVsColumnsSeries(datasets)

  return (
    <ChartCard title="Dataset Statistics" icon={Table2} caption="Rows and columns per dataset" available={Boolean(series)}>
      {series && (
        <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {series.map((entry) => (
            <div key={entry.label} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="truncate text-sm text-neutral-700 dark:text-neutral-300">{entry.label}</span>
              <span className="flex shrink-0 items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                <span>
                  <strong className="font-semibold text-neutral-900 dark:text-neutral-100">{entry.rows.toLocaleString()}</strong> rows
                </span>
                <span>
                  <strong className="font-semibold text-neutral-900 dark:text-neutral-100">{entry.columns}</strong> cols
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  )
}

export default DatasetStatisticsChart
