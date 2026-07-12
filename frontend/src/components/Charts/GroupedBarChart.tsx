import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartTheme } from '../../hooks/useChartTheme'

export interface BarSeries {
  key: string
  label: string
  color?: string
}

interface GroupedBarChartProps {
  data: Record<string, string | number>[]
  categoryKey: string
  series: BarSeries[]
  height?: number
  horizontal?: boolean
}

/** The generic bar chart behind every comparison chart in the analytics
 * suite (RowsVsColumnsChart, FileSizeComparisonChart, RiskDistributionChart,
 * MissingValuesChart, ...) — one or more numeric series per category, with
 * theme-aware grid/axis/tooltip styling pulled from `useChartTheme`. */
function GroupedBarChart({ data, categoryKey, series, height = 260, horizontal = false }: GroupedBarChartProps) {
  const { palette, gridColor, tickStyle, tooltipStyle, tooltipCursor, legendStyle } = useChartTheme()

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 8, right: 8, left: horizontal ? 24 : -16, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey={categoryKey}
              tick={tickStyle}
              axisLine={{ stroke: gridColor }}
              tickLine={false}
              width={110}
            />
          </>
        ) : (
          <>
            <XAxis dataKey={categoryKey} tick={tickStyle} axisLine={{ stroke: gridColor }} tickLine={false} />
            <YAxis allowDecimals={false} tick={tickStyle} axisLine={false} tickLine={false} />
          </>
        )}
        <Tooltip contentStyle={tooltipStyle} cursor={tooltipCursor} />
        {series.length > 1 && <Legend wrapperStyle={legendStyle} />}
        {series.map((s, index) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color ?? palette[index % palette.length]}
            radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export default GroupedBarChart
