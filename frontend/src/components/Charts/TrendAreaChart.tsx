import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartTheme } from '../../hooks/useChartTheme'

export interface TrendPoint {
  label: string
  value: number
}

interface TrendAreaChartProps {
  points: TrendPoint[]
  height?: number
  valueSuffix?: string
  color?: string
}

/** A small point-to-point area/line chart. Backs `AIConfidenceTrend`, which
 * plots confidence across the four agents in their fixed execution order
 * (Business → Strategy → Risk → Executive) — a real progression through the
 * pipeline, not a fabricated multi-run history (the backend only persists
 * one analysis per mission, so no such history exists to chart). */
function TrendAreaChart({ points, height = 220, valueSuffix = '%', color = '#6366f1' }: TrendAreaChartProps) {
  const { gridColor, tickStyle, tooltipStyle, tooltipCursor } = useChartTheme()

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 8, right: 12, left: -16, bottom: 8 }}>
        <defs>
          <linearGradient id="trendAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis dataKey="label" tick={tickStyle} axisLine={{ stroke: gridColor }} tickLine={false} />
        <YAxis tick={tickStyle} axisLine={false} tickLine={false} domain={[0, 100]} />
        <Tooltip contentStyle={tooltipStyle} cursor={tooltipCursor} formatter={(value) => [`${value}${valueSuffix}`, 'Confidence']} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill="url(#trendAreaFill)"
          isAnimationActive={false}
          dot={{ r: 4, fill: color, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default TrendAreaChart
