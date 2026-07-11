import Card from '../Card'
import AnalysisSection, { BulletList } from '../AnalysisSection'
import type { BusinessAnalysis } from '../../types/Analysis'

interface BusinessAnalysisCardProps {
  analysis: BusinessAnalysis
}

function BusinessAnalysisCard({ analysis }: BusinessAnalysisCardProps) {
  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold text-neutral-900">Business Analysis</h2>
      <div className="flex flex-col gap-4">
        <AnalysisSection title="Business Problem">
          <p className="text-sm text-neutral-700">{analysis.business_problem}</p>
        </AnalysisSection>
        <AnalysisSection title="Key Opportunities">
          <BulletList items={analysis.key_opportunities} />
        </AnalysisSection>
        <AnalysisSection title="Important Metrics">
          <BulletList items={analysis.important_metrics} />
        </AnalysisSection>
        <AnalysisSection title="Recommended Next Steps">
          <BulletList items={analysis.recommended_next_steps} />
        </AnalysisSection>
      </div>
    </Card>
  )
}

export default BusinessAnalysisCard
