import type { ReactNode } from 'react'
import { ClipboardList } from 'lucide-react'
import { ChartCard } from '../Charts'
import Badge from '../Badge'
import { confidenceBadgeVariant, capitalize } from '../../utils/executiveDashboard'
import { severityBadgeVariant } from '../../utils/analysis'
import type { MissionAnalysis } from '../../types/Analysis'

interface ExecutiveScorecardProps {
  analysis: MissionAnalysis | null
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 py-2.5 last:border-0 dark:border-neutral-800/60">
      <span className="text-sm text-neutral-600 dark:text-neutral-400">{label}</span>
      <span>{value}</span>
    </div>
  )
}

/** A compact scorecard of every headline number an executive would ask
 * for in one glance — all read directly from the four agent outputs. */
function ExecutiveScorecard({ analysis }: ExecutiveScorecardProps) {
  const { business_analysis, strategy_analysis, risk_analysis, executive_analysis } = analysis ?? {}
  const available = Boolean(business_analysis || strategy_analysis || risk_analysis || executive_analysis)

  return (
    <ChartCard title="Executive Scorecard" icon={ClipboardList} caption="Headline numbers at a glance" available={available}>
      <div className="flex flex-col">
        <Row
          label="Business Confidence"
          value={business_analysis ? <Badge variant={confidenceBadgeVariant(business_analysis.confidence)}>{Math.round(business_analysis.confidence * 100)}%</Badge> : <span className="text-xs italic text-neutral-400">Not Available</span>}
        />
        <Row
          label="Strategy Confidence"
          value={strategy_analysis ? <Badge variant={confidenceBadgeVariant(strategy_analysis.confidence)}>{Math.round(strategy_analysis.confidence * 100)}%</Badge> : <span className="text-xs italic text-neutral-400">Not Available</span>}
        />
        <Row
          label="Risk Confidence"
          value={risk_analysis ? <Badge variant={confidenceBadgeVariant(risk_analysis.confidence)}>{Math.round(risk_analysis.confidence * 100)}%</Badge> : <span className="text-xs italic text-neutral-400">Not Available</span>}
        />
        <Row
          label="Executive Confidence"
          value={executive_analysis ? <Badge variant={confidenceBadgeVariant(executive_analysis.confidence)}>{Math.round(executive_analysis.confidence * 100)}%</Badge> : <span className="text-xs italic text-neutral-400">Not Available</span>}
        />
        <Row
          label="Priority"
          value={strategy_analysis ? <Badge variant={severityBadgeVariant(strategy_analysis.priority)}>{capitalize(strategy_analysis.priority)}</Badge> : <span className="text-xs italic text-neutral-400">Not Available</span>}
        />
        <Row
          label="Overall Risk Level"
          value={risk_analysis ? <Badge variant={severityBadgeVariant(risk_analysis.overall_risk_level)}>{capitalize(risk_analysis.overall_risk_level)}</Badge> : <span className="text-xs italic text-neutral-400">Not Available</span>}
        />
        <Row label="Critical Risks" value={risk_analysis ? <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{risk_analysis.critical_risks.length}</span> : <span className="text-xs italic text-neutral-400">Not Available</span>} />
      </div>
    </ChartCard>
  )
}

export default ExecutiveScorecard
