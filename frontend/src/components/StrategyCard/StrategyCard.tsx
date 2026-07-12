import Card from '../Card'
import Badge from '../Badge'
import AnalysisSection, { BulletList } from '../AnalysisSection'
import { severityBadgeVariant } from '../../utils/analysis'
import type { StrategyAnalysis } from '../../types/Analysis'

interface StrategyCardProps {
  analysis: StrategyAnalysis
}

function StrategyCard({ analysis }: StrategyCardProps) {
  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Strategy</h2>
        <Badge variant={severityBadgeVariant(analysis.priority)}>{analysis.priority} priority</Badge>
      </div>
      <div className="flex flex-col gap-4">
        <AnalysisSection title="Strategic Objectives">
          <BulletList items={analysis.strategic_objectives} />
        </AnalysisSection>
        <AnalysisSection title="Recommended Initiatives">
          <BulletList items={analysis.recommended_initiatives} />
        </AnalysisSection>
        <AnalysisSection title="Roadmap">
          <BulletList items={analysis.implementation_roadmap} />
        </AnalysisSection>
        <AnalysisSection title="KPIs">
          <BulletList items={analysis.kpis} />
        </AnalysisSection>
        <AnalysisSection title="Business Impact">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{analysis.business_impact}</p>
        </AnalysisSection>
      </div>
    </Card>
  )
}

export default StrategyCard
