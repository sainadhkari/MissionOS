import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { CHART_GRID_COLOR, CHART_GRID_COLOR_DARK, CHART_PALETTE, CHART_TOOLTIP_BG_DARK } from '../../utils/chartColors'
import { useTheme } from '../../contexts/ThemeContext'
import type { RiskItem } from '../../types/Analysis'

interface RiskCategoryChartProps {
  risks: RiskItem[]
}

function RiskCategoryChart({ risks }: RiskCategoryChartProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

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

export default RiskCategoryChart
