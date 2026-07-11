import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface TrendChartPoint {
  label: string
  value: number
}

const SAMPLE_DATA: TrendChartPoint[] = [
  { label: 'Period 1', value: 12 },
  { label: 'Period 2', value: 18 },
  { label: 'Period 3', value: 14 },
  { label: 'Period 4', value: 22 },
  { label: 'Period 5', value: 19 },
  { label: 'Period 6', value: 26 },
]

interface TrendChartProps {
  data?: TrendChartPoint[]
}

function TrendChart({ data = SAMPLE_DATA }: TrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="trendChartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={32} />
        <Tooltip />
        <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#trendChartFill)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default TrendChart
