import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { CHART_GRID_COLOR, CHART_PALETTE } from '../../utils/chartColors'
import type { RiskItem } from '../../types/Analysis'

interface RiskCategoryChartProps {
  risks: RiskItem[]
}

function RiskCategoryChart({ risks }: RiskCategoryChartProps) {
  const counts = new Map<string, number>()
  for (const risk of risks) {
    counts.set(risk.category, (counts.get(risk.category) ?? 0) + 1)
  }
  const data = Array.from(counts.entries()).map(([name, value]) => ({ name, value }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          labelLine={false}
          isAnimationActive={false}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: 8, borderColor: CHART_GRID_COLOR, fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export default RiskCategoryChart
