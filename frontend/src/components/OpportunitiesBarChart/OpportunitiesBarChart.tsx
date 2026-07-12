import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART_AXIS_TEXT_COLOR, CHART_GRID_COLOR } from '../../utils/chartColors'
import type { BusinessAnalysis } from '../../types/Analysis'

interface OpportunitiesBarChartProps {
  business: BusinessAnalysis
}

/** Compares how many items the Business Agent surfaced in each output
 * category — the closest honest "bar chart" reading of `key_opportunities`
 * without inventing a per-opportunity magnitude the API doesn't provide. */
function OpportunitiesBarChart({ business }: OpportunitiesBarChartProps) {
  const data = [
    { name: 'Opportunities', count: business.key_opportunities.length },
    { name: 'Metrics', count: business.important_metrics.length },
    { name: 'Next Steps', count: business.recommended_next_steps.length },
  ]

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: CHART_AXIS_TEXT_COLOR }}
          axisLine={{ stroke: CHART_GRID_COLOR }}
          tickLine={false}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: CHART_AXIS_TEXT_COLOR }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 8, borderColor: CHART_GRID_COLOR, fontSize: 12 }} cursor={{ fill: '#f8fafc' }} />
        <Bar dataKey="count" name="Items" fill="#6366f1" radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default OpportunitiesBarChart
