import Card from '../Card'
import Badge from '../Badge'
import AnalysisSection, { BulletList } from '../AnalysisSection'
import { severityBadgeVariant } from '../../utils/analysis'
import type { RiskAnalysis } from '../../types/Analysis'

interface RiskCardProps {
  analysis: RiskAnalysis
}

function RiskCard({ analysis }: RiskCardProps) {
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Risk</h2>
        <Badge variant={severityBadgeVariant(analysis.overall_risk_level)}>
          {analysis.overall_risk_level} risk
        </Badge>
      </div>
      <div className="flex flex-col gap-4">
        <AnalysisSection title="Critical Risks">
          {analysis.critical_risks.length === 0 ? (
            <p className="text-sm text-neutral-400 dark:text-neutral-500">None identified.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {analysis.critical_risks.map((risk, index) => (
                <li key={index} className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{risk.title}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="neutral">{risk.category}</Badge>
                      <Badge variant={severityBadgeVariant(risk.severity)}>{risk.severity}</Badge>
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">Probability: {risk.probability}</p>
                  <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">{risk.impact}</p>
                  <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                    <span className="font-medium text-neutral-600 dark:text-neutral-400">Mitigation: </span>
                    {risk.mitigation}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </AnalysisSection>
        <AnalysisSection title="Assumptions">
          <BulletList items={analysis.assumptions} />
        </AnalysisSection>
        <AnalysisSection title="Recommended Mitigations">
          <BulletList items={analysis.recommended_mitigations} />
        </AnalysisSection>
      </div>
    </Card>
  )
}

export default RiskCard
