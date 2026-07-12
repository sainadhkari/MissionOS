import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useChartTheme } from '../../hooks/useChartTheme'

export interface RadarDatum {
  axis: string
  value: number
}

interface RadarChartCardProps {
  data: RadarDatum[]
  height?: number
  color?: string
}

/** Backs `DatasetQualityRadar` — a multi-axis 0..100 radar (completeness,
 * duplicate-free rate, validation rate, ...) built once so any future
 * multi-dimension score can reuse it instead of a bespoke SVG radar. */
function RadarChartCard({ data, height = 260, color = '#6366f1' }: RadarChartCardProps) {
  const { gridColor, tickStyle, tooltipStyle } = useChartTheme()

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid stroke={gridColor} />
        <PolarAngleAxis dataKey="axis" tick={tickStyle} />
        <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.35} isAnimationActive={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}%`, 'Score']} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

export default RadarChartCard
