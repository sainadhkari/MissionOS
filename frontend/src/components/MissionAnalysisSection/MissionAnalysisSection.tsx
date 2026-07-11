import Card from '../Card'
import Loading from '../Loading'
import Banner from '../Banner'
import AnalysisStatusCard from '../AnalysisStatusCard'
import BusinessAnalysisCard from '../BusinessAnalysisCard'
import StrategyCard from '../StrategyCard'
import RiskCard from '../RiskCard'
import ExecutiveSummaryCard from '../ExecutiveSummaryCard'
import { useAnalysisPolling } from '../../hooks/useAnalysisPolling'
import type { AnalysisViewStatus } from '../../types/Analysis'

interface MissionAnalysisSectionProps {
  missionId: string
}

function MissionAnalysisSection({ missionId }: MissionAnalysisSectionProps) {
  const polling = useAnalysisPolling(missionId)

  if (polling.status === 'loading') {
    return (
      <Card className="mt-4">
        <Loading />
      </Card>
    )
  }

  if (polling.status === 'error') {
    return (
      <Card className="mt-4">
        <Banner variant="danger">{polling.message}</Banner>
      </Card>
    )
  }

  const analysis = polling.status === 'found' ? polling.analysis : null
  const viewStatus: AnalysisViewStatus = analysis ? analysis.status : 'not_started'

  return (
    <div className="mt-4 flex flex-col gap-4">
      <AnalysisStatusCard
        viewStatus={viewStatus}
        analysis={analysis}
        onStart={polling.start}
        isStarting={polling.isStarting}
        startError={polling.startError}
      />

      {analysis?.status === 'completed' &&
        analysis.business_analysis &&
        analysis.strategy_analysis &&
        analysis.risk_analysis &&
        analysis.executive_analysis && (
          <>
            <BusinessAnalysisCard analysis={analysis.business_analysis} />
            <StrategyCard analysis={analysis.strategy_analysis} />
            <RiskCard analysis={analysis.risk_analysis} />
            <ExecutiveSummaryCard
              business={analysis.business_analysis}
              strategy={analysis.strategy_analysis}
              risk={analysis.risk_analysis}
              executive={analysis.executive_analysis}
            />
          </>
        )}
    </div>
  )
}

export default MissionAnalysisSection
