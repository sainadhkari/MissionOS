import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, FlaskConical, Loader2, Network } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Card from '../components/Card'
import Loading from '../components/Loading'
import Banner from '../components/Banner'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import { buttonClasses } from '../components/Button'
import {
  MissionOverviewSection,
  LivePipelineSection,
  AgentCollaborationBoard,
  ConsensusDashboard,
  KnowledgeContributionSection,
  EvidenceNetworkSection,
  ExecutionTimelineSection,
  AgentConversationSection,
  FinalDecisionCard,
} from '../components/CollaborationCenter'
import { AgentContributionChart, ReasoningCoverageChart } from '../components/analytics'
import { useAnalysisPolling } from '../hooks/useAnalysisPolling'
import { useMissionDatasets } from '../hooks/useMissionDatasets'
import { missionService } from '../services/mission'
import { getErrorMessage } from '../utils/http'
import { ROUTES, missionDetailsPath, scenarioSimulatorPath } from '../constants/routes'
import { analysisStatusBadgeVariant, analysisStatusLabel } from '../utils/analysis'
import {
  buildAgentBoardCards,
  buildAgentConversation,
  buildConsensusMetrics,
  buildExecutionTimeline,
  buildKnowledgeContribution,
  buildPipelineStages,
} from '../utils/collaborationCenter'
import type { Mission } from '../types/Mission'
import type { AnalysisViewStatus } from '../types/Analysis'

type MissionLoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; mission: Mission }

function AICollaborationCenter() {
  const { missionId } = useParams<{ missionId: string }>()
  const [missionState, setMissionState] = useState<MissionLoadState>({ status: 'loading' })
  const analysisPolling = useAnalysisPolling(missionId)
  const datasets = useMissionDatasets(missionId)

  useEffect(() => {
    if (!missionId) return
    missionService
      .get(missionId)
      .then((mission) => setMissionState({ status: 'success', mission }))
      .catch((err) => setMissionState({ status: 'error', message: getErrorMessage(err, 'Mission not found.') }))
  }, [missionId])

  if (missionState.status === 'loading' || analysisPolling.status === 'loading') {
    return (
      <div>
        <PageHeader title="AI Collaboration Center" />
        <Loading />
      </div>
    )
  }

  if (missionState.status === 'error') {
    return (
      <div>
        <PageHeader title="AI Collaboration Center" />
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title={missionState.message}
            action={
              <Link to={ROUTES.missionHistory} className={buttonClasses('outline', 'sm')}>
                Back to Mission History
              </Link>
            }
          />
        </Card>
      </div>
    )
  }

  if (analysisPolling.status === 'error') {
    return (
      <div>
        <PageHeader title="AI Collaboration Center" />
        <Card>
          <Banner variant="danger">{analysisPolling.message}</Banner>
        </Card>
      </div>
    )
  }

  const { mission } = missionState
  const analysis = analysisPolling.status === 'found' ? analysisPolling.analysis : null
  const viewStatus: AnalysisViewStatus = analysis ? analysis.status : 'not_started'
  const isLive = viewStatus === 'pending' || viewStatus === 'running'

  const activeDatasets = datasets.status === 'success' ? datasets.data : []
  const pipelineStages = buildPipelineStages(activeDatasets, analysis)
  const agentCards = buildAgentBoardCards(analysis)
  const consensusMetrics = buildConsensusMetrics(analysis, activeDatasets)
  const contributions = buildKnowledgeContribution(analysis)
  const timelineEntries = buildExecutionTimeline(mission, activeDatasets, analysis)
  const conversationEntries = buildAgentConversation(analysis)

  return (
    <div>
      <PageHeader
        title="AI Collaboration Center"
        subtitle="Watch the Business, Strategy, Risk, and Executive agents collaborate on this mission's decision."
        actions={
          <>
            <Link to={missionDetailsPath(mission.id)} className={buttonClasses('outline', 'sm')}>
              Back to Mission
            </Link>
            <Link to={scenarioSimulatorPath(mission.id)} className={buttonClasses('outline', 'sm')}>
              <FlaskConical className="h-4 w-4" aria-hidden="true" />
              Scenario Simulator
            </Link>
          </>
        }
      />

      <div
        className="sticky z-20 -mx-4 mb-4 flex items-center justify-between gap-3 border-y border-neutral-200 bg-white/85 px-4 py-2.5 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/85 sm:-mx-6 sm:px-6"
        style={{ top: 65 }}
      >
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
          <Network className="h-4 w-4 shrink-0 text-primary-500" aria-hidden="true" />
          <span className="truncate">{mission.title}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {isLive && <Loader2 className="h-3.5 w-3.5 animate-spin text-warning-500" aria-hidden="true" />}
          <Badge variant={analysisStatusBadgeVariant(viewStatus)}>{analysisStatusLabel(viewStatus)}</Badge>
        </span>
      </div>

      <div className="flex flex-col gap-4">
        <MissionOverviewSection
          mission={mission}
          analysis={analysis}
          datasets={activeDatasets}
          overallConfidencePercent={consensusMetrics.overallConfidence}
        />

        <LivePipelineSection stages={pipelineStages} />

        <AgentCollaborationBoard cards={agentCards} />

        <ConsensusDashboard metrics={consensusMetrics} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AgentContributionChart analysis={analysis} />
          <ReasoningCoverageChart analysis={analysis} />
        </div>

        <KnowledgeContributionSection contributions={contributions} />

        <EvidenceNetworkSection analysis={analysis} datasets={activeDatasets} />

        <ExecutionTimelineSection entries={timelineEntries} />

        <AgentConversationSection entries={conversationEntries} />

        <FinalDecisionCard analysis={analysis} decisionStrengthPercent={consensusMetrics.decisionStrengthPercent} />
      </div>
    </div>
  )
}

export default AICollaborationCenter
