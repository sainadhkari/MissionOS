import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { CHART_GRID_COLOR, CHART_GRID_COLOR_DARK, CHART_TOOLTIP_BG_DARK } from '../../utils/chartColors'
import { columnCategoryLabel } from '../../utils/dataset'
import { useTheme } from '../../contexts/ThemeContext'
import type { Dataset, DatasetColumnCategory } from '../../types/Dataset'

// Matches columnCategoryBadgeVariant's mapping (numeric: info, categorical:
// neutral, date: primary) so this chart's colors agree with the badges
// used elsewhere for the same categories.
const CATEGORY_COLORS: Record<DatasetColumnCategory, string> = {
  numeric: '#0ea5e9',
  categorical: '#94a3b8',
  date: '#6366f1',
}

interface DatasetSummaryChartProps {
  datasets: Dataset[]
}

/** Aggregates column categories (numeric/categorical/date) across every
 * validated dataset attached to the mission, from profile data already
 * returned by `GET /missions/{id}/datasets` — no backend change needed. */
function DatasetSummaryChart({ datasets }: DatasetSummaryChartProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const counts: Record<DatasetColumnCategory, number> = { numeric: 0, categorical: 0, date: 0 }
  for (const dataset of datasets) {
    if (dataset.upload_status !== 'ready' || !dataset.profile) continue
    for (const column of dataset.profile.columns) {
      counts[column.category] += 1
    }
  }

  const data = (Object.keys(counts) as DatasetColumnCategory[])
    .filter((category) => counts[category] > 0)
    .map((category) => ({ category, name: columnCategoryLabel(category), value: counts[category] }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          isAnimationActive={false}
        >
          {data.map((entry) => (
            <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            borderColor: isDark ? CHART_GRID_COLOR_DARK : CHART_GRID_COLOR,
            fontSize: 12,
            backgroundColor: isDark ? CHART_TOOLTIP_BG_DARK : '#ffffff',
            color: isDark ? '#e2e8f0' : '#0f172a',
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: isDark ? '#cbd5e1' : '#334155' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export default DatasetSummaryChart
