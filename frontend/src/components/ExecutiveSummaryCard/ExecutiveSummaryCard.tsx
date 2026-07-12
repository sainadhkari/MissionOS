import Card from '../Card'
import Badge from '../Badge'
import AnalysisSection, { BulletList } from '../AnalysisSection'
import { severityBadgeVariant } from '../../utils/analysis'
import type { BusinessAnalysis, ExecutiveAnalysis, RiskAnalysis, StrategyAnalysis } from '../../types/Analysis'

interface ExecutiveSummaryCardProps {
  business: BusinessAnalysis
  strategy: StrategyAnalysis
  risk: RiskAnalysis
  executive: ExecutiveAnalysis
}

function ExecutiveSummaryCard({ business, strategy, risk, executive }: ExecutiveSummaryCardProps) {
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Executive Summary</h2>
        <Badge variant="primary">{Math.round(executive.confidence * 100)}% confidence</Badge>
      </div>
      <div className="flex flex-col gap-4">
        <AnalysisSection title="Executive Summary">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{executive.executive_summary}</p>
        </AnalysisSection>
        <AnalysisSection title="Overall Assessment">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{executive.final_recommendation}</p>
        </AnalysisSection>
        <AnalysisSection title="Key Opportunities">
          <BulletList items={business.key_opportunities} />
        </AnalysisSection>
        <AnalysisSection title="Strategic Recommendations">
          <BulletList items={strategy.recommended_initiatives} />
        </AnalysisSection>
        <AnalysisSection title="Critical Risks">
          {risk.critical_risks.length === 0 ? (
            <p className="text-sm text-neutral-400 dark:text-neutral-500">None identified.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {risk.critical_risks.map((item, index) => (
                <Badge key={index} variant={severityBadgeVariant(item.severity)}>
                  {item.title}
                </Badge>
              ))}
            </div>
          )}
        </AnalysisSection>
        <AnalysisSection title="Business Trade-offs">
          <BulletList items={executive.trade_offs} />
        </AnalysisSection>
        <AnalysisSection title="Implementation Priorities">
          <Badge variant={severityBadgeVariant(strategy.priority)}>{strategy.priority}</Badge>
        </AnalysisSection>
        <AnalysisSection title="Expected Outcomes">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{strategy.business_impact}</p>
        </AnalysisSection>
      </div>
    </Card>
  )
}

export default ExecutiveSummaryCard
