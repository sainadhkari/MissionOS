import { LineChart } from 'lucide-react'
import { ChartCard, TrendAreaChart } from '../Charts'
import type { MissionAnalysis } from '../../types/Analysis'

interface AIConfidenceTrendProps {
  analysis: MissionAnalysis | null
}

/** Confidence across the four agents in their fixed execution order
 * (Business → Strategy → Risk → Executive) — a real progression through
 * the pipeline. The backend persists only one analysis per mission, so
 * this is not a fabricated multi-run history; it's the only genuine
 * "trend" available for a single mission. */
function AIConfidenceTrend({ analysis }: AIConfidenceTrendProps) {
  const points = analysis
    ? [
        analysis.business_analysis && { label: 'Business', value: Math.round(analysis.business_analysis.confidence * 100) },
        analysis.strategy_analysis && { label: 'Strategy', value: Math.round(analysis.strategy_analysis.confidence * 100) },
        analysis.risk_analysis && { label: 'Risk', value: Math.round(analysis.risk_analysis.confidence * 100) },
        analysis.executive_analysis && { label: 'Executive', value: Math.round(analysis.executive_analysis.confidence * 100) },
      ].filter((p): p is { label: string; value: number } => Boolean(p))
    : []

  return (
    <ChartCard title="AI Confidence Trend" icon={LineChart} caption="Confidence across the agent execution sequence" available={points.length > 1}>
      <TrendAreaChart points={points} />
    </ChartCard>
  )
}

export default AIConfidenceTrend
