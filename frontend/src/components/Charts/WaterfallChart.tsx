import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useChartTheme } from '../../hooks/useChartTheme'

export interface WaterfallStep {
  label: string
  value: number
}

interface WaterfallChartProps {
  steps: WaterfallStep[]
  height?: number
  valueLabel?: string
}

/** A cumulative waterfall built from a stacked bar chart: an invisible
 * "base" segment (the running total before this step) plus a visible
 * "delta" segment (this step's own contribution) — the standard recharts
 * technique for waterfalls, since recharts has no native waterfall type.
 * Backs `BusinessImpactWaterfall`, which charts how many items each agent
 * stage contributed to the final recommendation set (a real, countable
 * quantity), not a fabricated dollar figure. */
function WaterfallChart({ steps, height = 260, valueLabel = 'Items' }: WaterfallChartProps) {
  const { gridColor, tickStyle, tooltipStyle, tooltipCursor } = useChartTheme()

  const data = steps.reduce<{ label: string; base: number; delta: number; total: number }[]>((acc, step) => {
    const base = acc.length > 0 ? acc[acc.length - 1]!.total : 0
    acc.push({ label: step.label, base, delta: step.value, total: base + step.value })
    return acc
  }, [])

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis dataKey="label" tick={tickStyle} axisLine={{ stroke: gridColor }} tickLine={false} />
        <YAxis allowDecimals={false} tick={tickStyle} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={tooltipCursor}
          formatter={(value, name) => (name === 'delta' ? [`+${value} ${valueLabel}`, 'Added'] : [`${value}`, 'Running total'])}
        />
        <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} name="Running total before this step" />
        <Bar dataKey="delta" stackId="waterfall" fill="#6366f1" radius={[4, 4, 0, 0]} isAnimationActive={false} name="delta" />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default WaterfallChart
