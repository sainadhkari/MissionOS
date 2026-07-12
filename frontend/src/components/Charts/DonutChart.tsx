import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useChartTheme } from '../../hooks/useChartTheme'

export interface DonutChartDatum {
  name: string
  value: number
  color?: string
}

interface DonutChartProps {
  data: DonutChartDatum[]
  height?: number
  valueSuffix?: string
  showLegend?: boolean
}

/** The generic donut used by every "share of total" chart in the analytics
 * suite (EvidenceCoverageChart, RecommendationCategoryChart,
 * DuplicateDistributionChart, SchemaCompositionChart, ...) — colors fall
 * back to the shared palette when a datum doesn't specify one. */
function DonutChart({ data, height = 240, valueSuffix = '', showLegend = true }: DonutChartProps) {
  const { isDark, palette, tooltipStyle } = useChartTheme()

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={height * 0.2}
          outerRadius={height * 0.32}
          paddingAngle={2}
          isAnimationActive={false}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={entry.color ?? palette[index % palette.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => [`${value}${valueSuffix}`, name]}
        />
        {showLegend && (
          <Legend wrapperStyle={{ fontSize: 12, color: isDark ? '#cbd5e1' : '#334155' }} />
        )}
      </PieChart>
    </ResponsiveContainer>
  )
}

export default DonutChart
