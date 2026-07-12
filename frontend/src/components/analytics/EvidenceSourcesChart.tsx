import { Database } from 'lucide-react'
import { ChartCard, MiniBarList } from '../Charts'
import { buildEvidenceSourceMentions } from '../../utils/analyticsCharts'
import type { MissionAnalysis } from '../../types/Analysis'

interface EvidenceSourcesChartProps {
  analysis: MissionAnalysis | null
}

/** How many times each retrieved source dataset is mentioned across every
 * agent's evidence citations — a real substring-match count over stored
 * text (see `buildEvidenceSourceMentions`), not a fabricated per-source
 * weighting. */
function EvidenceSourcesChart({ analysis }: EvidenceSourcesChartProps) {
  const mentions = buildEvidenceSourceMentions(analysis)
  const max = mentions ? Math.max(1, ...mentions.map((m) => m.value)) : 1

  return (
    <ChartCard title="Evidence Sources" icon={Database} caption="Retrieved dataset mentions across cited evidence" available={Boolean(mentions)}>
      {mentions && (
        <MiniBarList
          entries={mentions.map((m) => ({ label: m.label, value: m.value, percent: (m.value / max) * 100 }))}
          valueSuffix=" mentions"
        />
      )}
    </ChartCard>
  )
}

export default EvidenceSourcesChart
