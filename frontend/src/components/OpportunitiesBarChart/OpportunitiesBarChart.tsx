import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  CHART_AXIS_TEXT_COLOR,
  CHART_AXIS_TEXT_COLOR_DARK,
  CHART_GRID_COLOR,
  CHART_GRID_COLOR_DARK,
  CHART_TOOLTIP_BG_DARK,
} from '../../utils/chartColors'
import { useTheme } from '../../contexts/ThemeContext'
import type { BusinessAnalysis } from '../../types/Analysis'

interface OpportunitiesBarChartProps {
  business: BusinessAnalysis
}

/** Compares how many items the Business Agent surfaced in each output
 * category — the closest honest "bar chart" reading of `key_opportunities`
 * without inventing a per-opportunity magnitude the API doesn't provide. */
function OpportunitiesBarChart({ business }: OpportunitiesBarChartProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const gridColor = isDark ? CHART_GRID_COLOR_DARK : CHART_GRID_COLOR
  const axisColor = isDark ? CHART_AXIS_TEXT_COLOR_DARK : CHART_AXIS_TEXT_COLOR

  const data = [
    { name: 'Opportunities', count: business.key_opportunities.length },
    { name: 'Metrics', count: business.important_metrics.length },
    { name: 'Next Steps', count: business.recommended_next_steps.length },
  ]

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: axisColor }}
          axisLine={{ stroke: gridColor }}
          tickLine={false}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: axisColor }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            borderColor: gridColor,
            fontSize: 12,
            backgroundColor: isDark ? CHART_TOOLTIP_BG_DARK : '#ffffff',
            color: isDark ? '#e2e8f0' : '#0f172a',
          }}
          cursor={{ fill: isDark ? '#1e293b' : '#f8fafc' }}
        />
        <Bar dataKey="count" name="Items" fill="#6366f1" radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default OpportunitiesBarChart
